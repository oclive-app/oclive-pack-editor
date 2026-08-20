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

  test('V2 JSON 角色卡转换为可编辑的简单创作草稿', async ({ page }) => {
    const pageErrors = collectPageFailures(page)
    await page.goto('/')
    const card = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'E2E Alice',
        description: '{{char}} is a traveler.',
        personality: 'Curious and calm.',
        scenario: '{{char}} meets {{user}} at a station.',
        first_mes: 'Hello, {{user}}.',
        mes_example: '',
        alternate_greetings: [],
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        tags: [],
        creator: '',
        character_version: '1.0.0',
        extensions: {},
      },
    }
    await page.locator('input[accept*="application/json"]').setInputFiles({
      name: 'alice.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(card)),
    })

    await expect(page.getByRole('dialog', { name: /选择从哪里继续创作|Choose where to continue/i })).toBeVisible()
    await page.getByRole('button', { name: /进入简单创造|Open Simple creation/i }).click()
    await expect(page.getByText(/角色卡转换报告|Character Card conversion report/i)).toBeVisible()
    await expect(page.locator('#core-ta')).toHaveValue(/E2E Alice is a traveler\./)
    await expect(page.getByText(/无需修改即可生效|active by default/i)).toBeVisible()
    await page.locator('.reply-quality-switch input').check()
    const promptArea = page.locator('#reply-quality-ta')
    const promptLayout = await promptArea.evaluate((element) => {
      const textarea = element as HTMLTextAreaElement
      const parent = textarea.parentElement!
      const parentStyle = getComputedStyle(parent)
      const availableWidth =
        parent.clientWidth -
        Number.parseFloat(parentStyle.paddingLeft) -
        Number.parseFloat(parentStyle.paddingRight)
      return {
        resize: getComputedStyle(textarea).resize,
        width: textarea.getBoundingClientRect().width,
        availableWidth,
      }
    })
    expect(promptLayout.resize).toBe('both')
    expect(Math.abs(promptLayout.width - promptLayout.availableWidth)).toBeLessThanOrEqual(2)
    await expect.poll(() => pageErrors, { timeout: 2000 }).toEqual([])
  })

  test('角色卡转换后可直接进入高级创作检查文件', async ({ page }) => {
    const pageErrors = collectPageFailures(page)
    await page.goto('/')
    const card = {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: 'Advanced Alice',
        description: 'A careful V3 tester.',
        personality: 'Observant.',
        scenario: 'A quiet lab.',
        first_mes: 'Ready.',
        mes_example: '',
        group_only_greetings: [],
        assets: [],
      },
    }
    await page.locator('input[accept*="application/json"]').setInputFiles({
      name: 'advanced-alice.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(card)),
    })

    await page.getByRole('button', { name: /进入高级创作|Open Advanced creation/i }).click()
    await expect(page.locator('.rail-btn.active')).toContainText(/高级|Advanced/i)
    await expect(page.getByRole('tab', { name: /核心档案与寄语|Core profile & message/i })).toBeVisible()
    await expect.poll(() => pageErrors, { timeout: 2000 }).toEqual([])
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
