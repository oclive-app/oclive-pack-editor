import { expect, test, type Locator, type Page } from '@playwright/test'

async function useEnglishUi(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('oclive.appLocale', 'en-US'))
}

async function createPack(page: Page): Promise<void> {
  await page.goto('/')
  await page.locator('.rw-btn--accent').click()
}

async function expectInsideViewport(page: Page, locator: Locator, margin = 8): Promise<void> {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(margin)
  expect(box!.y).toBeGreaterThanOrEqual(margin)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width - margin + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height - margin + 1)
}

test.describe('editor layout and help popovers', () => {
  test.beforeEach(async ({ page }) => {
    await useEnglishUi(page)
  })

  test('question-circle explanations remain readable in a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 560, height: 780 })
    await createPack(page)
    await page.locator('.mobile-nav-btn').filter({ hasText: 'Advanced' }).click()

    const overviewHelp = page.locator('.adv-toolbar-lead .help-btn')
    await expect(overviewHelp).toHaveCount(1)
    await overviewHelp.click()

    const popover = page.locator('body > .help-pop')
    await expect(popover).toBeVisible()
    await expect(popover.locator('p')).toHaveCount(2)
    await expectInsideViewport(page, popover)

    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)

    await page.locator('.mobile-nav-btn').filter({ hasText: 'Simple' }).click()
    const lastHelp = page.locator('.help-btn:visible').last()
    await lastHelp.scrollIntoViewIfNeeded()
    await lastHelp.click()
    await expect(popover).toBeVisible()
    await expectInsideViewport(page, popover)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('header tools, menus and adult actions do not overlap or wrap awkwardly', async ({ page }) => {
    await page.setViewportSize({ width: 560, height: 780 })
    await createPack(page)

    const visibleButtonRects = await page.locator('.shell-header-tools button:visible').evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect()
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
      }),
    )
    for (let i = 0; i < visibleButtonRects.length; i += 1) {
      const a = visibleButtonRects[i]!
      expect(a.left).toBeGreaterThanOrEqual(0)
      expect(a.right).toBeLessThanOrEqual(560)
      for (let j = i + 1; j < visibleButtonRects.length; j += 1) {
        const b = visibleButtonRects[j]!
        const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        expect(overlapWidth > 1 && overlapHeight > 1).toBe(false)
      }
    }

    await page.locator('.pack-shell-menu .psm-btn').first().click()
    const languageMenu = page.locator('.pack-shell-menu-dropdown')
    await expect(languageMenu).toBeVisible()
    await expect(languageMenu).toHaveCSS('border-top-style', 'solid')
    await expect(languageMenu).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expectInsideViewport(page, languageMenu)

    await page.locator('.mobile-nav-btn').filter({ hasText: 'Adult extension' }).click()
    await page.getByRole('button', { name: 'Create adult extension' }).click()
    const removeButton = page.getByRole('button', { name: 'Remove adult extension' })
    await expect(removeButton).toHaveCSS('white-space', 'nowrap')
    expect((await removeButton.boundingBox())!.height).toBeLessThan(48)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
