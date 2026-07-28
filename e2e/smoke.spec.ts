import { expect, test } from '@playwright/test'

test.describe('oclive-pack-editor smoke', () => {
  test('首页标题与主标题可见', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/oclive-pack-editor/i)
    await expect(page.getByRole('heading', { level: 1, name: /开始|Start/i })).toBeVisible()
  })

  test('侧栏四项与顶栏检查角色包按钮存在', async ({ page }) => {
    await page.goto('/')
    const rail = page.locator('.editor-rail')
    await expect(rail.getByRole('button', { name: /简单|Simple/i })).toBeVisible()
    await expect(rail.getByRole('button', { name: /高级|Advanced/i })).toBeVisible()
    await expect(rail.getByRole('button', { name: /成人|Adult/i })).toBeVisible()
    await expect(rail.getByRole('button')).toHaveCount(4)
    await expect(page.getByRole('button', { name: /检查角色包|Check pack/i })).toBeVisible()
  })

  test('开始页含 roles 工作区与创建新角色包', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /创建新角色包|Create new role pack/i })).toBeVisible()
    await expect(page.locator('label.rw-label').filter({ hasText: /Roles directory|Roles 目录/i })).toBeVisible()
  })

  test('高级页可编辑 memory_seed 与知识库', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') pageErrors.push(message.text())
    })
    page.on('requestfailed', (request) => pageErrors.push(`${request.url()}: ${request.failure()?.errorText ?? 'failed'}`))
    await page.goto('/')
    await page.getByRole('button', { name: /创建新角色包|Create new role pack/i }).click()
    await page.getByRole('button', { name: /高级|Advanced/i }).click()
    await expect.poll(() => pageErrors, { timeout: 2000 }).toEqual([])
    await page.getByRole('tab', { name: /初始记忆|Memory seed/i }).click()
    await expect(page.getByRole('textbox', { name: 'memory_seed.json' })).toBeVisible()
  })
})
