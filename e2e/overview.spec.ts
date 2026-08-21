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
    const ninetyDays = page.getByRole('radio', { name: '90d' })

    // Retry the click, not just the assertion: a click that lands before
    // hydration does nothing and is not replayed.
    await expect(async () => {
      await ninetyDays.click()
      await expect(ninetyDays).toBeChecked({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })

    // The cards re-request against the new window and say so.
    await expect(page.getByText(/last 90 days/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('names the worst step in the funnel', async ({ page }) => {
    await expect(page.getByText(/biggest drop-off is into/i)).toBeVisible({
      timeout: 20_000,
    })
  })
})
