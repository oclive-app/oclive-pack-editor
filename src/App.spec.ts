import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from './App.vue'
import { i18n } from './i18n'

describe('App shell', () => {
  it('mounts navigation rail with four responsibility-focused views and start import', () => {
    const w = mount(App, { global: { plugins: [i18n] } })
    expect(w.find('.editor-rail').exists()).toBe(true)
    expect(w.findAll('.rail-btn').length).toBe(4)
    expect(w.find('.shell-h1').text().length).toBeGreaterThan(0)
    expect(w.find('.roles-workspace').exists()).toBe(true)
  })

  it('shows header check and export actions', () => {
    const w = mount(App, { global: { plugins: [i18n] } })
    expect(w.find('.pack-header-actions').exists()).toBe(true)
    expect(w.find('.pha-btn--check').exists()).toBe(true)
    expect(w.find('.pha-btn--export-main').exists()).toBe(true)
  })
})
