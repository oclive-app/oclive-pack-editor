import { describe, expect, it } from 'vitest'
import {
  parseUserIdentityEditorState,
  parseUserRelationOptions,
  serializeUserIdentityEditorState,
  validateUserIdentityEditorState,
} from './userIdentityEditor'

describe('user identity visual editor adapter', () => {
  it('round-trips known fields while preserving extension fields and unreferenced files', () => {
    const parsed = parseUserIdentityEditorState(
      JSON.stringify({
        schema_version: 1,
        default_identity_id: 'father',
        vendor_extension: { enabled: true },
        identities: {
          father: {
            display_name: '父亲',
            template_file: 'father.md',
            maps_to_relation_id: 'father_daughter',
            adult_eligible: true,
          },
        },
      }),
      [
        { path: 'user_identities/father.md', content: '# 父亲身份' },
        { path: 'user_identities/notes.md', content: '保留我' },
      ],
    )
    expect(parsed.parseError).toBe('')
    parsed.state.entries[0]!.displayName = '爸爸'

    const serialized = serializeUserIdentityEditorState(parsed.state)
    const index = JSON.parse(serialized.indexJson)
    expect(index.vendor_extension).toEqual({ enabled: true })
    expect(index.identities.father.adult_eligible).toBe(true)
    expect(index.identities.father.display_name).toBe('爸爸')
    expect(serialized.files).toContainEqual({
      path: 'user_identities/notes.md',
      content: '保留我',
    })
  })

  it('derives editable cards from template files when index.json is absent', () => {
    const parsed = parseUserIdentityEditorState('', [
      { path: 'user_identities/classmate.md', content: '同学关系' },
    ])
    expect(parsed.state.entries[0]).toMatchObject({
      id: 'classmate',
      templateFile: 'classmate.md',
      templateBody: '同学关系',
    })
    expect(parsed.state.defaultIdentityId).toBe('classmate')
  })

  it('reports collisions and unsafe templates before serialization', () => {
    const parsed = parseUserIdentityEditorState(
      JSON.stringify({
        schema_version: 1,
        default_identity_id: 'friend',
        identities: {
          friend: { display_name: '好友', template_file: 'friend.md' },
          guest: { display_name: '访客', template_file: 'guest.md' },
        },
      }),
      [
        { path: 'user_identities/friend.md', content: '好友' },
        { path: 'user_identities/guest.md', content: '访客' },
      ],
    )
    parsed.state.entries[1]!.id = 'friend'
    parsed.state.entries[1]!.templateFile = '../friend.md'
    const codes = validateUserIdentityEditorState(parsed.state).map((issue) => issue.code)
    expect(codes).toContain('duplicateId')
    expect(codes).toContain('invalidTemplateFile')
  })

  it('reads relation labels and prompt previews from manifest.json', () => {
    expect(
      parseUserRelationOptions(
        JSON.stringify({
          user_relations: {
            friend: { display_name: '好友', prompt_hint: '你们是熟悉的朋友。' },
          },
        }),
      ),
    ).toEqual([
      { id: 'friend', displayName: '好友', promptHint: '你们是熟悉的朋友。' },
    ])
  })

  it('adopts an unreferenced template without emitting duplicate paths', () => {
    const parsed = parseUserIdentityEditorState(
      JSON.stringify({
        schema_version: 1,
        default_identity_id: 'friend',
        identities: {
          friend: { display_name: '好友', template_file: 'friend.md' },
        },
      }),
      [
        { path: 'user_identities/friend.md', content: '好友' },
        { path: 'user_identities/spare.md', content: '待采用' },
      ],
    )
    parsed.state.entries[0]!.templateFile = 'spare.md'
    parsed.state.entries[0]!.templateBody = '已采用'
    const serialized = serializeUserIdentityEditorState(parsed.state)
    expect(serialized.files.filter((file) => file.path.endsWith('/spare.md'))).toEqual([
      { path: 'user_identities/spare.md', content: '已采用' },
    ])
  })

  it('treats prefixed and relative template inputs as the same output path', () => {
    const parsed = parseUserIdentityEditorState(
      JSON.stringify({
        schema_version: 1,
        default_identity_id: 'friend',
        identities: {
          friend: { display_name: '好友', template_file: 'friend.md' },
          guest: { display_name: '访客', template_file: 'guest.md' },
        },
      }),
      [
        { path: 'user_identities/friend.md', content: '好友' },
        { path: 'user_identities/guest.md', content: '访客' },
      ],
    )
    parsed.state.entries[1]!.templateFile = 'user_identities/friend.md'
    expect(validateUserIdentityEditorState(parsed.state).map((issue) => issue.code)).toContain(
      'duplicateTemplateFile',
    )
  })

  it('keeps extension metadata and unreferenced files after the last identity is removed', () => {
    const parsed = parseUserIdentityEditorState(
      JSON.stringify({
        schema_version: 1,
        default_identity_id: 'friend',
        vendor_extension: { enabled: true },
        identities: {
          friend: { display_name: '好友', template_file: 'friend.md' },
        },
      }),
      [
        { path: 'user_identities/friend.md', content: '好友' },
        { path: 'user_identities/notes.md', content: '兼容说明' },
      ],
    )
    parsed.state.entries = []
    parsed.state.defaultIdentityId = ''

    const serialized = serializeUserIdentityEditorState(parsed.state)
    expect(JSON.parse(serialized.indexJson)).toMatchObject({
      vendor_extension: { enabled: true },
      default_identity_id: '',
      identities: {},
    })
    expect(serialized.files).toEqual([
      { path: 'user_identities/notes.md', content: '兼容说明' },
    ])
  })
})
