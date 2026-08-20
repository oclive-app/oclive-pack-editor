const LAST_OCPAK_PATH_KEY = 'oclive-pack-editor-last-ocpak-path'

export function readLastOcpakPath(): string | null {
  try {
    const value = localStorage.getItem(LAST_OCPAK_PATH_KEY)
    return value?.trim() ? value.trim() : null
  } catch {
    return null
  }
}

export function rememberOcpakPath(path: string): void {
  try {
    localStorage.setItem(LAST_OCPAK_PATH_KEY, path.trim())
  } catch {
    /* ignore storage failures */
  }
}
