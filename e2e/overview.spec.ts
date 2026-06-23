import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

test.describe('overview', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the headline numbers', async ({ page }) => {
    for (const label of ['Closed won', 'Open pipeline', 'New leads', 'Win rate']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    // A money figure, not a placeholder dash.
    await expect(page.getByText(/^\$[\d.,]+[KM]?$/).first()).toBeVisible()
  })

  test('connects to the live event stream', async ({ page }) => {
    await expect(page.getByText('Live').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByLabel('Live pipeline activity')).toBeVisible({
      timeout: 20_000,
    })
  })

  test('changing the range refetches', async ({ page }) => {
    const request = page.waitForRequest((req) => req.url().includes('days=90'))
    await page.getByRole('radio', { name: '90d' }).click()
    await request
    await expect(page.getByRole('radio', { name: '90d' })).toBeChecked()
  })

  test('names the worst step in the funnel', async ({ page }) => {
    await expect(page.getByText(/biggest drop-off is into/i)).toBeVisible({
      timeout: 20_000,
    })
  })
})
