import type { RolePackTextFile } from './exportPack'
import { normalizeUserIdentityTemplatePath } from './userIdentities'

type JsonObject = Record<string, unknown>

export type UserIdentityEditorEntry = {
  key: string
  id: string
  displayName: string
  templateFile: string
  mapsToRelationId: string
  templateBody: string
  extra: JsonObject
}

export type UserIdentityEditorState = {
  defaultIdentityId: string
  entries: UserIdentityEditorEntry[]
  rootExtra: JsonObject
  unreferencedFiles: RolePackTextFile[]
}

export type UserIdentityEditorIssue = {
  code:
    | 'emptyId'
    | 'duplicateId'
    | 'emptyDisplayName'
    | 'invalidTemplateFile'
    | 'duplicateTemplateFile'
    | 'emptyTemplateBody'
    | 'invalidDefault'
  entryKey?: string
  value?: string
}

export type UserIdentityParseResult = {
  state: UserIdentityEditorState
  parseError: string
}

export type UserRelationOption = {
  id: string
  displayName: string
  promptHint: string
}

function asObject(value: unknown): JsonObject | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

function withoutKeys(source: JsonObject, keys: string[]): JsonObject {
  const copy = { ...source }
  for (const key of keys) delete copy[key]
  return copy
}

function templateRelativePath(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\\/g, '/').replace(/^user_identities\//, '').replace(/^\/+/, '').trim()
}

function fullTemplatePath(templateFile: string): string {
  return `user_identities/${templateFile.replace(/\\/g, '/').replace(/^\/+/, '').trim()}`
}

function normalizedTemplatePath(templateFile: unknown): string | null {
  return normalizeUserIdentityTemplatePath(fullTemplatePath(templateRelativePath(templateFile)))
}

function derivedIdentityId(path: string, index: number, used: Set<string>): string {
  const leaf = path.split('/').pop()?.replace(/\.md$/i, '') ?? ''
  const base = leaf.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
    || `identity_${index + 1}`
  let id = base
  let suffix = 2
  while (used.has(id)) id = `${base}_${suffix++}`
  used.add(id)
  return id
}

