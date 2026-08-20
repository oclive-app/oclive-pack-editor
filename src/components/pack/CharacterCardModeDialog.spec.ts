import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import zhCN from '../../i18n/locales/zh-CN'
import CharacterCardModeDialog from './CharacterCardModeDialog.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN },
})

const report = {
  sourceFileName: 'alice.json',
  sourceFormat: 'v2-json' as const,
  roleId: 'alice',
  converted: [],
  review: [],
}

describe('CharacterCardModeDialog', () => {
  it('shows both creation paths for the same converted draft', () => {
    const wrapper = mount(CharacterCardModeDialog, {
      props: { open: true, report },
      global: { plugins: [i18n], stubs: { Teleport: true } },
    })

    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).toContain('进入简单创造')
    expect(wrapper.text()).toContain('进入高级创作')
    expect(wrapper.text()).toContain('同一份草稿')
  })

  it('emits the selected path without converting again', async () => {
    const wrapper = mount(CharacterCardModeDialog, {
      props: { open: true, report },
      global: { plugins: [i18n], stubs: { Teleport: true } },
    })

    await wrapper.get('[data-mode="simple"]').trigger('click')
    await wrapper.get('[data-mode="advanced"]').trigger('click')

    expect(wrapper.emitted('simple')).toHaveLength(1)
    expect(wrapper.emitted('advanced')).toHaveLength(1)
  })
})
