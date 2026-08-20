import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, reactive, nextTick } from 'vue'
import { useRolesWorkspace } from './useRolesWorkspace'
import { DEFAULT_MANIFEST_JSON, DEFAULT_SETTINGS_JSON } from '../defaults'
import { defaultUiConfig } from '../types/uiConfig'
import { emptyAuthorRecRow } from '../lib/authorPack'

const isTauriRuntimeMock = vi.fn(() => false)

vi.mock('../lib/exportFolder', () => ({
  isTauriRuntime: () => isTauriRuntimeMock(),
}))

vi.mock('../lib/rolePackEditorApi', () => ({
  invokeListRolePacksUnderRolesRoot: vi.fn(),
  invokeFindRolesRootForEditor: vi.fn(),
  invokeGuessDefaultRolesRoot: vi.fn(),
  invokeLoadRolePackForEditor: vi.fn(),
  catalogAssetsToFiles: vi.fn(() => []),
  preservedPayloadsToFiles: vi.fn(() => []),
}))

import {
  invokeFindRolesRootForEditor,
  invokeGuessDefaultRolesRoot,
  invokeListRolePacksUnderRolesRoot,
} from '../lib/rolePackEditorApi'

describe('useRolesWorkspace', () => {
  beforeEach(() => {
    localStorage.clear()
    isTauriRuntimeMock.mockReturnValue(false)
    vi.clearAllMocks()
  })

  function makeApplyTargets() {
    return {
      manifestText: ref(DEFAULT_MANIFEST_JSON),
      settingsText: ref(DEFAULT_SETTINGS_JSON),
      corePersonalityText: ref(''),
      worldviewMarkdown: ref(''),
      knowledgeMarkdownFiles: ref([]),
      emotionImageFiles: ref([]),
      portraitSlotFiles: ref({}),
      portraitExtraEntries: ref([]),
      visualPresentationEnabled: ref(false),
      visualPresentationBackend: ref('image'),
      visualPresentationLive2dModel: ref(''),
      creatorMessageToOthers: ref(''),
      creatorMessageMode: ref<'unified' | 'per_module'>('unified'),
      uiConfig: reactive(defaultUiConfig()),
      authorSummary: ref(''),
      authorDetailMarkdown: ref(''),
      authorRecommendedRows: ref([emptyAuthorRecRow()]),
      authorIncludeSuggestedUi: ref(false),
      authorSuggestedBackendsJson: ref(''),
      applyKnowledgeBundle: vi.fn(),
      applySceneEditorEntries: vi.fn(),
      syncFormsFromJson: vi.fn(),
    }
  }

  it('starts in idle pack session', () => {
    const ws = useRolesWorkspace(makeApplyTargets())
    expect(ws.packSession.value).toBe('idle')
  })

  it('resetToNewPack clears loaded session', async () => {
    const targets = makeApplyTargets()
    const ws = useRolesWorkspace(targets)
    ws.packSession.value = 'loaded'
    ws.loadedRoleName.value = 'Demo'
    ws.resetToNewPack()
    await nextTick()
    expect(ws.packSession.value).toBe('new')
    expect(ws.loadedRoleName.value).toBe('')
  })

  it('normalizes a selected project folder before scanning roles', async () => {
    isTauriRuntimeMock.mockReturnValue(true)
    vi.mocked(invokeFindRolesRootForEditor).mockResolvedValue(
      'D:\\OCLive\\oclivenewnew\\distros\\chat-pro\\roles',
    )
    vi.mocked(invokeListRolePacksUnderRolesRoot).mockResolvedValue([
      {
        roleId: 'mumu',
        displayName: '沐沐',
        absPath: 'D:\\OCLive\\oclivenewnew\\distros\\chat-pro\\roles\\mumu',
        needsMigration: false,
      },
    ])
    const ws = useRolesWorkspace(makeApplyTargets())
    ws.rolesRootPath.value = 'D:\\OCLive\\oclivenewnew'

    await ws.scanRoles()

    expect(invokeFindRolesRootForEditor).toHaveBeenCalledWith('D:\\OCLive\\oclivenewnew')
    expect(invokeListRolePacksUnderRolesRoot).toHaveBeenCalledWith(
      'D:\\OCLive\\oclivenewnew\\distros\\chat-pro\\roles',
    )
    expect(ws.rolesRootPath.value).toMatch(/distros\\chat-pro\\roles$/)
    expect(ws.selectedRoleId.value).toBe('mumu')
  })

  it('discovers the default roles directory when scan is clicked without a saved path', async () => {
    isTauriRuntimeMock.mockReturnValue(true)
    vi.mocked(invokeGuessDefaultRolesRoot).mockResolvedValue('D:\\OCLive\\roles')
    vi.mocked(invokeFindRolesRootForEditor).mockResolvedValue('D:\\OCLive\\roles')
    vi.mocked(invokeListRolePacksUnderRolesRoot).mockResolvedValue([
      {
        roleId: 'alpha',
        displayName: 'Alpha',
        absPath: 'D:\\OCLive\\roles\\alpha',
        needsMigration: false,
      },
      {
        roleId: 'beta',
        displayName: 'Beta',
        absPath: 'D:\\OCLive\\roles\\beta',
        needsMigration: false,
      },
    ])
    const ws = useRolesWorkspace(makeApplyTargets())

    await ws.scanRoles()

    expect(invokeGuessDefaultRolesRoot).toHaveBeenCalledOnce()
    expect(invokeListRolePacksUnderRolesRoot).toHaveBeenCalledWith('D:\\OCLive\\roles')
    expect(ws.availableRoles.value.map((role) => role.roleId)).toEqual(['alpha', 'beta'])
    expect(localStorage.getItem('oclive-pack-editor-roles-root')).toBe('D:\\OCLive\\roles')
  })

  it('recovers when a saved roles path points to a previous drive', async () => {
    isTauriRuntimeMock.mockReturnValue(true)
    vi.mocked(invokeFindRolesRootForEditor)
      .mockRejectedValueOnce(new Error('D:\\OCLive\\roles does not exist'))
      .mockResolvedValueOnce('E:\\OCLive\\oclivenewnew\\distros\\chat-pro\\roles')
    vi.mocked(invokeGuessDefaultRolesRoot).mockResolvedValue(
      'E:\\OCLive\\oclivenewnew\\distros\\chat-pro\\roles',
    )
    vi.mocked(invokeListRolePacksUnderRolesRoot).mockResolvedValue([
      {
        roleId: 'mumu',
        displayName: '沐沐',
        absPath: 'E:\\OCLive\\oclivenewnew\\distros\\chat-pro\\roles\\mumu',
        needsMigration: false,
      },
    ])
    const ws = useRolesWorkspace(makeApplyTargets())
    ws.rolesRootPath.value = 'D:\\OCLive\\roles'

    await ws.scanRoles()

    expect(ws.rolesRootPath.value).toBe(
      'E:\\OCLive\\oclivenewnew\\distros\\chat-pro\\roles',
    )
    expect(ws.selectedRoleId.value).toBe('mumu')
    expect(ws.workspaceMessageIsError.value).toBe(false)
    expect(localStorage.getItem('oclive-pack-editor-roles-root')).toBe(
      'E:\\OCLive\\oclivenewnew\\distros\\chat-pro\\roles',
    )
  })

  it('applies the selected creation preset across role, knowledge, and scene editors', () => {
    const targets = makeApplyTargets()
    const ws = useRolesWorkspace(targets)

    ws.resetToNewPack('story')

    expect(JSON.parse(targets.manifestText.value)).toMatchObject({
      id: 'story_role',
      scenes: ['opening', 'daily'],
    })
    expect(targets.corePersonalityText.value).toContain('剧情互动角色')
    expect(targets.applyKnowledgeBundle).toHaveBeenCalledOnce()
    expect(targets.applySceneEditorEntries).toHaveBeenCalledWith([
      expect.objectContaining({ sceneId: 'opening' }),
      expect.objectContaining({ sceneId: 'daily' }),
    ])
  })
})
