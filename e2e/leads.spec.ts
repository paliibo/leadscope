import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

test.describe('leads', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto('/leads')
  })

  test('lists leads and opens the detail drawer', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 20_000 })

    const name = await firstRow.locator('td').first().innerText()
    await firstRow.click()

    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText(name.split('\n')[0]!)
    await expect(drawer.getByText('Fit score')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('filters by stage', async ({ page }) => {
    await page.getByRole('button', { name: 'Won', exact: true }).click()

    // The table keeps the previous page on screen while the next one loads, so
    // poll rather than asserting against whatever happens to be rendered first.
    await expect
      .poll(
        async () => [
          ...new Set(
            await page.locator('tbody [data-stage]').evaluateAll((nodes) =>
              nodes.map((node) => node.getAttribute('data-stage')),
            ),
          ),
        ],
        { timeout: 20_000 },
      )
      .toEqual(['won'])
  })

  test('searches by name', async ({ page }) => {
    const firstName = (await page.locator('tbody tr td').first().innerText())
      .split('\n')[0]!
      .split(' ')[0]!

    await page.getByLabel('Search leads').fill(firstName)
    await expect(page.locator('tbody tr').first()).toContainText(firstName, {
      timeout: 20_000,
    })
  })

  test('sorts by value, descending first', async ({ page }) => {
    await page.getByRole('button', { name: 'Value' }).click()

    await expect
      .poll(
        async () => {
          const values = (
            await page.locator('tbody tr td:nth-child(5)').allInnerTexts()
          ).map((text) => Number(text.replace(/[^0-9.]/g, '')))
          return values.every(
            (value, index) => index === 0 || values[index - 1]! >= value,
          )
        },
        { timeout: 20_000 },
      )
      .toBe(true)
  })

  test('exports a CSV that matches the filters', async ({ page }) => {
    // Fetched from inside the page rather than through page.request: the session
    // cookie is marked Secure in a production build, and Playwright's Node-side
    // request context drops Secure cookies over plain http even for localhost,
    // which the browser itself does not.
    const result = await page.evaluate(async () => {
      const response = await fetch('/api/leads/export?stage=won')
      return {
        status: response.status,
        contentType: response.headers.get('content-type'),
        body: await response.text(),
      }
    })

    expect(result.status).toBe(200)
    expect(result.contentType).toContain('text/csv')

    const rows = result.body.trim().split('\r\n')
    expect(rows[0]).toBe(
      'id,name,email,title,account,owner,stage,source,value_usd,score,created_at,closed_at',
    )
    expect(rows.length).toBeGreaterThan(1)
    for (const row of rows.slice(1)) {
      expect(row.split(',')[6]).toBe('won')
    }
  })
})
