import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import zhCN from '../../i18n/locales/zh-CN'
import PackHeaderActions from './PackHeaderActions.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN },
})

describe('PackHeaderActions (Phase 1 header tools)', () => {
  it('renders check pack and export buttons', () => {
    const w = mount(PackHeaderActions, {
      props: {
        folderExportOk: false,
      },
      global: { plugins: [i18n] },
    })
    expect(w.find('.pha-btn--check').text()).toContain('检查角色包')
    expect(w.find('.pha-btn--export-main').text()).toContain('导出 .ocpak')
  })

  it('emits runValidate when check is clicked', async () => {
    const w = mount(PackHeaderActions, {
      props: {
        folderExportOk: false,
      },
      global: { plugins: [i18n] },
    })
    await w.find('.pha-btn--check').trigger('click')
    expect(w.emitted('runValidate')).toHaveLength(1)
  })

  it('emits exportOcpak from main export button', async () => {
    const w = mount(PackHeaderActions, {
      props: {
        folderExportOk: false,
      },
      global: { plugins: [i18n] },
    })
    await w.find('.pha-btn--export-main').trigger('click')
    expect(w.emitted('exportOcpak')).toHaveLength(1)
  })

  it('emits exportOcpakAs from the save-as button', async () => {
    const w = mount(PackHeaderActions, {
      props: {
        folderExportOk: false,
      },
      global: { plugins: [i18n] },
    })
    await w.find('.pha-btn--export-as').trigger('click')
    expect(w.emitted('exportOcpakAs')).toHaveLength(1)
  })

  it('emits exportFolder when folder export supported', async () => {
    const w = mount(PackHeaderActions, {
      props: {
        folderExportOk: true,
      },
      global: { plugins: [i18n] },
    })
    await w.find('.pha-btn--export-folder').trigger('click')
    expect(w.emitted('exportFolder')).toHaveLength(1)
  })

  it('emits saveDraft when save button visible', async () => {
    const w = mount(PackHeaderActions, {
      props: {
        folderExportOk: false,
        showSaveDraft: true,
      },
      global: { plugins: [i18n] },
    })
    await w.find('.pha-btn--save').trigger('click')
    expect(w.emitted('saveDraft')).toHaveLength(1)
  })

  it('toggles requireChecksBeforeExport via checkbox', async () => {
    const w = mount(PackHeaderActions, {
      props: {
        folderExportOk: false,
        requireChecksBeforeExport: false,
      },
      global: { plugins: [i18n] },
    })
    const input = w.find('.pha-check input')
    expect((input.element as HTMLInputElement).checked).toBe(false)
    await input.setValue(true)
    expect(w.emitted('update:requireChecksBeforeExport')?.[0]).toEqual([true])
  })
})
