import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

/**
 * Runs only under the mobile project. The desktop specs drive a sidebar that is
 * not on screen below `lg`, so they are not just redundant here — they would
 * fail for the wrong reason.
 */
test.describe('mobile', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('navigates through the slide-out menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Open navigation' }).click()

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Leaderboard', exact: true })
      .click()

    await expect(page).toHaveURL(/\/leaderboard/)
    // The menu closes itself on navigation rather than covering the page.
    await expect(page.getByRole('button', { name: 'Close navigation' })).toBeHidden()
  })

  test('no page scrolls sideways at 375px', async ({ page }) => {
    for (const path of ['/', '/leads', '/leaderboard', '/analytics']) {
      await page.goto(path)
      await expect(page.getByRole('main')).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1)
    }
  })

  test('keeps deal value on screen in the lead table', async ({ page }) => {
    await page.goto('/leads')

    const valueCell = page.locator('tbody tr td:nth-child(5)').first()
    await expect(valueCell).toBeVisible({ timeout: 20_000 })

    const box = await valueCell.boundingBox()
    const width = page.viewportSize()?.width ?? 0
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
  })
})
