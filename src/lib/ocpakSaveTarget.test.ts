import { beforeEach, describe, expect, it } from 'vitest'
import { readLastOcpakPath, rememberOcpakPath } from './ocpakSaveTarget'

describe('ocpakSaveTarget', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no save path has been chosen', () => {
    expect(readLastOcpakPath()).toBeNull()
  })

  it('persists and trims the chosen save path', () => {
    rememberOcpakPath('  D:\\Packs\\mumu.ocpak  ')
    expect(readLastOcpakPath()).toBe('D:\\Packs\\mumu.ocpak')
  })

  it('ignores blank values', () => {
    rememberOcpakPath('   ')
    expect(readLastOcpakPath()).toBeNull()
  })
})
