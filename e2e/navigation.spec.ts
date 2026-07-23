import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

test.describe('navigation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('reaches every section from the sidebar', async ({ page }) => {
    for (const [label, path] of [
      ['Pipeline', '/pipeline'],
      ['Leads', '/leads'],
      ['Leaderboard', '/leaderboard'],
      ['Analytics', '/analytics'],
      ['Overview', '/'],
    ] as const) {
      // exact: true — otherwise "Leads" also matches the "Leadscope" wordmark.
      await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: label, exact: true })
        .click()
      await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : path}`))
    }
  })

  test('supports g-prefixed keyboard shortcuts', async ({ page }) => {
    await page.keyboard.press('g')
    await page.keyboard.press('b')
    await expect(page).toHaveURL(/\/leaderboard/)
  })

  test('opens the command palette from the toolbar and jumps to a page', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Search/ }).click()

    const palette = page.getByPlaceholder('Search leads, jump to a page…')
    await expect(palette).toBeVisible()

    await palette.fill('Analytics')
    await page
      .getByRole('option', { name: /Analytics/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/analytics/)
  })

  test('opens the command palette with Ctrl-K', async ({ page }) => {
    const palette = page.getByPlaceholder('Search leads, jump to a page…')

    // A keypress is a one-shot: if it lands before the document listener is
    // attached it is gone, and retrying the assertion alone would never recover.
    // Retry the press itself instead.
    //
    // Control rather than ControlOrMeta because Chromium on macOS claims Cmd-K
    // for the omnibox; the handler accepts either modifier.
    await expect(async () => {
      await page.keyboard.press('Control+k')
      await expect(palette).toBeVisible({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })

    await page.keyboard.press('Escape')
    await expect(palette).toBeHidden()
  })

  test('shows a not-found page for an unknown route', async ({ page }) => {
    await page.goto('/does-not-exist')
    await expect(page.getByText('Page not found')).toBeVisible()
  })
})
