import { invoke } from '@tauri-apps/api/core'

export type RolePackListEntry = {
  roleId: string
  displayName: string
  absPath: string
  needsMigration: boolean
}

export type RolePackCatalogAssetPayload = {
  fileName: string
  base64: string
}

export type RolePackEditorLoadPayload = {
  blueprintText: string
  manifestText: string
  settingsText?: string
  configText?: string
  adultExtensionText?: string
  portraitCatalogText?: string
  catalogAssets?: RolePackCatalogAssetPayload[]
  preservedFiles?: Array<{ path: string; base64: string }>
  userIdentitiesIndexText?: string
  memorySeedText?: string
  corePersonalityText?: string
  creatorMessageText?: string
  uiText?: string
  authorText?: string
  userIdentityFiles?: Array<{ path: string; content: string }>
  mergedSceneIds: string[]
  sceneFiles: Array<{
    sceneId: string
    sceneJsonText?: string
    descriptionText?: string
  }>
}

/** Tauri 读盘 catalog / legacy assets → 与 zip 导入一致的 File[]。 */
export function catalogAssetsToFiles(assets: RolePackCatalogAssetPayload[]): File[] {
  return assets.map(({ fileName, base64 }) => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const ext = fileName.split('.').pop()?.toLowerCase()
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'webp'
            ? 'image/webp'
            : 'application/octet-stream'
    return new File([bytes], fileName, { type: mime })
  })
}

export async function invokeListRolePacksUnderRolesRoot(
  rolesRoot: string,
): Promise<RolePackListEntry[]> {
  return invoke<RolePackListEntry[]>('list_role_packs_under_roles_root', { rolesRoot })
}

export async function invokeLoadRolePackForEditor(roleDir: string): Promise<RolePackEditorLoadPayload> {
  return invoke<RolePackEditorLoadPayload>('load_role_pack_for_editor', { roleDir })
}

export function preservedPayloadsToFiles(
  files: Array<{ path: string; base64: string }>,
): Array<{ relPath: string; file: File }> {
  return files.map(({ path, base64 }) => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index)
    }
    const fileName = path.split('/').pop() || 'payload.json'
    return {
      relPath: path,
      file: new File([bytes], fileName, { type: 'application/octet-stream' }),
    }
  })
}
