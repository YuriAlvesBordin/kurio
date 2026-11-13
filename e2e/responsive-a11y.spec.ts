import { expect, test } from '@playwright/test'
import { ANA, addToCart, login, open } from './helpers'

const SIZES = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]

test.describe('responsive layout and accessibility', () => {
  for (const size of SIZES) {
    test(`no horizontal overflow at ${size.width}px on public and private pages`, async ({ page }) => {
      await page.setViewportSize(size)
      await open(page)
      await login(page, ANA)
      await addToCart(page, 'nft-001')
      for (const path of ['/', '/nft/nft-001', '/carrinho', '/pagamento', '/perfil', '/perfil/carteiras']) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${path} at ${size.width}`).toBeLessThanOrEqual(0)
      }
    })
  }

  test('skip link and main landmark exist and keyboard focus is visible', async ({ page }) => {
    await open(page)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused()
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('images have alternative text and form controls have labels', async ({ page }) => {
    await open(page, '/nft/nft-001')
    const missing = await page.evaluate(() => Array.from(document.images).filter((image) => !image.hasAttribute('alt')).length)
    expect(missing).toBe(0)
    await open(page, '/?auth=login')
    const unlabeled = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input')).filter((input) => !input.labels?.length && !input.getAttribute('aria-label') && input.type !== 'hidden').length,
    )
    expect(unlabeled).toBe(0)
  })

  test('shimmer is disabled when the user prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?scenario=slow')
    const animation = await page.getByLabel('Carregando NFTs').locator('.skeleton').first().evaluate((element) => getComputedStyle(element).animationName)
    expect(animation).toBe('none')
  })

  test('login modal traps focus and closes with Escape', async ({ page }) => {
    await open(page, '/?auth=login')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})
