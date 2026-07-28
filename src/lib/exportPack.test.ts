import { describe, expect, it } from 'vitest'
import { PIPELINE_BLUEPRINT_FILENAME, REPLY_QUALITY_ANCHOR_REL_PATH } from './blueprintV2'
import { buildRolePackFiles, buildRolePackZipBlob } from './exportPack'

const baseManifest = {
  id: 'x',
  name: 'N',
  scenes: ['home'],
  user_relations: { f: { favor_multiplier: 1, initial_favorability: 40 } },
  default_relation: 'f',
}

describe('buildRolePackFiles', () => {
  it('writes pipeline.ocblueprint with meta.id aligned to folder name', () => {
    const manifest = { ...baseManifest, id: 'ignored' }
    const files = buildRolePackFiles('myrole', manifest, { schema_version: 1 })
    expect(files.has('myrole/manifest.json')).toBe(false)
    expect(files.has('myrole/settings.json')).toBe(false)
    const bpRaw = files.get(`myrole/${PIPELINE_BLUEPRINT_FILENAME}`)
    expect(bpRaw).toBeDefined()
    expect(files.get('myrole/core_personality.txt')).toBeDefined()
    const parsed = JSON.parse(bpRaw!) as { meta: { id: string } }
    expect(parsed.meta.id).toBe('myrole')
  })

  it('includes scene placeholders for each manifest scene', () => {
    const manifest = { ...baseManifest, scenes: ['a', 'b'] }
    const files = buildRolePackFiles('x', manifest, { schema_version: 1 })
    expect(files.has('x/scenes/a/scene.json')).toBe(true)
    expect(files.has('x/scenes/b/description.txt')).toBe(true)
  })

  it('writes creator_message.txt when creatorMessage extra is set', () => {
    const files = buildRolePackFiles('x', baseManifest, { schema_version: 1 }, {
      creatorMessage: 'hello world',
    })
    expect(files.get('x/creator_message.txt')).toBe('hello world\n')
  })

  it('writes author.json when authorJson extra is set', () => {
    const body = '{"schema_version":1,"summary":"hi"}\n'
    const files = buildRolePackFiles('x', baseManifest, { schema_version: 1 }, {
      authorJson: body,
    })
    expect(files.get('x/author.json')).toBe(body)
  })

  it('blueprint meta may include creator_message_to_downloader', () => {
    const manifest = {
      ...baseManifest,
      creator_message_to_downloader: '感谢游玩',
    }
    const files = buildRolePackFiles('x', manifest, { schema_version: 1 })
    const bp = JSON.parse(files.get(`x/${PIPELINE_BLUEPRINT_FILENAME}`)!) as {
      meta: { creator_message_to_downloader?: string }
    }
    expect(bp.meta.creator_message_to_downloader).toBe('感谢游玩')
  })

  it('writes reply quality anchor to prompts path and meta.reply_quality_anchor', () => {
    const files = buildRolePackFiles(
      'x',
      baseManifest,
      { schema_version: 1, reply_quality_anchor: 'anchor text' },
      { replyQualityAnchorMarkdown: 'anchor text' },
    )
    expect(files.get(`x/${REPLY_QUALITY_ANCHOR_REL_PATH}`)).toBe('anchor text\n')
    const bp = JSON.parse(files.get(`x/${PIPELINE_BLUEPRINT_FILENAME}`)!) as {
      meta: { reply_quality_anchor?: string }
    }
    expect(bp.meta.reply_quality_anchor).toBe('anchor text')
  })

  it('writes config.json when extra is set', () => {
    const body = '{"reply_post_processor":{"enabled":false}}\n'
    const files = buildRolePackFiles('x', baseManifest, { schema_version: 1 }, {
      configJson: body,
    })
    expect(files.get('x/config.json')).toBe(body)
  })

  it('writes user_identities/index.json when extra is set', () => {
    const body =
      '{"schema_version":1,"default_identity_id":"friend","identities":{"friend":{"display_name":"好友","template_file":"friend.md"}}}\n'
    const files = buildRolePackFiles('x', baseManifest, { schema_version: 1 }, {
      userIdentitiesIndexJson: body,
    })
    expect(files.get('x/user_identities/index.json')).toBe(body)
  })

  it('writes memory seed and user identity templates independently', () => {
    const memory = '{"schema_version":1,"memories":[],"extensions":{}}\n'
    const files = buildRolePackFiles('x', baseManifest, { schema_version: 1 }, {
      memorySeedJson: memory,
      userIdentityFiles: [
        { path: 'user_identities/friend.md', content: '# 好友\n自然相处。' },
        { path: '../escape.md', content: 'must not escape' },
      ],
    })
    expect(files.get('x/memory_seed.json')).toBe(memory)
    expect(files.get('x/user_identities/friend.md')).toBe('# 好友\n自然相处。\n')
    expect(files.has('x/../escape.md')).toBe(false)
  })

  it('preserves blueprint extensions supplied by an imported pack', () => {
    const files = buildRolePackFiles('x', baseManifest, { schema_version: 1 }, {
      preservedBlueprintFields: {
        includes: [
          {
            path: 'blueprint/includes/personality.json',
            target: 'meta.personality',
            mode: 'replace',
          },
        ],
        runtime_config: { interaction_mode: 'pure_chat' },
      },
    })
    const blueprint = JSON.parse(files.get(`x/${PIPELINE_BLUEPRINT_FILENAME}`)!)
    expect(blueprint.includes).toEqual([
      {
        path: 'blueprint/includes/personality.json',
        target: 'meta.personality',
        mode: 'replace',
      },
    ])
    expect(blueprint.runtime_config).toEqual({ interaction_mode: 'pure_chat' })
  })

  it('preserves multi-instance slots and unknown meta fields when rebuilding', () => {
    const files = buildRolePackFiles('x', baseManifest, { schema_version: 1 }, {
      preservedBlueprintFields: {
        meta: { custom_creator_field: { source: 'main-app' }, name: 'old name' },
        slot_registry: {
          memory_long: { type: 'memory', label: 'Long memory', backend: 'builtin', position: 0 },
          memory_short: { type: 'memory', label: 'Short memory', backend: 'builtin', position: 1 },
          llm_local: { type: 'llm', label: 'Local', backend: 'ollama', position: 0, model: 'qwen' },
          llm_remote: { type: 'llm', label: 'Remote', backend: 'remote', position: 1, url: 'https://llm.invalid' },
        },
      },
    })
    const blueprint = JSON.parse(files.get('x/pipeline.ocblueprint')!)
    expect(blueprint.meta.custom_creator_field).toEqual({ source: 'main-app' })
    expect(Object.keys(blueprint.slot_registry)).toEqual(
      expect.arrayContaining(['memory_long', 'memory_short', 'llm_local', 'llm_remote']),
    )
    expect(Object.keys(blueprint.slot_registry)).toHaveLength(9)
    expect(blueprint.slot_registry.llm_local.model).toBe('qwen')
    expect(blueprint.slot_registry.llm_remote.url).toBe('https://llm.invalid')
  })

  it('roundtrips safe preserved files into zip export', async () => {
    const blob = await buildRolePackZipBlob('x', baseManifest, { schema_version: 1 }, {
      preservedFiles: [
        {
          relPath: 'voice_profile.json',
          file: new File(['{"schema_version":1}'], 'voice_profile.json'),
        },
        {
          relPath: '../escape.txt',
          file: new File(['escape'], 'escape.txt'),
        },
        {
          relPath: 'core_personality.txt',
          file: new File(['must not overwrite'], 'core_personality.txt'),
        },
      ],
    })
    const zip = await (await import('jszip')).default.loadAsync(blob)
    expect(await zip.file('x/voice_profile.json')?.async('string')).toBe('{"schema_version":1}')
    expect(zip.file('escape.txt')).toBeNull()
    expect(await zip.file('x/core_personality.txt')?.async('string')).not.toBe('must not overwrite')
  })

  it('writes featured and preset_order into blueprint meta', () => {
    const manifest = { ...baseManifest, featured: true, preset_order: 3 }
    const files = buildRolePackFiles('x', manifest, { schema_version: 1 })
    const bp = JSON.parse(files.get(`x/${PIPELINE_BLUEPRINT_FILENAME}`)!) as {
      meta: { featured?: boolean; preset_order?: number }
    }
    expect(bp.meta.featured).toBe(true)
    expect(bp.meta.preset_order).toBe(3)
  })

  it('writes user scene content from sceneEditorEntries extra', () => {
    const files = buildRolePackFiles('x', baseManifest, { schema_version: 1 }, {
      sceneEditorEntries: [
        {
          sceneId: 'home',
          displayName: '家',
          activitySetting: '18:00-23:00 在家',
          scenePrompt: '语气放松',
        },
      ],
    })
    const sceneJson = JSON.parse(files.get('x/scenes/home/scene.json')!) as {
      name: string
      activity_setting: string
      time_windows: Array<{ start: string; end: string }>
    }
    expect(sceneJson.name).toBe('家')
    expect(sceneJson.activity_setting).toContain('18:00')
    expect(sceneJson.time_windows[0]).toEqual({ start: '18:00', end: '23:00' })
    expect(files.get('x/scenes/home/description.txt')).toBe('语气放松\n')
  })
})
