import { expect, test, type Page } from '@playwright/test'

function collectPageFailures(page: Page): string[] {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') failures.push(message.text())
  })
  page.on('requestfailed', (request) => failures.push(`${request.url()}: ${request.failure()?.errorText ?? 'failed'}`))
  return failures
}

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

  test('浏览器开始页明确导入能力与桌面目录边界', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /创建新角色包|Create new role pack/i })).toBeVisible()
    await expect(page.getByText(/浏览器模式|Browser mode/i)).toBeVisible()
    await expect(page.getByText(/桌面版|desktop app/i)).toBeVisible()
    await expect(page.getByText(/导入角色包|Import role pack/i)).toBeVisible()
    await expect(page.locator('label.rw-label').filter({ hasText: /Roles directory|Roles 目录/i })).toHaveCount(0)
  })

  test('高级页可编辑 memory_seed 与知识库', async ({ page }) => {
    const pageErrors = collectPageFailures(page)
    await page.goto('/')
    await page.getByRole('button', { name: /创建新角色包|Create new role pack/i }).click()
    await page.getByRole('button', { name: /高级|Advanced/i }).click()
    await expect.poll(() => pageErrors, { timeout: 2000 }).toEqual([])
    await page.getByRole('tab', { name: /初始记忆|Memory seed/i }).click()
    await expect(page.getByRole('textbox', { name: 'memory_seed.json' })).toBeVisible()
  })

  test('用户身份可从空状态建立并映射角色关系', async ({ page }) => {
    const pageErrors = collectPageFailures(page)
    await page.goto('/')
    await page.getByRole('button', { name: /创建新角色包|Create new role pack/i }).click()
    await page.getByRole('button', { name: /高级|Advanced/i }).click()
    await page.getByRole('tab', { name: /用户身份模板|User identity templates/i }).click()

    await expect(page.getByRole('heading', { name: /可视化身份目录|Visual identity catalog/i })).toBeVisible()
    await expect(page.getByText(/尚未配置用户身份|No user identities configured/i)).toBeVisible()
    await page.getByRole('button', { name: /新增用户身份|Add user identity/i }).click()

    await expect(page.locator('.identity-card')).toHaveCount(1)
    await expect(page.getByRole('textbox', { name: /^(身份 ID|Identity ID)/i })).toHaveValue('identity_1')
    await expect(page.getByRole('combobox', { name: /^(映射到角色关系|Map to role relation)/i })).toHaveValue('friend')
    await expect(page.getByText(/默认：新身份|Default: New identity/i)).toBeVisible()
    await expect.poll(() => pageErrors, { timeout: 2000 }).toEqual([])
  })

  test('窄屏身份编辑保持单列且无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 })
    await page.goto('/')
    await page.getByRole('button', { name: /创建新角色包|Create new role pack/i }).click()
    await page.getByRole('button', { name: /高级|Advanced/i }).click()
    await page.getByRole('tab', { name: /用户身份模板|User identity templates/i }).click()
    await page.getByRole('button', { name: /新增用户身份|Add user identity/i }).click()

    await expect(page.locator('.identity-grid')).toHaveCSS('grid-template-columns', /^\d+(\.\d+)?px$/)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
