import { describe, expect, it } from 'vitest'
import { NEW_PACK_PRESET_IDS, buildNewPackPreset } from './newPackPresets'
import { validateRolePackTypescript } from './rolePackEditorValidate'

describe('new pack presets', () => {
  it.each(NEW_PACK_PRESET_IDS)('%s produces a valid role-pack starting point', (presetId) => {
    const preset = buildNewPackPreset(presetId)
    const manifest = JSON.parse(preset.manifestText) as { scenes?: string[] }
    const sceneIds = preset.sceneEditorEntries.map((entry) => entry.sceneId)

    expect(validateRolePackTypescript(
      preset.manifestText,
      preset.settingsText,
      manifest.scenes ?? sceneIds,
      '0.5.0',
    )).toEqual([])
    expect(new Set(sceneIds).size).toBe(sceneIds.length)
  })

  it('returns fresh objects for every build', () => {
    const first = buildNewPackPreset('story')
    first.sceneEditorEntries[0]!.displayName = 'changed'
    expect(buildNewPackPreset('story').sceneEditorEntries[0]!.displayName).toBe('初次登场')
  })
})
