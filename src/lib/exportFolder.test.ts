import { beforeEach, describe, expect, it, vi } from 'vitest'

const isTauriMock = vi.fn()
const invokeMock = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
  isTauri: () => isTauriMock(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}))

import { confirmOverwriteExistingRoleDir, isTauriRuntime } from './exportFolder'

describe('isTauriRuntime', () => {
  beforeEach(() => {
    isTauriMock.mockReset()
    invokeMock.mockReset()
    vi.restoreAllMocks()
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })
  })

  it('uses the Tauri v2 runtime detector', () => {
    isTauriMock.mockReturnValue(true)
    expect(isTauriRuntime()).toBe(true)

    isTauriMock.mockReturnValue(false)
    expect(isTauriRuntime()).toBe(false)
    expect(isTauriMock).toHaveBeenCalledTimes(2)
  })

  it('uses the native WebView confirmation when a desktop role directory exists', async () => {
    isTauriMock.mockReturnValue(true)
    invokeMock.mockResolvedValue(true)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await expect(confirmOverwriteExistingRoleDir('D:/OCLive/roles', 'alice')).resolves.toBe(true)

    expect(invokeMock).toHaveBeenCalledWith('role_pack_dir_exists', {
      rolesRoot: 'D:/OCLive/roles',
      roleId: 'alice',
    })
    expect(confirmSpy).toHaveBeenCalledOnce()
    expect(confirmSpy.mock.calls[0]?.[0]).toContain('alice')
  })

  it('does not show a confirmation when the target directory is new', async () => {
    isTauriMock.mockReturnValue(true)
    invokeMock.mockResolvedValue(false)
    const confirmSpy = vi.spyOn(window, 'confirm')

    await expect(confirmOverwriteExistingRoleDir('D:/OCLive/roles', 'new-role')).resolves.toBe(true)

    expect(confirmSpy).not.toHaveBeenCalled()
  })
})
