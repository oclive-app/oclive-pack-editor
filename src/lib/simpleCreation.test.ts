import { describe, expect, it } from 'vitest'
import {
  applySimpleManifestToJson,
  applySimpleSettingsToJson,
  countUserRelationKeys,
  defaultSimpleManifestForm,
  defaultSimpleSettingsForm,
  knowledgeFromPackRecords,
  manifestRecordToSimpleForm,
  normalizeKnowledgeGlob,
  settingsRecordToSimpleForm,
} from './simpleCreation'

describe('simpleCreation', () => {
  it('merges manifest and preserves extra keys', () => {
    const base = JSON.stringify({ id: 'a', extra_future: { plugin: true } })
    const form = defaultSimpleManifestForm()
    form.id = 'my_role'
    form.name = 'N'
    const out = applySimpleManifestToJson(base, form)
    const o = JSON.parse(out) as Record<string, unknown>
    expect(o.id).toBe('my_role')
    expect(o.name).toBe('N')
    expect(o.extra_future).toEqual({ plugin: true })
  })

  it('applySimpleManifestToJson sets or clears creator_message_to_downloader', () => {
    const base = JSON.stringify({ id: 'a', creator_message_to_downloader: 'old' })
    const form = defaultSimpleManifestForm()
    form.id = 'a'
    form.name = 'N'
    form.creatorMessageToDownloader = 'new line'
    let out = applySimpleManifestToJson(base, form)
    expect(JSON.parse(out).creator_message_to_downloader).toBe('new line')
    form.creatorMessageToDownloader = '  '
    out = applySimpleManifestToJson(out, form)
    expect(JSON.parse(out).creator_message_to_downloader).toBeUndefined()
  })

  it('applySimpleManifestToJson sets or clears min_runtime_version', () => {
    const base = JSON.stringify({ id: 'a', min_runtime_version: '0.9.0' })
    const form = defaultSimpleManifestForm()
    form.id = 'a'
    form.name = 'N'
    form.minRuntimeVersion = '0.2.0'
    let out = applySimpleManifestToJson(base, form)
    expect(JSON.parse(out).min_runtime_version).toBe('0.2.0')
    form.minRuntimeVersion = ''
    out = applySimpleManifestToJson(out, form)
    expect(JSON.parse(out).min_runtime_version).toBeUndefined()
  })

  it('manifestRecordToSimpleForm reads first relation', () => {
    const m = {
      id: 'r',
      name: 'R',
      scenes: ['x'],
      default_relation: 'friend',
      user_relations: {
        friend: { display_name: 'F', prompt_hint: 'p', initial_favorability: 40, favor_multiplier: 1.2 },
      },
    }
    const f = manifestRecordToSimpleForm(m as Record<string, unknown>)
    expect(f.relationKey).toBe('friend')
    expect(f.relationInitialFavorability).toBe(40)
  })

  it('countUserRelationKeys', () => {
    expect(countUserRelationKeys('{"user_relations":{"a":{},"b":{}}}')).toBe(2)
  })

  it('knowledgeFromPackRecords prefers settings over manifest', () => {
    const m = { knowledge: { enabled: true, glob: 'knowledge/**/*.md' } }
    const s = { knowledge: { enabled: false, glob: 'knowledge/a/*.md' } }
    expect(knowledgeFromPackRecords(m as Record<string, unknown>, s as Record<string, unknown>)).toEqual({
      enabled: false,
      glob: 'knowledge/a/*.md',
    })
  })

  it('normalizeKnowledgeGlob prepends knowledge/', () => {
    expect(normalizeKnowledgeGlob('**/*.md')).toBe('knowledge/**/*.md')
    expect(normalizeKnowledgeGlob('')).toBe('knowledge/**/*.md')
  })

  it('applySimple writes knowledge to manifest and settings', () => {
    const mForm = defaultSimpleManifestForm()
    mForm.knowledgeEnabled = false
    mForm.knowledgeGlob = 'knowledge/custom/*.md'
    const sForm = defaultSimpleSettingsForm()
    const mOut = applySimpleManifestToJson('{}', mForm)
    const sOut = applySimpleSettingsToJson('{}', sForm, {
      enabled: mForm.knowledgeEnabled,
      glob: mForm.knowledgeGlob,
    })
    expect(JSON.parse(mOut).knowledge).toEqual({ enabled: false, glob: 'knowledge/custom/*.md' })
    expect(JSON.parse(sOut).knowledge).toEqual({ enabled: false, glob: 'knowledge/custom/*.md' })
  })

  it('keeps model selection in Chat Pro and exports only the Ollama fallback', () => {
    const form = defaultSimpleSettingsForm()
    const out = JSON.parse(applySimpleSettingsToJson(JSON.stringify({
      model: 'local-model',
      ollama_model: 'another-local-model',
      plugin_backends: {
        llm: 'remote',
        directory_plugins: { llm: 'com.example.private-runtime' },
      },
    }), form, { enabled: true, glob: 'knowledge/**/*.md' }))
    expect(out.model).toBeUndefined()
    expect(out.ollama_model).toBeUndefined()
    expect(out.plugin_backends.llm).toBe('ollama')
    expect(out.plugin_backends.directory_plugins?.llm).toBeUndefined()
  })

  it('settings evolution personality_source and max_change_per_event roundtrip', () => {
    const base = JSON.stringify({
      evolution: {
        event_impact_factor: 1,
        ai_analysis_interval: 20,
        max_change_per_event: 0.12,
        max_total_change: 0.4,
        personality_source: 'profile',
      },
    })
    const rec = JSON.parse(base) as Record<string, unknown>
    const form = settingsRecordToSimpleForm(rec)
    expect(form.personalitySource).toBe('profile')
    expect(form.maxChangePerEvent).toBe(0.12)
    const out = applySimpleSettingsToJson(base, form, {
      enabled: true,
      glob: 'knowledge/**/*.md',
    })
    const o = JSON.parse(out) as { evolution: Record<string, unknown> }
    expect(o.evolution.personality_source).toBe('profile')
    expect(o.evolution.max_change_per_event).toBe(0.12)
    expect(o.evolution.ai_analysis_interval).toBe(20)
    expect(o.evolution.max_total_change).toBe(0.4)
  })
})
