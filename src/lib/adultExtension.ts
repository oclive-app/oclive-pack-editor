export const ADULT_EXTENSION_FILENAME = 'adult_extension.json'
export const ADULT_EXTENSION_SCHEMA_VERSION = 1

export type AdultPacingMode = 'creator' | 'ai'

export interface AdultSceneDirection {
  direction: string
  action_flow: string
  dialogue_guidance: string
}

export interface AdultExtensionDocument {
  schema_version: 1
  character_is_adult: boolean
  persona: string
  dialogue_guidance: string
  pacing: {
    mode: AdultPacingMode
    suggested_interval_ms: number
  }
  scenes: Record<string, AdultSceneDirection>
}

export function defaultAdultExtension(): AdultExtensionDocument {
  return {
    schema_version: ADULT_EXTENSION_SCHEMA_VERSION,
    character_is_adult: false,
    persona: '',
    dialogue_guidance: '',
    pacing: {
      mode: 'creator',
      suggested_interval_ms: 4_000,
    },
    scenes: {},
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export function parseAdultExtension(raw: string | undefined): AdultExtensionDocument {
  if (!raw?.trim())
    return defaultAdultExtension()
  const source = asRecord(JSON.parse(raw))
  const pacing = asRecord(source.pacing)
  const scenesRaw = asRecord(source.scenes)
  const scenes: Record<string, AdultSceneDirection> = {}
  for (const [sceneId, value] of Object.entries(scenesRaw)) {
    const scene = asRecord(value)
    scenes[sceneId] = {
      direction: typeof scene.direction === 'string' ? scene.direction : '',
      action_flow: typeof scene.action_flow === 'string' ? scene.action_flow : '',
      dialogue_guidance: typeof scene.dialogue_guidance === 'string'
        ? scene.dialogue_guidance
        : '',
    }
  }
  return {
    schema_version: ADULT_EXTENSION_SCHEMA_VERSION,
    character_is_adult: source.character_is_adult === true,
    persona: typeof source.persona === 'string' ? source.persona : '',
    dialogue_guidance: typeof source.dialogue_guidance === 'string'
      ? source.dialogue_guidance
      : '',
    pacing: {
      mode: pacing.mode === 'ai' ? 'ai' : 'creator',
      suggested_interval_ms:
        Number.isSafeInteger(pacing.suggested_interval_ms)
        && Number(pacing.suggested_interval_ms) > 0
          ? Number(pacing.suggested_interval_ms)
          : 4_000,
    },
    scenes,
  }
}

export function serializeAdultExtension(document: AdultExtensionDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`
}

export function validateAdultExtension(
  raw: string,
  sceneIds: string[],
): string[] {
  if (!raw.trim())
    return []
  let document: AdultExtensionDocument
  try {
    document = parseAdultExtension(raw)
  }
  catch (error) {
    return [`adult_extension.json 不是合法 JSON：${error instanceof Error ? error.message : String(error)}`]
  }
  const errors: string[] = []
  if (!document.character_is_adult)
    errors.push('adult_extension.json：必须确认角色为成年人。')
  if (!Number.isSafeInteger(document.pacing.suggested_interval_ms)
    || document.pacing.suggested_interval_ms <= 0) {
    errors.push('adult_extension.json：建议节拍间隔必须是正整数。')
  }
  for (const sceneId of Object.keys(document.scenes)) {
    if (!sceneIds.includes(sceneId))
      errors.push(`adult_extension.json：场景 ${sceneId} 不在基础角色包中。`)
  }
  return errors
}

export function syncAdultScenes(
  document: AdultExtensionDocument,
  sceneIds: string[],
): AdultExtensionDocument {
  const scenes: Record<string, AdultSceneDirection> = {}
  for (const id of sceneIds) {
    scenes[id] = document.scenes[id] ?? {
      direction: '',
      action_flow: '',
      dialogue_guidance: '',
    }
  }
  return { ...document, scenes }
}
