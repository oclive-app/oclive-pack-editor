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
})

describe('buildBlueprintFromLegacy', () => {
  it('builds Stable v4 and activates runtime_config by default', () => {
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
        plugin_backends: { llm: 'ollama' },
      },
    )
    expect(bp.schema_version).toBe(4)
    expect(bp.runtime_config?.interaction_mode).toBe('pure_chat')
  })
})
