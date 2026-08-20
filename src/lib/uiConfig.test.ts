import { describe, it, expect } from 'vitest'
import { mergeUiConfigJson, parseUiConfigJson, serializeUiConfig } from './uiConfig'
import { defaultUiConfig } from '../types/uiConfig'

describe('uiConfig parse/serialize (T13)', () => {
  it('returns defaults for invalid json', () => {
    const cfg = parseUiConfigJson('{not json')
    expect(cfg.shell).toBe(defaultUiConfig().shell)
  })

  it('round-trips slot order and visible lists', () => {
    const raw = JSON.stringify({
      slots: {
        chat_toolbar: { order: ['a', 'b'], visible: ['a'] },
      },
    })
    const parsed = parseUiConfigJson(raw)
    expect(parsed.slots.chat_toolbar.order).toEqual(['a', 'b'])
    const disk = JSON.parse(serializeUiConfig(parsed))
    expect(disk.slots.chat_toolbar.order).toEqual(['a', 'b'])
  })

  it('preserves unknown root and slot fields while updating managed UI values', () => {
    const config = defaultUiConfig()
    config.theme.primaryColor = '#123456'
    const disk = JSON.parse(mergeUiConfigJson(JSON.stringify({
      future_root: { enabled: true },
      theme: { future_theme: 'keep' },
      slots: { chat_toolbar: { future_slot: 7 } },
    }), config))
    expect(disk.future_root).toEqual({ enabled: true })
    expect(disk.theme.future_theme).toBe('keep')
    expect(disk.theme.primaryColor).toBe('#123456')
    expect(disk.slots.chat_toolbar.future_slot).toBe(7)
  })
})
