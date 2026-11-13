import { expect, test } from '@playwright/test'
import { isMobile, open } from './helpers'

test.describe('NFT detail', () => {
  test('shows edition, price and rating and lets the user pick an edition', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 })).toBeVisible()
    await expect(page.getByTestId('detail-price').filter({ visible: true })).toHaveText('1.19 ETH')
    await page.getByRole('radio', { name: /^1\/10/ }).click()
    await expect(page.getByRole('radio', { name: /^1\/10/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('status').filter({ hasText: 'disponíveis' })).toContainText('10')
  })

  test('quantity stays within the available stock', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await page.getByRole('radio', { name: /^1\/1,/ }).click()
    const plus = page.getByRole('button', { name: /Aumentar quantidade/ }).filter({ visible: true })
    await expect(plus).toBeDisabled()
    await page.getByRole('radio', { name: /^1\/10/ }).click()
    for (let index = 0; index < 12; index += 1) {
      if (await plus.isEnabled()) await plus.click()
    }
    await expect(page.getByTestId('quantity').filter({ visible: true })).toHaveText('10')
  })

  test('zoom opens and closes with the keyboard', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await page.getByRole('button', { name: 'Ampliar imagem' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('gallery thumbnails switch the main image on desktop', async ({ page }) => {
    test.skip(isMobile(page), 'thumbnails are desktop only')
    await open(page, '/nft/nft-001')
    await page.getByRole('button', { name: 'Ver imagem 3' }).click()
    await expect(page.getByRole('button', { name: 'Ver imagem 3' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('unknown NFT shows a not found state', async ({ page }) => {
    await open(page, '/nft/nft-999')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  })

  test('buying adds the selection to the cart and opens it', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await page.getByRole('button', { name: /^(Comprar|Comprar NFT)$/ }).filter({ visible: true }).click()
    await page.waitForURL('**/carrinho')
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
  })
})
