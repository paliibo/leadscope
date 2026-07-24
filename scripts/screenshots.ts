/**
 * Captures the screenshots used in the README.
 *
 *   pnpm build && pnpm start &
 *   pnpm screenshots
 *
 * Regenerating them is a command rather than a manual chore, so the images in
 * the README can't drift away from what the app actually looks like.
 */
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { chromium, type Page } from '@playwright/test'

const BASE_URL = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:3000'
const OUT_DIR = join(process.cwd(), 'docs', 'screenshots')

const SHOTS = [
  { path: '/', name: 'overview', settle: 2500, waitForFeed: true },
  { path: '/pipeline', name: 'pipeline', settle: 2000, waitForFeed: false },
  { path: '/leads', name: 'leads', settle: 2000, waitForFeed: false },
  { path: '/leaderboard', name: 'leaderboard', settle: 2000, waitForFeed: false },
  { path: '/analytics', name: 'analytics', settle: 2500, waitForFeed: false },
] as const

/**
 * The activity feed starts as skeletons and fills as events arrive over SSE.
 * Screenshotting before it populates produces a hero image whose headline
 * feature looks like a loading state.
 */
async function waitForLiveFeed(page: Page, minimumEvents = 6) {
  await page
    .locator('[aria-label="Live pipeline activity"] p')
    .nth(minimumEvents - 1)
    .waitFor({ timeout: 60_000 })
}

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.getByLabel('Email').fill('demo@leadscope.app')
  await page.getByLabel('Password').fill('demo1234')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('main').waitFor()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()

  for (const theme of ['dark', 'light'] as const) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      colorScheme: theme,
      // next-themes reads its choice from localStorage before first paint.
      storageState: {
        cookies: [],
        origins: [
          {
            origin: BASE_URL,
            localStorage: [{ name: 'theme', value: theme }],
          },
        ],
      },
    })

    const page = await context.newPage()
    await signIn(page)

    for (const shot of SHOTS) {
      await page.goto(`${BASE_URL}${shot.path}`)
      await page.getByRole('main').waitFor()
      if (shot.waitForFeed) await waitForLiveFeed(page)
      // Charts animate in; give them a moment to settle.
      await page.waitForTimeout(shot.settle)

      const file = join(OUT_DIR, `${shot.name}-${theme}.png`)
      await page.screenshot({ path: file })
      console.log(`  ${shot.name}-${theme}.png`)
    }

    // One phone-width capture per theme for the responsive section.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/`)
    await page.getByRole('main').waitFor()
    await page.waitForTimeout(2500)
    await page.screenshot({ path: join(OUT_DIR, `mobile-${theme}.png`) })
    console.log(`  mobile-${theme}.png`)

    await context.close()
  }

  await browser.close()
  console.log(`\nWrote screenshots to ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
