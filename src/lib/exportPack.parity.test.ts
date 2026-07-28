import { describe, expect, it } from 'vitest'
import { PIPELINE_BLUEPRINT_FILENAME } from './blueprintV2'
import { buildRolePackFiles } from './exportPack'

const baseManifest = {
  id: 'parity_role',
  name: 'Parity',
  scenes: ['home'],
  featured: true,
  preset_order: 4,
  user_relations: { f: { favor_multiplier: 1, initial_favorability: 40 } },
  default_relation: 'f',
}

describe('buildRolePackFiles export parity', () => {
  it('produces a host-loadable Stable v4 file set with an anchor mirror', () => {
    const config = '{"reply_post_processor":{"enabled":false}}\n'
    const uiIndex =
      '{"schema_version":1,"default_identity_id":"f","identities":{"f":{"display_name":"F","template_file":"f.md"}}}\n'
    const files = buildRolePackFiles(
      'parity_role',
      baseManifest,
      {
        schema_version: 1,
        interaction_mode: 'pure_chat',
        reply_quality_anchor: 'pack anchor',
        plugin_backends: { llm: 'ollama' },
      },
      {
        corePersonality: '人设正文',
        configJson: config,
        userIdentitiesIndexJson: uiIndex,
        replyQualityAnchorMarkdown: 'pack anchor',
      },
    )

    expect(files.has('parity_role/manifest.json')).toBe(false)
    expect(files.has('parity_role/settings.json')).toBe(false)
    expect(files.get('parity_role/core_personality.txt')).toContain('人设正文')
    expect(files.get('parity_role/config.json')).toBe(config)
    expect(files.get('parity_role/user_identities/index.json')).toBe(uiIndex)
    expect(files.get('parity_role/prompts/reply_quality_anchor.md')).toBe('pack anchor\n')
    expect(files.has('parity_role/scenes/home/scene.json')).toBe(true)

    const bp = JSON.parse(files.get(`parity_role/${PIPELINE_BLUEPRINT_FILENAME}`)!) as {
      meta: {
        id: string
        featured?: boolean
        preset_order?: number
      }
      runtime_config?: {
        reply_quality_anchor?: string
        interaction_mode?: string
      }
      slot_registry: Record<string, unknown>
    }
    expect(bp.meta.id).toBe('parity_role')
    expect(bp.meta.featured).toBe(true)
    expect(bp.meta.preset_order).toBe(4)
    expect(bp.runtime_config?.reply_quality_anchor).toBe('pack anchor')
    expect(bp.runtime_config?.interaction_mode).toBe('pure_chat')
    expect(Object.keys(bp.slot_registry).length).toBeGreaterThan(0)
  })
})
