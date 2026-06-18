import { expect, type Page } from '@playwright/test'

export const DEMO = {
  email: 'demo@leadscope.app',
  password: 'demo1234',
}

/** Sign in through the real form so the session cookie is set the way it is in life. */
export async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(DEMO.email)
  await page.getByLabel('Password').fill(DEMO.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // <main>, not the sidebar: the sidebar is off screen below `lg`, so asserting
  // on it would make this helper silently unusable in the mobile project.
  await expect(page.getByRole('main')).toBeVisible()
}
