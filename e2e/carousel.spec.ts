import { expect, test, type Page } from '@playwright/test'
import { isMobile, open } from './helpers'

/**
 * Waits until the hero has mounted its other slides, which happens a moment after the first paint.
 * @param page Playwright page
 */
async function slidesReady(page: Page) {
  await expect(page.getByRole('group', { name: '3 de 3', includeHidden: true })).toBeAttached({ timeout: 10_000 })
}

test.describe('hero carousel', () => {
  test('dots switch between the three slides and mark the active one', async ({ page }) => {
    await open(page)
    await slidesReady(page)
    const dots = page.getByRole('group', { name: 'Destaques' }).filter({ visible: true }).getByRole('button')
    await expect(dots).toHaveCount(3)
    await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true')
    await dots.nth(1).click()
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')
    await expect(page.getByRole('heading', { name: /NOVOS CRIADORES/ })).toBeVisible()
    await dots.nth(2).click()
    await expect(page.getByRole('heading', { name: /EDIÇÕES/ })).toBeVisible()
    await dots.nth(0).click()
    await expect(page.getByRole('heading', { name: /SEJA DONO/ })).toBeVisible()
  })

  test('advances on its own with a controlled clock and pauses while hovered', async ({ page }) => {
    test.skip(isMobile(page), 'hover is a desktop interaction')
    await page.clock.install()
    await open(page)
    await slidesReady(page).catch(() => undefined)
    await page.clock.fastForward(3_000)
    await slidesReady(page)
    await page.clock.fastForward(6_500)
    await expect(page.getByRole('heading', { name: /NOVOS CRIADORES/ })).toBeVisible()
    await page.getByRole('region', { name: 'Destaques da Kurio' }).hover()
    await page.clock.fastForward(20_000)
    await expect(page.getByRole('heading', { name: /NOVOS CRIADORES/ })).toBeVisible()
  })

  test('does not rotate when the user prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
    await open(page)
    await page.clock.fastForward(3_000)
    await slidesReady(page)
    await page.clock.fastForward(30_000)
    await expect(page.getByRole('heading', { name: /SEJA DONO/ })).toBeVisible()
  })

  test('the hidden slides are not reachable by keyboard or screen readers', async ({ page }) => {
    await open(page)
    await slidesReady(page)
    await expect(page.getByRole('heading', { name: /NOVOS CRIADORES/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /EDIÇÕES/ })).toHaveCount(0)
  })
})

test.describe('related products carousel', () => {
  test('dots move one page of cards and keep the active page in sync', async ({ page }) => {
    test.skip(isMobile(page), 'page dots are part of the desktop layout')
    await open(page, '/nft/nft-001')
    const section = page.getByRole('region', { name: 'Mais desta coleção' })
    await section.scrollIntoViewIfNeeded()
    const dots = section.getByRole('group', { name: 'Páginas de sugestões' }).getByRole('button')
    await expect(dots).toHaveCount(3)
    await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true')
    const cards = section.getByRole('link')
    await expect(cards).toHaveCount(15)
    await expect(cards.nth(5)).not.toBeInViewport({ ratio: 0.9 })
    await dots.nth(1).click()
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')
    await expect(cards.nth(5)).toBeInViewport({ ratio: 0.9 })
    await expect(cards.nth(0)).not.toBeInViewport({ ratio: 0.5 })
    await dots.nth(0).click()
    await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true')
    await expect(cards.nth(0)).toBeInViewport({ ratio: 0.9 })
  })

  test('the cart suggestions are a carousel too', async ({ page }) => {
    test.skip(isMobile(page), 'page dots are part of the desktop layout')
    await open(page, '/carrinho')
    const section = page.getByRole('region', { name: 'Colecionadores também viram' })
    await section.scrollIntoViewIfNeeded()
    await expect(section.getByRole('group', { name: 'Páginas de sugestões' }).getByRole('button')).toHaveCount(3)
  })
})
