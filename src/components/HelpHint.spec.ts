import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import zhCN from '../i18n/locales/zh-CN'
import HelpHint from './HelpHint.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN },
})
const originalViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
}

function domRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  }
}

afterEach(() => {
  document.body.innerHTML = ''
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalViewport.width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalViewport.height })
  vi.restoreAllMocks()
})

describe('HelpHint', () => {
  it('connects the trigger to the teleported explanation and supports Escape', async () => {
    const wrapper = mount(HelpHint, {
      props: { paragraphs: ['第一段说明。', '第二段说明。'] },
      attachTo: document.body,
      global: { plugins: [i18n] },
    })

    await wrapper.find('.help-btn').trigger('click')
    await flushPromises()

    const tooltip = document.querySelector<HTMLElement>('.help-pop')
    expect(tooltip?.textContent).toContain('第一段说明。')
    expect(tooltip?.textContent).toContain('第二段说明。')
    expect(wrapper.find('.help-btn').attributes('aria-describedby')).toBe(tooltip?.id)
    expect(wrapper.find('.help-btn').attributes('aria-controls')).toBe(tooltip?.id)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(document.querySelector('.help-pop')).toBeNull()
    wrapper.unmount()
  })

  it('clamps the explanation inside the viewport and flips it above the trigger', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 520 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 740 })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('help-btn')) return domRect(500, 720, 20, 20)
      if (this.classList.contains('help-pop')) return domRect(0, 0, 320, 200)
      return domRect(0, 0, 0, 0)
    })

    const wrapper = mount(HelpHint, {
      props: { text: '较长的说明内容。' },
      attachTo: document.body,
      global: { plugins: [i18n] },
    })

    await wrapper.find('.help-btn').trigger('click')
    await flushPromises()

    const tooltip = document.querySelector<HTMLElement>('.help-pop')
    expect(tooltip?.style.left).toBe('188px')
    expect(tooltip?.style.top).toBe('512px')

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(document.querySelector('.help-pop')).toBeNull()
    wrapper.unmount()
  })
})
