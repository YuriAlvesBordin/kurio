import { expect, test } from '@playwright/test'
import { ANA, BRUNO, isMobile, login, open } from './helpers'

test.describe('favorites', () => {
  test('guests are asked to sign in before favoriting', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await page.getByRole('button', { name: /^(Favoritar)$/ }).filter({ visible: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('favorites persist across reload and are private to each user', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await page.getByRole('button', { name: /^Favoritar$/ }).filter({ visible: true }).first().click()
    await login(page, ANA)
    await page.getByRole('button', { name: /^Favoritar$/ }).filter({ visible: true }).first().click()
    await expect(page.getByRole('button', { name: /Favoritado|Remover dos favoritos/ }).filter({ visible: true }).first()).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: /Favoritado|Remover dos favoritos/ }).filter({ visible: true }).first()).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da conta').first()).toBeVisible()
    await page.goto('/nft/nft-001')
    await login(page, BRUNO)
    await expect(page.getByRole('button', { name: /^Favoritar$/ }).filter({ visible: true }).first()).toHaveAttribute('aria-pressed', 'false')
  })

  test('a failed favorite toggle is rolled back', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await login(page, ANA)
    await page.evaluate(() => window.__kurioMock?.setScenario('offline'))
    const button = page.getByRole('button', { name: /^Favoritar$/ }).filter({ visible: true }).first()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(page.getByRole('button', { name: /^Favoritar$/ }).filter({ visible: true }).first()).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 })
    test.skip(isMobile(page) && false, 'covered on both viewports')
  })
})
