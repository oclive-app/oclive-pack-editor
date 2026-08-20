import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import zhCN from '../../i18n/locales/zh-CN'
import { emptyAuthorRecRow } from '../../lib/authorPack'
import { defaultUiConfig } from '../../types/uiConfig'
import AuthorFileEditor from './AuthorFileEditor.vue'
import ConfigFileEditor from './ConfigFileEditor.vue'
import InferenceProfileEditor from './InferenceProfileEditor.vue'
import PromptsFileEditor from './PromptsFileEditor.vue'
import UiConfigEditor from './UiConfigEditor.vue'
import VoiceProfileEditor from './VoiceProfileEditor.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN },
})

const global = { plugins: [i18n] }

function lastEmission<T>(wrapper: ReturnType<typeof mount>, name: string): T {
  const calls = wrapper.emitted(name)
  expect(calls?.length).toBeGreaterThan(0)
  return calls?.at(-1)?.[0] as T
}

describe('advanced file editors write through to their source data', () => {
  it('writes inference controls into settings.json and preserves unknown settings', async () => {
    const wrapper = mount(InferenceProfileEditor, {
      props: { settingsText: '{"future_setting":{"keep":true}}\n' },
      global,
    })

    await wrapper.find('.enable-switch input').setValue(true)
    await wrapper.find('input[type="number"][min="0"][max="2"]').setValue(1.15)
    await wrapper.find('input[type="number"][min="0"][max="2"]').trigger('change')

    const settings = JSON.parse(lastEmission<string>(wrapper, 'update:settingsText'))
    expect(settings.future_setting).toEqual({ keep: true })
    expect(settings.inference_profile.generation.temperature).toBe(1.15)
  })

  it('creates voice_profile.json from the switch and preserves future fields', async () => {
    const wrapper = mount(VoiceProfileEditor, {
      props: { modelValue: '{"future_voice":"keep"}\n' },
      global,
    })

    const speed = wrapper.find('input[type="number"]')
    await speed.setValue(1.25)
    await speed.trigger('change')

    const voice = JSON.parse(lastEmission<string>(wrapper, 'update:modelValue'))
    expect(voice.future_voice).toBe('keep')
    expect(voice.speed).toBe(1.25)
    expect(voice.schema_version).toBe(2)
  })

  it('writes prompt text and its manifest switches to the correct models', async () => {
    const wrapper = mount(PromptsFileEditor, {
      props: {
        manifestText: '{}\n',
        settingsText: '{"future_setting":7}\n',
        deepCapsuleText: '',
        systemPromptMarkdown: '',
        polishPromptMarkdown: '',
      },
      global,
    })

    const textareas = wrapper.findAll('textarea')
    await textareas[0]!.setValue('稳定保持角色口吻。')
    await wrapper.find('.title-row input[type="checkbox"]').setValue(true)
    await textareas[1]!.setValue('深层胶囊内容')

    const settings = JSON.parse(lastEmission<string>(wrapper, 'update:settingsText'))
    const manifest = JSON.parse(lastEmission<string>(wrapper, 'update:manifestText'))
    expect(settings.future_setting).toBe(7)
    expect(settings.reply_quality_anchor).toBe('稳定保持角色口吻。')
    expect(manifest.deep_capsule_enabled).toBe(true)
    expect(lastEmission<string>(wrapper, 'update:deepCapsuleText')).toBe('深层胶囊内容')
  })

  it('emits raw config edits instead of showing a detached preview', async () => {
    const wrapper = mount(ConfigFileEditor, {
      props: { modelValue: '{}\n' },
      global,
    })

    await wrapper.find('textarea').setValue('{"facility":{"enabled":true}}\n')

    expect(lastEmission<string>(wrapper, 'update:modelValue')).toContain('"facility"')
  })

  it('emits author fields and immutable recommendation-row updates', async () => {
    const wrapper = mount(AuthorFileEditor, {
      props: {
        summary: '',
        detailMarkdown: '',
        rows: [emptyAuthorRecRow()],
        includeSuggestedUi: false,
        suggestedBackendsJson: '',
      },
      global,
    })

    await wrapper.find('label input[type="text"]').setValue('一句话简介')
    await wrapper.find('.plugin-row input').setValue('weather.plugin')

    expect(lastEmission<string>(wrapper, 'update:summary')).toBe('一句话简介')
    expect(lastEmission<Array<{ id: string }>>(wrapper, 'update:rows')[0]?.id).toBe('weather.plugin')
  })

  it('mutates the shared ui.json model used by export', async () => {
    const uiConfig = defaultUiConfig()
    const wrapper = mount(UiConfigEditor, {
      props: { uiConfig },
      global,
    })

    await wrapper.find('.grid input').setValue('immersive-shell')
    await wrapper.find('.slot-card input').setValue('clock, weather')
    await wrapper.find('.slot-card input').trigger('change')

    expect(uiConfig.shell).toBe('immersive-shell')
    expect(uiConfig.slots.chat_toolbar.order).toEqual(['clock', 'weather'])
  })
})
