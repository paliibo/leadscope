import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

test.describe('authentication', () => {
  test('sends an anonymous visitor to the login screen', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('remembers where the visitor was heading', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page).toHaveURL(/next=%2Fpipeline/)

    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/pipeline$/)
  })

  test('rejects a wrong password without saying which field was wrong', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Scoped to the form: Next renders its own role="alert" route announcer.
    await expect(page.locator('form').getByRole('alert')).toContainText(
      /email or password is incorrect/i,
    )
    await expect(page).toHaveURL(/\/login/)
  })

  test('signs in and back out', async ({ page }) => {
    await signIn(page)
    // The sidebar identifies the signed-in rep by name, not by email.
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByText('Alex Rivera'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('refuses API calls without a session', async ({ request }) => {
    const response = await request.get('/api/leads')
    expect(response.status()).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'unauthorized' } })
  })
})
