import { describe, expect, it } from 'vitest'
import {
  buildBlueprintFromLegacy,
  buildBlueprintV2FromLegacy,
  blueprintToLegacyParts,
  minimalBlueprintJsonForRole,
  parseBlueprintV2Json,
  pluginBackendsToSlotRegistry,
  serializeBlueprintV2,
  validateBlueprintV2Typescript,
} from './blueprintV2'

describe('buildBlueprintV2FromLegacy', () => {
  it('maps manifest and settings into v2 meta + slot_registry', () => {
    const manifest = {
      id: 'hero',
      name: 'Hero',
      version: '1.0.0',
      scenes: ['home'],
      user_relations: { f: { favor_multiplier: 1, initial_favorability: 40 } },
      default_relation: 'f',
      creator_message_to_downloader: 'thanks',
    }
    const settings = {
      schema_version: 1,
      model: 'qwen2.5:7b',
      plugin_backends: { llm: 'remote', memory: 'builtin' },
    }
    const bp = buildBlueprintV2FromLegacy(manifest, settings)
    expect(bp.schema_version).toBe(2)
    expect(bp.meta.id).toBe('hero')
    expect(bp.meta.creator_message_to_downloader).toBe('thanks')
    expect(bp.meta.ollama_model).toBe('qwen2.5:7b')
    const llm = Object.values(bp.slot_registry).find((s) => s.type === 'llm')
    expect(llm?.backend).toBe('remote')
  })
})

describe('blueprint roundtrip', () => {
  it('preserves core fields through legacy parts', () => {
    const manifest = {
      id: 'x',
      name: 'N',
      scenes: ['a'],
      user_relations: { f: { favor_multiplier: 1, initial_favorability: 40 } },
      default_relation: 'f',
    }
    const settings = { schema_version: 1, plugin_backends: { llm: 'ollama' } }
    const bp = buildBlueprintV2FromLegacy(manifest, settings)
    const { manifest: m2, settings: s2 } = blueprintToLegacyParts(bp)
    expect(m2.id).toBe('x')
    expect(m2.scenes).toEqual(['a'])
    expect((s2.plugin_backends as { llm?: string }).llm).toBe('ollama')
  })

  it('omits model from legacy settings when blueprint has no ollama_model', () => {
    const manifest = {
      id: 'x',
      name: 'N',
      scenes: ['a'],
      user_relations: { f: { favor_multiplier: 1, initial_favorability: 40 } },
      default_relation: 'f',
    }
    const settings = { schema_version: 1, plugin_backends: { llm: 'ollama' } }
    const bp = buildBlueprintV2FromLegacy(manifest, settings)
    const { settings: s2 } = blueprintToLegacyParts(bp)
    expect(s2.model).toBeUndefined()
    expect(bp.meta.ollama_model).toBeUndefined()
  })

  it('blocks v3 blueprints instead of silently downgrading them', () => {
    expect(() => parseBlueprintV2Json('{"schema_version":3,"meta":{},"slot_registry":{}}')).toThrow(
      /v3 \/ dual-core/,
    )
  })

  it('accepts Stable v4 blueprints', () => {
    expect(parseBlueprintV2Json(minimalBlueprintJsonForRole('hero')).schema_version).toBe(4)
  })
})

describe('parseBlueprintV2Json', () => {
  it('rejects wrong schema_version', () => {
    expect(() => parseBlueprintV2Json('{"schema_version":1}')).toThrow(/schema_version/)
  })
})

