import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import zhCN from '../../i18n/locales/zh-CN'

vi.mock('../../lib/exportFolder', () => ({
  isTauriRuntime: () => true,
}))

import RolesWorkspacePanel from './RolesWorkspacePanel.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN },
})

function mountPanel() {
  return mount(RolesWorkspacePanel, {
    props: {
      rolesRootPath: 'D:\\OCLive\\roles',
      selectableRoles: [
        { roleId: 'mumu', displayName: '沐沐', needsMigration: false },
      ],
      availableRoles: [
        { roleId: 'mumu', displayName: '沐沐', needsMigration: false },
        { roleId: 'legacy', displayName: '旧角色', needsMigration: true },
      ],
      selectedRoleId: '',
      workspaceBusy: false,
      workspaceMessage: '',
      workspaceMessageIsError: false,
      marketComposePaste: '',
      draftMeta: null,
    },
    global: { plugins: [i18n] },
  })
}

describe('RolesWorkspacePanel', () => {
  it('emits the chosen new-pack preset', async () => {
    const wrapper = mountPanel()
    expect(wrapper.findAll('input[name="new-pack-preset"]')).toHaveLength(4)

    await wrapper.find('input[value="story"]').setValue(true)
    await wrapper.find('.rw-btn--accent').trigger('click')

    expect(wrapper.emitted('createNewPack')?.at(-1)).toEqual(['story'])
  })

  it('shows scanned roles directly and opens the selected editable role', async () => {
    const wrapper = mountPanel()
    expect(wrapper.findAll('.rw-role-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 个角色包')

    const editableCard = wrapper.findAll('.rw-role-card')[0]!
    await editableCard.find('button').trigger('click')

    expect(wrapper.emitted('update:selectedRoleId')?.at(-1)).toEqual(['mumu'])
    expect(wrapper.emitted('loadSelectedRole')).toHaveLength(1)
    expect(wrapper.findAll('.rw-role-card')[1]!.find('button').attributes('disabled')).toBeDefined()
  })
})
