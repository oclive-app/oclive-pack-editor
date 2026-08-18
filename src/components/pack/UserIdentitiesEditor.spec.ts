import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import zhCN from '../../i18n/locales/zh-CN'
import UserIdentitiesEditor from './UserIdentitiesEditor.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN },
})

describe('UserIdentitiesEditor', () => {
  const manifestText = JSON.stringify({
    user_relations: {
      father_daughter: {
        display_name: '父女',
        prompt_hint: '用户是角色信赖的父亲。',
      },
    },
  })
  const indexJson = JSON.stringify({
    schema_version: 1,
    default_identity_id: 'father',
    identities: {
      father: {
        display_name: '父亲',
        template_file: 'father.md',
        maps_to_relation_id: 'father_daughter',
      },
    },
  })

  it('renders an identity card and previews its mapped relation prompt', () => {
    const wrapper = mount(UserIdentitiesEditor, {
      props: {
        manifestText,
        indexJson,
        files: [{ path: 'user_identities/father.md', content: '# 父亲身份' }],
      },
      global: { plugins: [i18n] },
    })
    expect(wrapper.findAll('.identity-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('父亲')
    expect(wrapper.text()).toContain('用户是角色信赖的父亲。')
  })

  it('adds a complete identity and emits both contract files', async () => {
    const wrapper = mount(UserIdentitiesEditor, {
      props: { manifestText, indexJson: '', files: [] },
      global: { plugins: [i18n] },
    })
    await wrapper.find('.identity-empty button').trigger('click')
    const indexUpdate = wrapper.emitted('update:indexJson')?.at(-1)?.[0]
    const filesUpdate = wrapper.emitted('update:files')?.at(-1)?.[0]
    expect(String(indexUpdate)).toContain('identity_1')
    expect(filesUpdate).toEqual([
      expect.objectContaining({ path: 'user_identities/identity_1.md' }),
    ])
  })

  it('keeps the default identity linked when its ID is renamed', async () => {
    const wrapper = mount(UserIdentitiesEditor, {
      props: {
        manifestText,
        indexJson,
        files: [{ path: 'user_identities/father.md', content: '# 父亲身份' }],
      },
      global: { plugins: [i18n] },
    })
    await wrapper.find('.identity-grid input').setValue('parent')
    const latest = String(wrapper.emitted('update:indexJson')?.at(-1)?.[0])
    expect(JSON.parse(latest)).toMatchObject({
      default_identity_id: 'parent',
      identities: { parent: { display_name: '父亲' } },
    })
  })
})
