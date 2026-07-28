import { mergedSceneIds } from './packLayout'
import { validateManifestTopLevelKeys, validateSettingsTopLevelKeys } from './jsonKeys'
import type { ManifestInput } from './validation'
import { HOST_RUNTIME_VERSION } from './hostRuntimeVersion'
import { validateRolePackEditorState } from './rolePackEditorValidate'

export function parseJson<T>(
  raw: string,
  label: string,
): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) as T }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `${label} 不是合法 JSON：${msg}` }
  }
}

/** 解析编辑器「角色门面 / 运行时」JSON 文本，供导出等路径统一报错。 */
export function parsePackDocuments(
  manifestText: string,
  settingsText: string,
):
  | { ok: true; manifest: Record<string, unknown>; settings: Record<string, unknown> }
  | { ok: false; errors: string[] } {
  const m = parseJson<Record<string, unknown>>(manifestText, '角色门面 JSON')
  if (!m.ok) return { ok: false, errors: [m.error] }
  const s = parseJson<Record<string, unknown>>(settingsText, '运行时 JSON')
  if (!s.ok) return { ok: false, errors: [s.error] }
  return { ok: true, manifest: m.value, settings: s.value }
}

export type PackCheckResult = {
  ok: boolean
  errors: string[]
  /** 桌面版走历史命名的 Tauri 基础蓝图校验时为 true */
  wasmUsed: boolean
}

/**
 * JSON 可解析、顶层键检查，再经 v2 蓝图校验链（与 RolePackEditor / pack validate 默认 profile 同源）。
 */
export async function runAllPackChecks(
  manifestText: string,
  settingsText: string,
): Promise<PackCheckResult> {
  const p = parsePackDocuments(manifestText, settingsText)
  if (!p.ok) {
    return { ok: false, errors: p.errors, wasmUsed: false }
  }
  const m = p.manifest as ManifestInput
  const scenes = mergedSceneIds(m.scenes, [])
  const keyErrors = [
    ...validateManifestTopLevelKeys(p.manifest),
    ...validateSettingsTopLevelKeys(p.settings),
  ]
  if (keyErrors.length > 0) {
    return { ok: false, errors: keyErrors, wasmUsed: false }
  }

  const r = await validateRolePackEditorState(
    manifestText,
    settingsText,
    scenes,
    HOST_RUNTIME_VERSION,
  )
  return { ok: r.ok, errors: r.errors, wasmUsed: r.usedWasm }
}