export function parseUserIdentityEditorState(
  indexJson: string,
  files: RolePackTextFile[],
): UserIdentityParseResult {
  const safeFileMap = new Map<string, RolePackTextFile>()
  for (const file of files) {
    const normalized = normalizeUserIdentityTemplatePath(file.path)
    if (normalized) safeFileMap.set(normalized, { path: normalized, content: file.content })
  }

  const emptyState: UserIdentityEditorState = {
    defaultIdentityId: '',
    entries: [],
    rootExtra: {},
    unreferencedFiles: files.map((file) => ({ ...file })),
  }

  if (!indexJson.trim()) {
    const used = new Set<string>()
    const entries = [...safeFileMap.values()].map((file, index) => {
      const id = derivedIdentityId(file.path, index, used)
      return {
        key: `derived-${index}-${id}`,
        id,
        displayName: id,
        templateFile: file.path.replace(/^user_identities\//, ''),
        mapsToRelationId: '',
        templateBody: file.content,
        extra: {},
      }
    })
    return {
      state: {
        ...emptyState,
        defaultIdentityId: entries[0]?.id ?? '',
        entries,
        unreferencedFiles: [],
      },
      parseError: '',
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(indexJson)
  } catch (error) {
    return {
      state: emptyState,
      parseError: error instanceof Error ? error.message : String(error),
    }
  }
  const root = asObject(parsed)
  if (!root) return { state: emptyState, parseError: 'index.json root must be an object' }
  const identities = asObject(root.identities)
  if (!identities) {
    return { state: emptyState, parseError: 'index.json identities must be an object' }
  }

  const referenced = new Set<string>()
  const entries = Object.entries(identities).map(([id, rawEntry], index) => {
    const entry = asObject(rawEntry) ?? {}
    const templateFile = templateRelativePath(entry.template_file)
    const normalized = normalizedTemplatePath(templateFile)
    if (normalized) referenced.add(normalized)
    return {
      key: `identity-${index}-${id}`,
      id,
      displayName: typeof entry.display_name === 'string' ? entry.display_name : '',
      templateFile,
      mapsToRelationId:
        typeof entry.maps_to_relation_id === 'string' ? entry.maps_to_relation_id : '',
      templateBody: normalized ? safeFileMap.get(normalized)?.content ?? '' : '',
      extra: withoutKeys(entry, [
        'display_name',
        'template_file',
        'maps_to_relation_id',
      ]),
    }
  })

  return {
    state: {
      defaultIdentityId:
        typeof root.default_identity_id === 'string' ? root.default_identity_id : '',
      entries,
      rootExtra: withoutKeys(root, ['schema_version', 'default_identity_id', 'identities']),
      unreferencedFiles: files
        .filter((file) => {
          const normalized = normalizeUserIdentityTemplatePath(file.path)
          return !normalized || !referenced.has(normalized)
        })
        .map((file) => ({ ...file })),
    },
    parseError: '',
  }
}

export function validateUserIdentityEditorState(
  state: UserIdentityEditorState,
): UserIdentityEditorIssue[] {
  if (state.entries.length === 0) return []
  const issues: UserIdentityEditorIssue[] = []
  const ids = new Set<string>()
  const templates = new Set<string>()

  for (const entry of state.entries) {
    const id = entry.id.trim()
    if (!id) issues.push({ code: 'emptyId', entryKey: entry.key })
    else if (ids.has(id)) issues.push({ code: 'duplicateId', entryKey: entry.key, value: id })
    else ids.add(id)

    if (!entry.displayName.trim()) {
      issues.push({ code: 'emptyDisplayName', entryKey: entry.key })
    }

    const path = normalizedTemplatePath(entry.templateFile)
    if (!path) {
      issues.push({ code: 'invalidTemplateFile', entryKey: entry.key, value: entry.templateFile })
    } else if (templates.has(path)) {
      issues.push({ code: 'duplicateTemplateFile', entryKey: entry.key, value: entry.templateFile })
    } else {
      templates.add(path)
    }

    if (!entry.templateBody.trim()) {
      issues.push({ code: 'emptyTemplateBody', entryKey: entry.key })
    }
  }

  if (!state.defaultIdentityId.trim() || !ids.has(state.defaultIdentityId.trim())) {
    issues.push({ code: 'invalidDefault', value: state.defaultIdentityId })
  }
  return issues
}

export function serializeUserIdentityEditorState(
  state: UserIdentityEditorState,
): { indexJson: string; files: RolePackTextFile[] } {
  if (state.entries.length === 0) {
    const files = state.unreferencedFiles.map((file) => ({ ...file }))
    if (Object.keys(state.rootExtra).length === 0) return { indexJson: '', files }
    const root: JsonObject = {
      ...state.rootExtra,
      schema_version: 1,
      default_identity_id: '',
      identities: {},
    }
    return { indexJson: `${JSON.stringify(root, null, 2)}\n`, files }
  }

  const identities: JsonObject = {}
  const managedTemplatePaths = new Set(
    state.entries
      .map((entry) => normalizedTemplatePath(entry.templateFile))
      .filter((path): path is string => Boolean(path)),
  )
  const files = state.unreferencedFiles
    .filter((file) => {
      const normalized = normalizeUserIdentityTemplatePath(file.path)
      return !normalized || !managedTemplatePaths.has(normalized)
    })
    .map((file) => ({ ...file }))
  for (const entry of state.entries) {
    const id = entry.id.trim()
    const templateFile = templateRelativePath(entry.templateFile)
    const serialized: JsonObject = {
      ...entry.extra,
      display_name: entry.displayName.trim(),
      template_file: templateFile,
    }
    if (entry.mapsToRelationId.trim()) {
      serialized.maps_to_relation_id = entry.mapsToRelationId.trim()
    }
    identities[id] = serialized
    files.push({ path: fullTemplatePath(templateFile), content: entry.templateBody })
  }

  const root: JsonObject = {
    ...state.rootExtra,
    schema_version: 1,
    default_identity_id: state.defaultIdentityId.trim(),
    identities,
  }
  return { indexJson: `${JSON.stringify(root, null, 2)}\n`, files }
}

export function parseUserRelationOptions(manifestText: string): UserRelationOption[] {
  try {
    const manifest = asObject(JSON.parse(manifestText))
    const relations = asObject(manifest?.user_relations ?? manifest?.relations)
    if (!relations) return []
    return Object.entries(relations).map(([id, raw]) => {
      const relation = asObject(raw) ?? {}
      return {
        id,
        displayName:
          typeof relation.display_name === 'string' && relation.display_name.trim()
            ? relation.display_name.trim()
            : id,
        promptHint: typeof relation.prompt_hint === 'string' ? relation.prompt_hint.trim() : '',
      }
    })
  } catch {
    return []
  }
}
