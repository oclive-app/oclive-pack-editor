import type { UiConfig } from '../types/uiConfig'
import { serializeUiConfig } from './uiConfig'

export type AuthorRecRow = { id: string; version_range: string; note: string }

export function emptyAuthorRecRow(): AuthorRecRow {
  return { id: '', version_range: '', note: '' }
}

export type ParsedAuthorImport = {
  summary: string
  detailMarkdown: string
  rows: AuthorRecRow[]
  includeSuggestedUi: boolean
  suggestedPluginBackendsJson: string
  /** 若存在，应合并进编写器 `uiConfig`（与 `ui.json` 同形） */
  suggestedUi: unknown | null
}

export function parseAuthorImport(authorJson: string): ParsedAuthorImport | null {
  const t = authorJson.trim()
  if (!t) return null
  try {
    const o = JSON.parse(t) as Record<string, unknown>
    const rp = Array.isArray(o.recommended_plugins) ? o.recommended_plugins : []
    const rows: AuthorRecRow[] = []
    for (const x of rp) {
      if (!x || typeof x !== 'object') continue
      const r = x as Record<string, unknown>
      const id = typeof r.id === 'string' ? r.id.trim() : ''
      if (!id) continue
      rows.push({
        id,
        version_range:
          typeof r.version_range === 'string' ? r.version_range.trim() : '',
        note: typeof r.note === 'string' ? r.note.trim() : '',
      })
    }
    let suggestedPluginBackendsJson = ''
    if (o.suggested_plugin_backends && typeof o.suggested_plugin_backends === 'object') {
      suggestedPluginBackendsJson =
        JSON.stringify(o.suggested_plugin_backends, null, 2) + '\n'
    }
    const suggestedUi =
      o.suggested_ui && typeof o.suggested_ui === 'object' ? o.suggested_ui : null
    return {
      summary: typeof o.summary === 'string' ? o.summary : '',
      detailMarkdown:
        typeof o.detail_markdown === 'string' ? o.detail_markdown : '',
      rows: rows.length > 0 ? rows : [emptyAuthorRecRow()],
      includeSuggestedUi: suggestedUi !== null,
      suggestedPluginBackendsJson,
      suggestedUi,
    }
  } catch {
    return null
  }
}

export function buildAuthorJsonDisk(args: {
  summary: string
  detailMarkdown: string
  rows: AuthorRecRow[]
  includeSuggestedUi: boolean
  uiConfig: UiConfig
  suggestedPluginBackendsJson: string
  currentRaw?: string
}): string | undefined {
  const summary = args.summary.trim()
  const detail = args.detailMarkdown.trim()
  const recs = args.rows
    .map((r) => ({
      id: r.id.trim(),
      version_range: r.version_range.trim(),
      note: r.note.trim(),
    }))
    .filter((r) => r.id.length > 0)

  let backendsObj: unknown
  const beRaw = args.suggestedPluginBackendsJson.trim()
  if (beRaw) {
    try {
      backendsObj = JSON.parse(beRaw) as unknown
    } catch {
      backendsObj = undefined
    }
  }

  const hasRec = recs.length > 0
  const hasBack = backendsObj !== undefined
  if (!summary && !detail && !hasRec && !args.includeSuggestedUi && !hasBack && !args.currentRaw?.trim()) {
    return undefined
  }

  let preserved: Record<string, unknown> = {}
  try {
    const value = JSON.parse(args.currentRaw ?? '') as unknown
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      preserved = value as Record<string, unknown>
    }
  } catch {
    /* invalid source falls back to editor-managed fields */
  }
  const obj: Record<string, unknown> = {
    ...preserved,
    schema_version: 1,
    summary,
    detail_markdown: detail,
    recommended_plugins: recs.map((r) => {
      const e: Record<string, unknown> = { id: r.id }
      if (r.version_range) e.version_range = r.version_range
      if (r.note) e.note = r.note
      return e
    }),
  }

  if (args.includeSuggestedUi) {
    try {
      obj.suggested_ui = JSON.parse(serializeUiConfig(args.uiConfig)) as unknown
    } catch {
      /* skip */
    }
  } else {
    delete obj.suggested_ui
  }
  if (hasBack) {
    obj.suggested_plugin_backends = backendsObj
  } else {
    delete obj.suggested_plugin_backends
  }

  return JSON.stringify(obj, null, 2) + '\n'
}
