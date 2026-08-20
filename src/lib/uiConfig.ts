import { defaultUiConfig, type SlotConfig, type UiConfig } from '../types/uiConfig'

type DiskSlotKey =
  | 'chat_toolbar'
  | 'settings.panel'
  | 'role.detail'
  | 'sidebar'
  | 'chat.header'
  | 'settings.plugins'
  | 'settings.advanced'
  | 'overlay.floating'
  | 'launcher.palette'
  | 'debug.dock'

type DiskUiJson = {
  shell?: string
  theme?: {
    primaryColor?: string
    backgroundColor?: string
    fontFamily?: string
  }
  layout?: {
    sidebar?: string
    chatInput?: string
  }
  slots?: Partial<Record<DiskSlotKey, Partial<SlotConfig> | undefined>>
}

function normalizeSlot(s: Partial<SlotConfig> | undefined): SlotConfig {
  const order = Array.isArray(s?.order)
    ? s!.order!.map((x) => String(x).trim()).filter(Boolean)
    : []
  const orderSet = new Set(order)
  const visible = Array.isArray(s?.visible)
    ? s!.visible!.map((x) => String(x).trim()).filter((id) => orderSet.has(id))
    : []
  const appearance: Record<string, string> = {}
  const rawApp = (s as { appearance?: unknown } | undefined)?.appearance
  if (rawApp && typeof rawApp === 'object' && rawApp !== null) {
    for (const [k, v] of Object.entries(rawApp)) {
      const pid = k.trim()
      const aid = String(v ?? '').trim()
      if (pid && aid) {
        appearance[pid] = aid
      }
    }
  }
  const out: SlotConfig = { order, visible }
  if (Object.keys(appearance).length > 0) {
    out.appearance = appearance
  }
  return out
}

function normalizeTheme(
  t: DiskUiJson['theme'] | undefined,
): UiConfig['theme'] {
  const d = defaultUiConfig().theme
  if (!t || typeof t !== 'object') return d
  return {
    primaryColor: typeof t.primaryColor === 'string' ? t.primaryColor : d.primaryColor,
    backgroundColor:
      typeof t.backgroundColor === 'string' ? t.backgroundColor : d.backgroundColor,
    fontFamily: typeof t.fontFamily === 'string' ? t.fontFamily : d.fontFamily,
  }
}

function normalizeLayout(
  l: DiskUiJson['layout'] | undefined,
): UiConfig['layout'] {
  const d = defaultUiConfig().layout
  if (!l || typeof l !== 'object') return d
  return {
    sidebar: typeof l.sidebar === 'string' ? l.sidebar : d.sidebar,
    chatInput: typeof l.chatInput === 'string' ? l.chatInput : d.chatInput,
  }
}

/** 解析 `ui.json` 文本；非法时返回默认空配置。 */
export function parseUiConfigJson(raw: string): UiConfig {
  try {
    const v = JSON.parse(raw) as DiskUiJson
    const slots = v.slots ?? {}
    return {
      shell: typeof v.shell === 'string' ? v.shell : '',
      theme: normalizeTheme(v.theme),
      layout: normalizeLayout(v.layout),
      slots: {
        chat_toolbar: normalizeSlot(slots.chat_toolbar),
        settings_panel: normalizeSlot(slots['settings.panel']),
        role_detail: normalizeSlot(slots['role.detail']),
        sidebar: normalizeSlot(slots.sidebar),
        chat_header: normalizeSlot(slots['chat.header']),
        settings_plugins: normalizeSlot(slots['settings.plugins']),
        settings_advanced: normalizeSlot(slots['settings.advanced']),
        overlay_floating: normalizeSlot(slots['overlay.floating']),
        launcher_palette: normalizeSlot(slots['launcher.palette']),
        debug_dock: normalizeSlot(slots['debug.dock']),
      },
    }
  } catch {
    return defaultUiConfig()
  }
}

function slotToDisk(sc: SlotConfig): Record<string, unknown> {
  const o: Record<string, unknown> = {
    order: [...sc.order],
    visible: [...sc.visible],
  }
  if (sc.appearance && Object.keys(sc.appearance).length > 0) {
    o.appearance = { ...sc.appearance }
  }
  return o
}

/** 序列化为磁盘 `ui.json`（点号键）。 */
export function serializeUiConfig(c: UiConfig): string {
  const disk: DiskUiJson = {
    shell: c.shell ?? '',
    theme: {
      primaryColor: c.theme?.primaryColor ?? '',
      backgroundColor: c.theme?.backgroundColor ?? '',
      fontFamily: c.theme?.fontFamily ?? '',
    },
    layout: {
      sidebar: c.layout?.sidebar ?? '',
      chatInput: c.layout?.chatInput ?? '',
    },
    slots: {
      chat_toolbar: slotToDisk(c.slots.chat_toolbar) as Partial<SlotConfig>,
      'settings.panel': slotToDisk(c.slots.settings_panel) as Partial<SlotConfig>,
      'role.detail': slotToDisk(c.slots.role_detail) as Partial<SlotConfig>,
      sidebar: slotToDisk(c.slots.sidebar) as Partial<SlotConfig>,
      'chat.header': slotToDisk(c.slots.chat_header) as Partial<SlotConfig>,
      'settings.plugins': slotToDisk(c.slots.settings_plugins) as Partial<SlotConfig>,
      'settings.advanced': slotToDisk(c.slots.settings_advanced) as Partial<SlotConfig>,
      'overlay.floating': slotToDisk(c.slots.overlay_floating) as Partial<SlotConfig>,
      'launcher.palette': slotToDisk(c.slots.launcher_palette) as Partial<SlotConfig>,
      'debug.dock': slotToDisk(c.slots.debug_dock) as Partial<SlotConfig>,
    },
  }
  return JSON.stringify(disk, null, 2) + '\n'
}

/** Serialize editor-managed UI fields while preserving unknown future keys. */
export function mergeUiConfigJson(currentRaw: string, config: UiConfig): string {
  let current: Record<string, unknown> = {}
  try {
    const value = JSON.parse(currentRaw) as unknown
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      current = { ...(value as Record<string, unknown>) }
    }
  } catch {
    /* invalid source falls back to the editor-managed shape */
  }
  const managed = JSON.parse(serializeUiConfig(config)) as Record<string, unknown>
  const mergeObject = (left: unknown, right: unknown): Record<string, unknown> => ({
    ...(left && typeof left === 'object' && !Array.isArray(left)
      ? (left as Record<string, unknown>)
      : {}),
    ...(right as Record<string, unknown>),
  })
  const currentSlots = mergeObject({}, current.slots)
  const managedSlots = mergeObject({}, managed.slots)
  const slots: Record<string, unknown> = { ...currentSlots }
  for (const [key, value] of Object.entries(managedSlots)) {
    slots[key] = mergeObject(currentSlots[key], value)
  }
  return `${JSON.stringify({
    ...current,
    shell: managed.shell,
    theme: mergeObject(current.theme, managed.theme),
    layout: mergeObject(current.layout, managed.layout),
    slots,
  }, null, 2)}\n`
}
