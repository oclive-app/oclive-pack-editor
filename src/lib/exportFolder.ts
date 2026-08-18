import { invoke, isTauri } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import {
  buildRolePackFiles,
  collectRolePackBinaryFilesForExport,
  type ExportableManifest,
  type ExportableSettings,
  type PackExtraFiles,
} from './exportPack'
import { duplicateRoleFolderConfirmMessage } from './exportErrorMessages'

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && isTauri()
}

/** Tauri：检测 roles 根下是否已有 `{roleId}/` 文件夹。 */
export async function rolePackDirExists(rolesRoot: string, roleId: string): Promise<boolean> {
  if (!isTauriRuntime()) return false
  const root = rolesRoot.trim()
  const id = roleId.trim()
  if (!root || !id) return false
  return invoke<boolean>('role_pack_dir_exists', { rolesRoot: root, roleId: id })
}

/** 重复导出时提醒：同名文件夹已存在则询问是否覆盖。 */
export async function confirmOverwriteExistingRoleDir(
  rolesRoot: string,
  roleId: string,
): Promise<boolean> {
  const exists = await rolePackDirExists(rolesRoot, roleId)
  if (!exists) return true
  const message = duplicateRoleFolderConfirmMessage(roleId)
  // Use the WebView's native confirmation in both browser and desktop builds.
  // The dialog plugin is still used for selecting a folder, but routing this
  // confirmation through it made overwrite fail when the desktop capability
  // was not available at runtime.
  return window.confirm(message)
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + Math.min(chunk, bytes.length - i)))
  }
  return btoa(binary)
}

async function binaryPayloadForCatalogAssets(
  roleId: string,
  managedPaths: Iterable<string>,
  extra?: Partial<PackExtraFiles>,
): Promise<{ path: string; base64: string }[]> {
  const id = roleId.trim()
  const out: { path: string; base64: string }[] = []
  for (const { relPath, file } of collectRolePackBinaryFilesForExport(
    id,
    managedPaths,
    extra,
  )) {
    const buf = await file.arrayBuffer()
    out.push({
      path: `${id}/${relPath.replace(/\\/g, '/')}`,
      base64: arrayBufferToBase64(buf),
    })
  }
  return out
}

/** Write `{roleId}/**` under the directory chosen as the roles root (`OCLIVE_ROLES_DIR`). Tauri：对话框选目录 + IPC；浏览器：需 File System Access。 */
export async function writePackToRolesRoot(
  rolesRoot: FileSystemDirectoryHandle,
  roleId: string,
  manifest: ExportableManifest,
  settings: ExportableSettings,
  extra?: Partial<PackExtraFiles>,
): Promise<void> {
  const id = roleId.trim()
  const m = { ...manifest, id }
  const files = buildRolePackFiles(id, m, settings, extra)
  for (const [rel, content] of files) {
    const parts = rel.split('/').filter(Boolean)
    let dir: FileSystemDirectoryHandle = rolesRoot
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]!, { create: true })
    }
    const fileName = parts[parts.length - 1]!
    const fh = await dir.getFileHandle(fileName, { create: true })
    const w = await fh.createWritable()
    await w.write(content)
    await w.close()
  }
  for (const { relPath, file } of collectRolePackBinaryFilesForExport(
    id,
    files.keys(),
    extra,
  )) {
    const rel = `${id}/${relPath.replace(/\\/g, '/')}`
    const parts = rel.split('/').filter(Boolean)
    let dir: FileSystemDirectoryHandle = rolesRoot
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]!, { create: true })
    }
    const fh = await dir.getFileHandle(parts[parts.length - 1]!, { create: true })
    const w = await fh.createWritable()
    await w.write(await file.arrayBuffer())
    await w.close()
  }
}

export async function writePackToRolesRootPath(
  rolesRootPath: string,
  roleId: string,
  manifest: ExportableManifest,
  settings: ExportableSettings,
  extra?: Partial<PackExtraFiles>,
): Promise<void> {
  const id = roleId.trim()
  const m = { ...manifest, id }
  const files = buildRolePackFiles(id, m, settings, extra)
  const payload = [...files.entries()].map(([path, content]) => ({ path, content }))
  await invoke('write_role_pack_files', {
    rolesRoot: rolesRootPath,
    files: payload,
  })
  const bins = await binaryPayloadForCatalogAssets(id, files.keys(), extra)
  if (bins.length > 0) {
    await invoke('write_role_pack_binaries', {
      rolesRoot: rolesRootPath,
      files: bins,
    })
  }
}

/** 选 roles 根并写入完整包；取消对话框时 `wrote: false`。成功时返回 `rolesRootPath` 供后续写回使用。 */
export async function pickRolesRootAndWritePack(
  roleId: string,
  manifest: ExportableManifest,
  settings: ExportableSettings,
  extra?: Partial<PackExtraFiles>,
): Promise<{ wrote: boolean; rolesRootPath?: string }> {
  if (isTauriRuntime()) {
    const selected = await open({ directory: true, multiple: false })
    if (selected === null) return { wrote: false }
  const path = Array.isArray(selected) ? selected[0] : selected
  if (!(await confirmOverwriteExistingRoleDir(path, roleId))) {
    return { wrote: false }
  }
  await writePackToRolesRootPath(path, roleId, manifest, settings, extra)
    return { wrote: true, rolesRootPath: path }
  }
  if (!isFolderExportSupported()) {
    throw new Error('当前环境不支持选择文件夹写入，请使用桌面版或支持 File System Access 的浏览器。')
  }
  try {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' })
    await writePackToRolesRoot(dir, roleId, manifest, settings, extra)
    return { wrote: true }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return { wrote: false }
    throw e
  }
}

export function isFolderExportSupported(): boolean {
  return isTauriRuntime() || (typeof window !== 'undefined' && 'showDirectoryPicker' in window)
}
