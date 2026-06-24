import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation']

test.describe('pipeline board', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto('/pipeline')
  })

  test('renders every open stage as a column', async ({ page }) => {
    for (const stage of STAGES) {
      await expect(page.getByRole('region', { name: stage })).toBeVisible({
        timeout: 20_000,
      })
    }
  })

  test('moves a deal to the next stage and persists it', async ({ page }) => {
    const source = page.getByRole('region', { name: 'New' })
    const target = page.getByRole('region', { name: 'Contacted' })

    const card = source.getByRole('listitem').first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    const name = (await card.innerText()).split('\n')[0]!

    // dnd-kit's pointer sensor needs movement past its activation distance, so
    // the drag is driven as discrete mouse steps rather than dragTo().
    const from = await card.boundingBox()
    const to = await target.boundingBox()
    expect(from && to).toBeTruthy()

    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
    await page.mouse.down()
    await page.mouse.move(to!.x + to!.width / 2, to!.y + 120, { steps: 12 })
    await page.mouse.up()

    await expect(page.getByText('Moved to Contacted')).toBeVisible({ timeout: 10_000 })

    // The move must survive a reload, not just the optimistic update.
    await page.reload()
    await expect(
      page.getByRole('region', { name: 'Contacted' }).getByText(name, { exact: false }),
    ).toBeVisible({ timeout: 20_000 })
  })
})
