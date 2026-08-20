/** 用户侧场景编辑：每场景两问 → scenes/{id}/scene.json + description.txt */

export type SceneEditorEntry = {
  sceneId: string
  displayName: string
  /** 日常 / 活动时间（可含 HH:MM-HH:MM，导出为 time_windows） */
  activitySetting: string
  /** 角色在此场景的特别 prompt → description.txt */
  scenePrompt: string
  /** 进入场景时优先显示的开场白 → scene.json welcome_message */
  welcomeMessage?: string
  /** 没有固定开场白时可选的候选独白 → scene.json monologues */
  monologues?: string[]
}

export type SceneTimeWindow = { start: string; end: string }

const PLACEHOLDER_DESC = '（编写器占位：请替换为场景叙事与设定。）'

export function emptySceneEntry(sceneId: string): SceneEditorEntry {
  const id = sceneId.trim() || 'home'
  return {
    sceneId: id,
    displayName: id,
    activitySetting: '',
    scenePrompt: '',
    welcomeMessage: '',
    monologues: [],
  }
}

export function normalizeSceneId(raw: string): string {
  return raw.trim().replace(/\s+/g, '_').toLowerCase()
}

export function parseSceneIdList(csvOrArray: string | string[]): string[] {
  const parts = Array.isArray(csvOrArray)
    ? csvOrArray
    : csvOrArray.split(/[,，]/).map((s) => s.trim())
  const out: string[] = []
  const seen = new Set<string>()
  for (const p of parts) {
    const id = normalizeSceneId(p)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function padTime(h: number, m: number): string | null {
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseClock(token: string): string | null {
  const m = token.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return padTime(Number(m[1]), Number(m[2]))
}

/** 从白话活动时间文案中提取 24h 时间窗（供 scene.json time_windows）。 */
export function parseTimeWindowsFromActivity(text: string): SceneTimeWindow[] {
  const windows: SceneTimeWindow[] = []
  const re =
    /(\d{1,2}:\d{2})\s*(?:[-–—~～]|到|至|~)\s*(\d{1,2}:\d{2})/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const start = parseClock(match[1]!)
    const end = parseClock(match[2]!)
    if (start && end) windows.push({ start, end })
  }
  return windows
}

export function formatTimeWindowsHint(windows: SceneTimeWindow[]): string {
  if (!windows.length) return ''
  return windows.map((w) => `${w.start}-${w.end}`).join('；')
}

export function buildSceneJson(entry: SceneEditorEntry): string {
  const name = entry.displayName.trim() || entry.sceneId
  const body: Record<string, unknown> = { name }
  const welcomeMessage = entry.welcomeMessage?.trim()
  if (welcomeMessage) body.welcome_message = welcomeMessage
  const monologues = (entry.monologues ?? []).map((item) => item.trim()).filter(Boolean)
  if (monologues.length) body.monologues = monologues
  const activity = entry.activitySetting.trim()
  if (activity) body.activity_setting = activity
  const windows = parseTimeWindowsFromActivity(activity)
  if (windows.length) body.time_windows = windows
  return `${JSON.stringify(body, null, 2)}\n`
}

export function buildSceneDescription(entry: SceneEditorEntry): string {
  const prompt = entry.scenePrompt.trim()
  if (prompt) return `${prompt}\n`
  return `${PLACEHOLDER_DESC}\n`
}

export function parseSceneFromDisk(
  sceneId: string,
  sceneJsonRaw: string,
  descriptionRaw: string,
): SceneEditorEntry {
  const entry = emptySceneEntry(sceneId)
  const desc = descriptionRaw.replace(/\r\n/g, '\n').trim()
  if (desc && desc !== PLACEHOLDER_DESC.trim()) {
    entry.scenePrompt = desc
  }
  const raw = sceneJsonRaw.trim()
  if (!raw) return entry
  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    if (typeof j.name === 'string' && j.name.trim()) {
      entry.displayName = j.name.trim()
    }
    if (typeof j.activity_setting === 'string' && j.activity_setting.trim()) {
      entry.activitySetting = j.activity_setting.trim()
    } else if (Array.isArray(j.time_windows) && j.time_windows.length) {
      const windows: SceneTimeWindow[] = []
      for (const item of j.time_windows) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, unknown>
        const start = typeof o.start === 'string' ? parseClock(o.start) : null
        const end = typeof o.end === 'string' ? parseClock(o.end) : null
        if (start && end) windows.push({ start, end })
      }
      const hint = formatTimeWindowsHint(windows)
      if (hint && !entry.activitySetting) entry.activitySetting = hint
    }
    if (typeof j.welcome_message === 'string') {
      entry.welcomeMessage = j.welcome_message.trim()
    }
    if (Array.isArray(j.monologues)) {
      entry.monologues = j.monologues.map(String).map((item) => item.trim()).filter(Boolean)
    }
  } catch {
    /* ignore malformed scene.json */
  }
  return entry
}

export function mergeSceneEntriesForIds(
  sceneIds: string[],
  existing: SceneEditorEntry[],
): SceneEditorEntry[] {
  const byId = new Map(existing.map((e) => [normalizeSceneId(e.sceneId), e]))
  const ids = sceneIds.length ? sceneIds : ['home']
  return ids.map((id) => {
    const key = normalizeSceneId(id)
    const prev = byId.get(key)
    if (prev) return { ...prev, sceneId: key }
    return emptySceneEntry(key)
  })
}

export function sceneEntriesToIdList(entries: SceneEditorEntry[]): string[] {
  return entries.map((e) => normalizeSceneId(e.sceneId)).filter(Boolean)
}

export function sceneEditorHasContent(entries: SceneEditorEntry[]): boolean {
  return entries.some(
    (e) =>
      e.activitySetting.trim() ||
      e.scenePrompt.trim() ||
      Boolean(e.welcomeMessage?.trim()) ||
      Boolean(e.monologues?.some((item) => item.trim())) ||
      (e.displayName.trim() && e.displayName.trim() !== e.sceneId),
  )
}

export function isSceneDescriptionPlaceholder(text: string): boolean {
  return text.replace(/\r\n/g, '\n').trim() === PLACEHOLDER_DESC.trim()
}