describe('validateBlueprintV2Typescript', () => {
  it('requires meta.id and llm slot', () => {
    const bp = {
      schema_version: 2 as const,
      meta: {},
      slot_registry: pluginBackendsToSlotRegistry({}),
    }
    const errs = validateBlueprintV2Typescript(bp)
    expect(errs.some((e) => e.includes('meta.id'))).toBe(true)
  })

  it('rejects fields and backends outside the public v2 contract', () => {
    const bp = JSON.parse(minimalBlueprintJsonForRole('hero')) as ReturnType<
      typeof buildBlueprintV2FromLegacy
    >
    ;(bp as unknown as Record<string, unknown>).future_root = true
    ;(bp as unknown as Record<string, unknown>).expert_overlay = 'not-an-object'
    ;(bp.slot_registry.llm as unknown as Record<string, unknown>).policy = 'first'
    bp.slot_registry.llm.backend = 'openai_compatible'

    const errs = validateBlueprintV2Typescript(bp, 'hero')
    expect(errs.some((e) => e.includes('future_root'))).toBe(true)
    expect(errs.some((e) => e.includes('expert_overlay'))).toBe(true)
    expect(errs.some((e) => e.includes('policy'))).toBe(true)
    expect(errs.some((e) => e.includes('openai_compatible'))).toBe(true)
  })

  it('validates include and group structures in the browser fallback', () => {
    const bp = JSON.parse(minimalBlueprintJsonForRole('hero')) as ReturnType<
      typeof buildBlueprintV2FromLegacy
    >
    bp.includes = [
      {
        path: '../outside.json',
        target: 'runtime_config.expert_hints',
        mode: 'merge',
      },
    ]
    bp.groups = {
      llms: {
        label: 'LLMs',
        type: 'llm',
        members: ['missing'],
      },
    }

    const errs = validateBlueprintV2Typescript(bp, 'hero')
    expect(errs.some((e) => e.includes('安全相对路径'))).toBe(true)
    expect(errs.some((e) => e.includes('target'))).toBe(true)
    expect(errs.some((e) => e.includes('引用未知'))).toBe(true)
  })

  it('validates the Stable v4 extension envelope and rejects v3-only fields', () => {
    const bp = JSON.parse(minimalBlueprintJsonForRole('hero')) as ReturnType<
      typeof buildBlueprintFromLegacy
    >
    bp.extensions = {
      live2d: {
        capability: 'Live2D',
        config_schema_version: 0,
        config_ref: '../outside.json',
      },
    }
    bp.runtime_config = {
      ...(bp.runtime_config ?? {}),
      dual_core: { enabled: true },
    }
    const errs = validateBlueprintV2Typescript(bp, 'hero')
    expect(errs.some((e) => e.includes('实例 id'))).toBe(true)
    expect(errs.some((e) => e.includes('capability'))).toBe(true)
    expect(errs.some((e) => e.includes('config_schema_version'))).toBe(true)
    expect(errs.some((e) => e.includes('config_ref'))).toBe(true)
    expect(errs.some((e) => e.includes('dual_core'))).toBe(true)
  })

  it('rejects extension identifiers with outer whitespace', () => {
    const bp = JSON.parse(minimalBlueprintJsonForRole('hero')) as ReturnType<
      typeof buildBlueprintFromLegacy
    >
    bp.extensions = {
      'com.example.live2d': {
        capability: ' com.example.live2d ',
        provider: 'com.example.live2d.runtime ',
        config_schema_version: 1,
        config_ref: 'blueprint/extensions/com.example.live2d/config.json',
      },
    }
    const errors = validateBlueprintV2Typescript(bp, 'hero')
    expect(errors.some((error) => error.includes('capability'))).toBe(true)
    expect(errors.some((error) => error.includes('provider'))).toBe(true)
  })
})

