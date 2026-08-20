import { describe, expect, it } from 'vitest'
import enUS from './en-US'
import zhCN from './zh-CN'

describe('Stable v4 blueprint terminology', () => {
  it('does not present the Tauri editor-state baseline as a v2-only validator', () => {
    expect(zhCN.packChecks.status.lastRustWasm).toContain('基础蓝图校验')
    expect(zhCN.packChecks.status.lastRustWasm).not.toContain('v2')
    expect(enUS.packChecks.status.lastRustWasm).toContain('base-blueprint validation')
    expect(enUS.packChecks.status.lastRustWasm).not.toContain('v2')
  })

  it('labels the editable contract as Stable v4 with v2 compatibility', () => {
    expect(zhCN.packEditor.headerActions.checkTitle).toContain('Stable v4')
    expect(zhCN.packEditor.headerActions.checkTitle).toContain('兼容 v2')
    expect(enUS.packEditor.headerActions.checkTitle).toContain('Stable v4')
    expect(enUS.packEditor.headerActions.checkTitle).toContain('v2-compatible')
  })
})
