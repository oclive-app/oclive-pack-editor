import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n } from '../../i18n'
import { defaultSimpleManifestForm, defaultSimpleSettingsForm } from '../../lib/simpleCreation'
import SimpleCreationPanel from './SimpleCreationPanel.vue'

function mountPanel() {
  i18n.global.locale.value = 'zh-CN'
  return mount(SimpleCreationPanel, {
    props: {
      simpleM: defaultSimpleManifestForm(),
      simpleS: defaultSimpleSettingsForm(),
      corePersonality: '测试角色',
      worldKnowledgeTexts: { dialogueWorldview: '', knowledgeBoundary: '' },
      syncFormWarning: '',
      multiRelationWarning: false,
      portraitPlaceholderWarning: false,
      emotionSummary: '',
      portraitSlotFiles: {},
      portraitExtraEntries: [],
      characterCardImportReport: null,
    },
    global: {
      plugins: [i18n],
      stubs: {
        AdvFaqList: true,
        HelpHint: true,
        PortraitCatalogEditor: true,
        WorldKnowledgeSimpleEditor: true,
      },
    },
  })
}

describe('SimpleCreationPanel reply optimization', () => {
  it('uses the recommended optimization until customization is enabled', async () => {
    const wrapper = mountPanel()
    expect(wrapper.find('#reply-quality-ta').exists()).toBe(false)
    expect(wrapper.text()).toContain('默认启用推荐优化')

    await wrapper.find('.reply-quality-switch input').setValue(true)

    const textarea = wrapper.find('#reply-quality-ta')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toContain('【角色表现优化】')
    expect(wrapper.text()).toContain('整段替换推荐优化')
  })

  it('shows the concrete field conversion report', () => {
    const wrapper = mount(SimpleCreationPanel, {
      props: {
        simpleM: defaultSimpleManifestForm(),
        simpleS: defaultSimpleSettingsForm(),
        corePersonality: '测试角色',
        worldKnowledgeTexts: { dialogueWorldview: '', knowledgeBoundary: '' },
        syncFormWarning: '',
        multiRelationWarning: false,
        portraitPlaceholderWarning: false,
        emotionSummary: '',
        portraitSlotFiles: {},
        portraitExtraEntries: [],
        characterCardImportReport: {
          sourceFileName: 'alice.png',
          sourceFormat: 'v2-png',
          roleId: 'alice',
          converted: ['identity', 'portrait'],
          review: ['languageAndAdultDeferred'],
        },
      },
      global: {
        plugins: [i18n],
        stubs: {
          AdvFaqList: true,
          HelpHint: true,
          PortraitCatalogEditor: true,
          WorldKnowledgeSimpleEditor: true,
        },
      },
    })
    expect(wrapper.text()).toContain('角色卡转换报告')
    expect(wrapper.text()).toContain('alice.png')
    expect(wrapper.text()).toContain('PNG 卡面')
    expect(wrapper.text()).toContain('不翻译文本')
  })
})