describe('buildBlueprintFromLegacy', () => {
  it('builds Stable v4 with runtime_config as the only runtime-field SSOT', () => {
    const bp = buildBlueprintFromLegacy(
      {
        id: 'hero',
        name: 'Hero',
        version: '1.0.0',
        user_relations: { friend: { favor_multiplier: 1, initial_favorability: 50 } },
        default_relation: 'friend',
      },
      {
        schema_version: 1,
        interaction_mode: 'pure_chat',
        memory_config: { scene_weight_multiplier: 1.2 },
        reply_quality_anchor: 'answer cleanly',
        identity_binding: 'global',
        evolution: { personality_source: 'profile', max_change_per_event: 0.1 },
        model: 'qwen2.5:7b',
        remote_presence: { default_enabled: true },
        autonomous_scene: { enabled: false },
        inference_profile: {
          generation: { temperature: 0.8, maximum_output_tokens: 1536 },
          context: { minimum_tokens: 8192, preferred_tokens: 16384 },
          reasoning: { mode: 'adaptive', effort: 0.65 },
        },
        plugin_backends: { llm: 'ollama' },
      },
    )
    expect(bp.schema_version).toBe(4)
    expect(bp.runtime_config?.interaction_mode).toBe('pure_chat')
    expect(bp.runtime_config?.evolution).toEqual({
      personality_source: 'profile',
      max_change_per_event: 0.1,
    })
    for (const key of [
      'interaction_mode',
      'memory_config',
      'reply_quality_anchor',
      'identity_binding',
      'evolution',
      'remote_presence',
      'autonomous_scene',
      'inference_profile',
    ]) {
      expect(bp.meta[key]).toBeUndefined()
      expect(bp.runtime_config?.[key]).toBeDefined()
    }
    expect(bp.runtime_config?.ollama_model).toBeUndefined()
    expect(bp.runtime_config?.inference_profile).toEqual({
      generation: { temperature: 0.8, maximum_output_tokens: 1536 },
      context: { minimum_tokens: 8192, preferred_tokens: 16384 },
      reasoning: { mode: 'adaptive', effort: 0.65 },
    })
  })

  it('rejects invalid Stable v4 inference profile ranges', () => {
    const bp = buildBlueprintFromLegacy(
      { id: 'hero', name: 'Hero', version: '1.0.0' },
      {
        inference_profile: {
          generation: {
            temperature: 2.5,
            preferred_output_tokens: 2048,
            maximum_output_tokens: 1024,
          },
          context: { minimum_tokens: 32768, preferred_tokens: 8192 },
        },
        plugin_backends: { llm: 'ollama' },
      },
    )
    const errors = validateBlueprintV2Typescript(bp, 'hero')
    expect(errors.some((error) => error.includes('temperature'))).toBe(true)
    expect(errors.some((error) => error.includes('preferred_output_tokens'))).toBe(true)
    expect(errors.some((error) => error.includes('minimum_tokens'))).toBe(true)
  })

  it('keeps Stable v4 creator output free of host model and LLM-route choices', () => {
    const bp = buildBlueprintFromLegacy(
      { id: 'hero', name: 'Hero', ollama_model: 'manifest-model' },
      {
        model: 'settings-model',
        ollama_model: 'settings-ollama-model',
        plugin_backends: {
          llm: 'remote',
          directory_plugins: { llm: 'com.example.private-llm', memory: 'com.example.memory' },
        },
      },
    )

    expect(bp.runtime_config?.ollama_model).toBeUndefined()
    expect(bp.meta.ollama_model).toBeUndefined()
    expect(bp.slot_registry.llm.backend).toBe('ollama')
    expect(bp.slot_registry.llm.plugin).toBeNull()
    expect(bp.slot_registry.memory.plugin).toBe('com.example.memory')
  })

  it('does not expose imported host model and LLM route in the creator view', () => {
    const imported = buildBlueprintV2FromLegacy(
      { id: 'hero', name: 'Hero' },
      { model: 'private-model', plugin_backends: { llm: 'remote' } },
    )
    const { manifest, settings } = blueprintToLegacyParts(imported)

    expect(manifest.ollama_model).toBeUndefined()
    expect(settings.ollama_model).toBeUndefined()
    expect(settings.model).toBeUndefined()
    expect((settings.plugin_backends as { llm?: string }).llm).toBe('ollama')
  })

  it('keeps legacy runtime fields in meta for explicit v2 output', () => {
    const bp = buildBlueprintV2FromLegacy(
      {
        id: 'hero',
        name: 'Hero',
        version: '1.0.0',
        user_relations: { friend: { favor_multiplier: 1, initial_favorability: 50 } },
        default_relation: 'friend',
      },
      {
        interaction_mode: 'pure_chat',
        evolution: { personality_source: 'profile' },
        model: 'qwen2.5:7b',
        plugin_backends: { llm: 'ollama' },
      },
    )
    expect(bp.schema_version).toBe(2)
    expect(bp.runtime_config).toBeUndefined()
    expect(bp.meta.interaction_mode).toBe('pure_chat')
    expect(bp.meta.evolution).toEqual({ personality_source: 'profile' })
    expect(bp.meta.ollama_model).toBe('qwen2.5:7b')
  })
})
