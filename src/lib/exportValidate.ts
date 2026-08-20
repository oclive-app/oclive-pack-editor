import {
  buildRolePackFiles,
  collectRolePackBinaryFilesForExport,
  type ExportableManifest,
  type ExportableSettings,
  type PackExtraFiles,
} from './exportPack'
import { HOST_RUNTIME_VERSION } from './hostRuntimeVersion'
import { isTauriRuntime } from './exportFolder'
import { parseConfigJson } from './portraitCatalog'
import { humanizeExportValidateErrors } from './exportErrorMessages'
import {
  PIPELINE_BLUEPRINT_FILENAME,
  parseBlueprintJson,
  validateBlueprintTypescript,
} from './blueprintV2'
import { invoke } from '@tauri-apps/api/core'
const PLACEHOLDER_BYTES = '\u0000'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeJsonValues(base: unknown, patch: unknown): unknown {
  if (!isRecord(base) || !isRecord(patch)) return patch
  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = mergeJsonValues(merged[key], value)
  }
  return merged
}

function applyIncludeAtTarget(
  root: Record<string, unknown>,
  target: string,
  fragment: unknown,
  mode: 'merge' | 'replace',
): string | null {
  const parts = target.split('.')
  let cursor = root
  for (const [index, key] of parts.entries()) {
    const last = index === parts.length - 1
    if (last) {
      cursor[key] = mode === 'replace' ? fragment : mergeJsonValues(cursor[key], fragment)
      return null
    }
    const next = cursor[key]
    if (next == null) {
      cursor[key] = {}
    } else if (!isRecord(next)) {
      return `target「${target}」中间节点须为对象`
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  return `target「${target}」解析失败`
}

/** Mirror disk paths referenced by catalog / VP so wasm `validate_portrait_catalog_files` passes. */
export function appendAssetPlaceholdersForValidate(
  files: Map<string, string>,
  roleId: string,
  extra?: Partial<PackExtraFiles>,
): Map<string, string> {
  const id = roleId.trim()
  const out = new Map(files)

  const writeIfMissing = (rel: string, content = PLACEHOLDER_BYTES) => {
    const key = `${id}/${rel.replace(/\\/g, '/').replace(/^\//, '')}`
    if (!out.has(key)) out.set(key, content)
  }

  const assets =
    extra?.catalogAssets?.length
      ? extra.catalogAssets
      : (extra?.emotionImages ?? []).map((f) => ({
          relPath: `assets/images/${f.name}`,
          file: f,
        }))
  for (const { relPath } of assets) {
    writeIfMissing(relPath)
  }

  const catalogRaw = extra?.portraitCatalogJson?.trim()
  if (catalogRaw) {
    try {
      const parsed = JSON.parse(catalogRaw) as {
        assets?: Array<{ path?: string; kind?: string }>
      }
      for (const a of parsed.assets ?? []) {
        const rel = a.path?.trim()
        if (!rel) continue
        writeIfMissing(rel, a.kind === 'live2d' ? '{}' : PLACEHOLDER_BYTES)
      }
    } catch {
      /* ignore */
    }
  }

  const configRaw = extra?.configJson?.trim()
  if (configRaw) {
    const { visual } = parseConfigJson(configRaw)
    const model = visual.live2dModel?.trim()
    if (model) writeIfMissing(model, '{}')
  }

  return out
}

/** Desktop: write export-shaped tree to temp dir and run version-dispatched role-pack validation. */
export async function validateExportPackDirectory(
  roleId: string,
  manifest: ExportableManifest,
  settings: ExportableSettings,
  extra?: Partial<PackExtraFiles>,
): Promise<{ ok: boolean; errors: string[]; usedTauri: boolean }> {
  const id = roleId.trim()
  const textFiles = buildRolePackFiles(id, { ...manifest, id }, settings, extra)
  const binaryFiles = collectRolePackBinaryFilesForExport(id, textFiles.keys(), extra)
  const files = appendAssetPlaceholdersForValidate(
    textFiles,
    id,
    extra,
  )
  for (const { relPath, file } of binaryFiles) {
    const key = `${id}/${relPath}`
    if (!files.has(key)) files.set(key, await file.text())
  }

  const blueprintPath = `${id}/${PIPELINE_BLUEPRINT_FILENAME}`
  try {
    const blueprint = parseBlueprintJson(files.get(blueprintPath) ?? '')
    const structuralErrors = validateBlueprintTypescript(blueprint, id)
    const resolved = JSON.parse(JSON.stringify(blueprint)) as Record<string, unknown>
    delete resolved.includes
    for (const [index, include] of (blueprint.includes ?? []).entries()) {
      const includePath = `${id}/${include.path.replace(/^\/+/, '')}`
      const includeRaw = files.get(includePath)
      if (includeRaw == null) {
        structuralErrors.push(`includes[${index}] 引用的文件未包含在导出结果中：${include.path}`)
        continue
      }
      let fragment: unknown
      try {
        fragment = JSON.parse(includeRaw)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        structuralErrors.push(`includes[${index}] JSON 解析失败（${include.path}）：${message}`)
        continue
      }
      const applyError = applyIncludeAtTarget(resolved, include.target.trim(), fragment, include.mode)
      if (applyError) {
        structuralErrors.push(`includes[${index}] ${applyError}`)
      }
    }
    if (blueprint.schema_version === 4) {
      for (const [instanceId, declaration] of Object.entries(blueprint.extensions ?? {})) {
        const configRef = declaration.config_ref.trim()
        const configPath = `${id}/${configRef}`
        const payloadRaw = files.get(configPath)
        if (payloadRaw == null) {
          structuralErrors.push(
            `extensions[${instanceId}].config_ref 引用的文件未包含在导出结果中：${configRef}`,
          )
          continue
        }
        try {
          JSON.parse(payloadRaw)
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          structuralErrors.push(
            `extensions[${instanceId}].config_ref JSON 解析失败（${configRef}）：${message}`,
          )
        }
      }
    }
    if (structuralErrors.length === 0) {
      structuralErrors.push(
        ...validateBlueprintTypescript(
          parseBlueprintJson(JSON.stringify(resolved)),
          id,
        ),
      )
    }
    if (structuralErrors.length > 0) {
      return { ok: false, errors: structuralErrors, usedTauri: false }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, errors: [message], usedTauri: false }
  }

  const payload = [...files.entries()].map(([path, content]) => ({ path, content }))

  if (!isTauriRuntime()) {
    return { ok: true, errors: [], usedTauri: false }
  }

  try {
    await invoke('validate_role_pack_export', {
      roleId: id,
      files: payload,
      hostRuntimeVersion: HOST_RUNTIME_VERSION,
    })
    return { ok: true, errors: [], usedTauri: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const raw = msg.split('\n').filter(Boolean)
    return { ok: false, errors: humanizeExportValidateErrors(raw, id), usedTauri: true }
  }
}
