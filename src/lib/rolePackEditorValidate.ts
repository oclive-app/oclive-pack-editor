/**
 * 角色包编辑器侧校验：构建 Stable v4 蓝图并与 oclive_validation 版本路由对齐。
 */

import {
  buildBlueprintFromLegacy,
  validateBlueprintTypescript,
} from './blueprintV2'
import { validateEditorPack, validateMinRuntimeVersion, type ManifestInput, type SettingsInput } from './validation'
import { invoke } from '@tauri-apps/api/core'

/** 与 `oclive_validation::disk_role_settings::CURRENT_SETTINGS_SCHEMA_VERSION` 一致 */
export const ROLE_PACK_SETTINGS_SCHEMA_VERSION = 1

function validateDefaultPersonalityVector(values: unknown): string | null {
  if (values === undefined || values === null) return null
  if (!Array.isArray(values)) return 'manifest.default_personality 须为数组'
  if (values.length === 0) return null
  if (values.length !== 7) {
    return `manifest.default_personality 须为 7 个数字（当前 ${values.length} 个）`
  }
  for (let i = 0; i < 7; i++) {
    const x = Number(values[i])
    if (!Number.isFinite(x)) return `manifest.default_personality[${i}] 不是有限数字`
    if (x < 0 || x > 1) return `manifest.default_personality[${i}] 须在 0～1 之间（当前为 ${x}）`
  }
  return null
}

export function validateRolePackTypescript(
  manifestJson: string,
  settingsJson: string | null,
  mergedSceneIds: string[],
  hostVersion: string,
): string[] {
  const errors: string[] = []
  let manifest: unknown
  try {
    manifest = JSON.parse(manifestJson)
  } catch (e) {
    return [`角色门面 JSON 语法错误: ${e}`]
  }

  let settings: SettingsInput | null = null
  let settingsRecord: Record<string, unknown> = {}
  if (settingsJson != null && settingsJson.trim() !== '') {
    try {
      settings = JSON.parse(settingsJson) as SettingsInput
      settingsRecord = settings as Record<string, unknown>
    } catch (e) {
      return [`运行时 JSON 语法错误: ${e}`]
    }
  }

  const m = manifest as ManifestInput
  errors.push(...validateEditorPack(m, settings, mergedSceneIds))

  const mr = manifest as Record<string, unknown>
  const perr = validateDefaultPersonalityVector(mr.default_personality)
  if (perr) errors.push(perr)

  const minErr = validateMinRuntimeVersion(mr.min_runtime_version, hostVersion)
  if (minErr) errors.push(minErr)

  const bp = buildBlueprintFromLegacy(mr, settingsRecord)
  const roleId = String(mr.id ?? bp.meta.id ?? '').trim()
  errors.push(...validateBlueprintTypescript(bp, roleId || undefined))

  return errors
}

/** Validate config.json reply_post_processor (mirrors oclive_validation rules). */
export function validateReplyPostProcessorConfigJson(configJson: string | null): string[] {
  if (configJson == null || configJson.trim() === '') {
    return []
  }
  let root: Record<string, unknown>
  try {
    root = JSON.parse(configJson) as Record<string, unknown>
  }
  catch (e) {
    return [`config.json 语法错误: ${e}`]
  }
  const rpp = root.reply_post_processor
  if (rpp == null) {
    return []
  }
  if (typeof rpp !== 'object' || Array.isArray(rpp)) {
    return ['config.json reply_post_processor 须为对象']
  }
  const cfg = rpp as Record<string, unknown>
  const errs: string[] = []
  const backend = String(cfg.backend ?? 'builtin').trim().toLowerCase()
  if (!['builtin', 'remote', 'directory'].includes(backend)) {
    errs.push(`config.json reply_post_processor.backend 须为 builtin | remote | directory（当前「${cfg.backend}」）`)
  }
  if (cfg.enabled === true && backend === 'remote') {
    const url = (cfg.remote as { url?: string } | undefined)?.url
    if (!url?.trim()) {
      errs.push('config.json reply_post_processor: backend=remote 且 enabled 时 remote.url 必填非空')
    }
  }
  if (cfg.enabled === true && backend === 'directory') {
    const pid = (cfg.directory as { plugin_id?: string } | undefined)?.plugin_id
    if (!pid?.trim()) {
      errs.push('config.json reply_post_processor: backend=directory 且 enabled 时 directory.plugin_id 必填非空')
    }
  }
  const profile = (cfg.builtin as { profile?: string } | undefined)?.profile
  if (profile != null) {
    const p = profile.trim().toLowerCase()
    if (!['standard', 'minimal'].includes(p)) {
      errs.push(`config.json reply_post_processor.builtin.profile 须为 standard | minimal（当前「${profile}」）`)
    }
  }
  return errs
}

export type RolePackEditorValidateResult = {
  ok: boolean
  errors: string[]
  usedWasm: boolean
}

/**
 * Desktop editor-state baseline. The Tauri command keeps its historical v2
 * name for IPC compatibility; final export-directory validation dispatches
 * the exact v2/v3/v4 contract.
 */
export async function validateRolePackEditorState(
  manifestJson: string,
  settingsJson: string | null,
  mergedSceneIds: string[],
  hostVersion: string,
  configJson?: string | null,
): Promise<RolePackEditorValidateResult> {
  const tsErrors = validateRolePackTypescript(manifestJson, settingsJson, mergedSceneIds, hostVersion)
  const configErrors = validateReplyPostProcessorConfigJson(configJson ?? null)
  const allErrors = [...tsErrors, ...configErrors]
  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors, usedWasm: false }
  }

  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      const manifest = JSON.parse(manifestJson) as Record<string, unknown>
      await invoke('validate_blueprint_v2_json', {
        manifestText: manifestJson,
        settingsText: settingsJson ?? '{}',
        mergedSceneIds,
        hostRuntimeVersion: hostVersion,
        roleId: String(manifest.id ?? '').trim(),
      })
      return { ok: true, errors: [], usedWasm: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, errors: msg.split('\n').filter(Boolean), usedWasm: true }
    }
  }

  return { ok: true, errors: [], usedWasm: false }
}
