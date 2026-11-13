import { expect, test } from '@playwright/test'
import { ANA, addToCart, login, open } from './helpers'

test.describe('visual regression', () => {
  test('Início', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('Detalhe do NFT', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await expect(page.getByTestId('detail-price').filter({ visible: true })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('Carrinho', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001', 2)
    await addToCart(page, 'nft-005', 6)
    await addToCart(page, 'nft-006', 9)
    await expect(page.getByTestId('total')).toHaveText('26.846 ETH')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('Pagamento', async ({ page }) => {
    await open(page)
    await login(page, ANA)
    await addToCart(page, 'nft-001', 2)
    await page.getByRole('button', { name: /finalizar/ }).click()
    await page.waitForURL('**/pagamento')
    await expect(page.getByTestId('checkout-row')).toBeVisible()
    await expect(page.getByLabel('Nome de exibição *')).not.toHaveValue('')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true, mask: [page.getByLabel('Código de indicação *')] })
  })
})
