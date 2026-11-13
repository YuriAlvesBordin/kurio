import { expect, test } from '@playwright/test'
import { addToCart, open } from './helpers'

test.describe('cart', () => {
  test('quantities update totals with exact decimal math', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001', 2)
    await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
    await expect(page.getByTestId('fee')).toHaveText('0.016 ETH')
    await expect(page.getByTestId('total')).toHaveText('2.396 ETH')
  })

  test('three items match the design numbers', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001', 2)
    await addToCart(page, 'nft-005', 6)
    await addToCart(page, 'nft-006', 9)
    await expect(page.getByTestId('subtotal')).toHaveText('26.83 ETH')
    await expect(page.getByTestId('total')).toHaveText('26.846 ETH')
  })

  test('cart survives a refresh and items can be removed', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001')
    await page.reload()
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
    const removed = page.waitForResponse((response) => response.request().method() === 'DELETE' && response.url().includes('/api/cart/items/'))
    await page.getByRole('button', { name: /^Remover Emerald Ape/ }).filter({ visible: true }).click()
    await removed
    await expect(page.getByTestId('empty-cart')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('empty-cart')).toBeVisible()
  })

  test('increasing and decreasing quantity from the cart', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001')
    await page.getByRole('button', { name: /Aumentar quantidade/ }).filter({ visible: true }).click()
    await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
    await page.getByRole('button', { name: /Diminuir quantidade/ }).filter({ visible: true }).click()
    await expect(page.getByTestId('subtotal')).toHaveText('1.19 ETH')
  })

  test('valid coupon applies a discount and can be removed', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001', 2)
    await page.getByLabel('Código promocional').fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('applied-coupon')).toContainText('KURIO10')
    await expect(page.getByTestId('discount')).toHaveText('(-) 0.238')
    await expect(page.getByTestId('total')).toHaveText('2.158 ETH')
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByTestId('discount')).toHaveText('(-) 0.00')
  })

  test('invalid and expired coupons show clear messages', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001')
    await page.getByLabel('Código promocional').fill('NOPE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'inválido' })).toBeVisible()
    await page.getByLabel('Código promocional').fill('VELHO20')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'expirou' })).toBeVisible()
  })

  test('coupon scenarios force the failure reason', async ({ page }) => {
    await open(page, '/', 'coupon-expired')
    await addToCart(page, 'nft-001')
    await page.getByLabel('Código promocional').fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'expirou' })).toBeVisible()
  })

  test('cart reflects a live stock change', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001')
    await page.evaluate(() => window.__kurioMock?.updateNft('nft-001', { available: { e50: 0 } }))
    await expect(page.getByRole('alert').filter({ hasText: 'Esgotado' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /finalizar/ })).toBeDisabled()
  })
})
