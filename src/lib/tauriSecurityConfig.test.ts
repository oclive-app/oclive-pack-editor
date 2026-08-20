import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type TauriConfig = {
  app?: {
    security?: {
      csp?: string
      devCsp?: string
    }
  }
  plugins?: {
    dialog?: unknown
  }
}

type TauriCapability = {
  permissions?: string[]
}

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src-tauri/tauri.conf.json'), 'utf8'),
) as TauriConfig
const capability = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src-tauri/capabilities/main.json'), 'utf8'),
) as TauriCapability

describe('Tauri CSP boundary', () => {
  it('does not configure the unit-valued dialog plugin as an object', () => {
    expect(config.plugins?.dialog).toBeUndefined()
  })

  it('grants folder selection without retaining the unused dialog confirmation permission', () => {
    expect(capability.permissions).toContain('dialog:allow-open')
    expect(capability.permissions).not.toContain('dialog:allow-confirm')
  })

  it('keeps production CSP free of development and runtime endpoints', () => {
    const csp = config.app?.security?.csp ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toMatch(/http:\/\/localhost|127\.0\.0\.1|8420|ws:/)
  })

  it('isolates Vite endpoints in devCsp without enabling eval', () => {
    const devCsp = config.app?.security?.devCsp ?? ''
    expect(devCsp).toContain('http://localhost:5173')
    expect(devCsp).toContain('ws://localhost:5173')
    expect(devCsp).not.toContain('unsafe-eval')
    expect(devCsp).not.toContain('8420')
  })
})
