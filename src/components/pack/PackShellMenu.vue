<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AppLocale } from '../../i18n'
import type { ThemePreference } from '../../composables/usePackShellPreferences'

const props = defineProps<{
  locale: AppLocale
  theme: ThemePreference
}>()

const emit = defineEmits<{
  'update:locale': [v: AppLocale]
  'update:theme': [v: ThemePreference]
}>()

const { t } = useI18n()

type MenuKind = 'locale' | 'theme' | null

const openMenu = ref<MenuKind>(null)
const localeRoot = ref<HTMLElement | null>(null)
const themeRoot = ref<HTMLElement | null>(null)
const localeToggle = ref<HTMLElement | null>(null)
const themeToggle = ref<HTMLElement | null>(null)
const menuStyle = ref({ top: '0px', left: '0px', minWidth: '10rem' })

const localeLabel = computed(() => {
  if (props.locale === 'system') return String(t('common.system'))
  if (props.locale === 'zh-CN') return String(t('common.zhCN'))
  return String(t('common.enUS'))
})

const themeLabel = computed(() => {
  if (props.theme === 'system') return String(t('packEditor.header.themeLabels.system'))
  if (props.theme === 'dark') return String(t('packEditor.header.themeLabels.dark'))
  return String(t('packEditor.header.themeLabels.light'))
})

const themeIcon = computed(() => {
  if (props.theme === 'system') return '◐'
  if (props.theme === 'dark') return '🌙'
  return '☀️'
})

const localeOptions: { value: AppLocale; labelKey: string }[] = [
  { value: 'system', labelKey: 'common.system' },
  { value: 'zh-CN', labelKey: 'common.zhCN' },
  { value: 'en-US', labelKey: 'common.enUS' },
]

const themeOptions: { value: ThemePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'packEditor.header.themeLabels.system' },
  { value: 'light', labelKey: 'packEditor.header.themeLabels.light' },
  { value: 'dark', labelKey: 'packEditor.header.themeLabels.dark' },
]

function toggleMenu(kind: MenuKind): void {
  openMenu.value = openMenu.value === kind ? null : kind
}

function closeMenus(): void {
  openMenu.value = null
}

function updateMenuPosition(): void {
  const btn = openMenu.value === 'locale' ? localeToggle.value : themeToggle.value
  if (!btn) return
  const viewportMargin = 8
  const gap = 4
  const rect = btn.getBoundingClientRect()
  const menuWidth = Math.min(Math.max(rect.width, 168), window.innerWidth - viewportMargin * 2)
  const menu = document.querySelector<HTMLElement>(
    `.pack-shell-menu-dropdown[data-menu-kind="${openMenu.value}"]`,
  )
  const menuHeight = menu?.getBoundingClientRect().height ?? 0
  const belowTop = rect.bottom + gap
  const aboveTop = rect.top - menuHeight - gap
  const preferredTop = menuHeight > 0 && belowTop + menuHeight > window.innerHeight - viewportMargin
    ? Math.max(viewportMargin, aboveTop)
    : belowTop
  const top = menuHeight > 0
    ? Math.min(
        Math.max(viewportMargin, preferredTop),
        Math.max(viewportMargin, window.innerHeight - menuHeight - viewportMargin),
      )
    : preferredTop
  menuStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(Math.min(
      Math.max(viewportMargin, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportMargin,
    ))}px`,
    minWidth: `${menuWidth}px`,
  }
}

watch(openMenu, async (kind) => {
  if (!kind) return
  await nextTick()
  updateMenuPosition()
})

function onDocClick(e: MouseEvent): void {
  const target = e.target as Node
  if (localeRoot.value?.contains(target) || themeRoot.value?.contains(target)) return
  const teleported = document.querySelector('.pack-shell-menu-dropdown')
  if (teleported?.contains(target)) return
  closeMenus()
}

function onScrollOrResize(): void {
  if (openMenu.value) updateMenuPosition()
}

function pickLocale(v: AppLocale): void {
  emit('update:locale', v)
  closeMenus()
}

function pickTheme(v: ThemePreference): void {
  emit('update:theme', v)
  closeMenus()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})
</script>

<template>
  <div class="pack-shell-menu">
    <div ref="localeRoot" class="psm-split">
      <button
        ref="localeToggle"
        type="button"
        class="psm-btn"
        :aria-expanded="openMenu === 'locale'"
        :aria-label="String(t('packEditor.shellMenu.localeAria'))"
        @click.stop="toggleMenu('locale')"
      >
        <span class="psm-label">{{ localeLabel }}</span>
        <span class="psm-caret" aria-hidden="true">▾</span>
      </button>
    </div>

    <div ref="themeRoot" class="psm-split">
      <button
        ref="themeToggle"
        type="button"
        class="psm-btn psm-btn--theme"
        :aria-expanded="openMenu === 'theme'"
        :title="String(t('packEditor.header.themeTitle', { label: themeLabel }))"
        :aria-label="String(t('packEditor.shellMenu.themeAria'))"
        @click.stop="toggleMenu('theme')"
      >
        <span class="psm-icon" aria-hidden="true">{{ themeIcon }}</span>
        <span class="psm-label">{{ themeLabel }}</span>
        <span class="psm-caret" aria-hidden="true">▾</span>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="openMenu === 'locale'"
        class="pack-shell-menu-dropdown pha-export-menu--teleport"
        data-menu-kind="locale"
        role="menu"
        :aria-label="String(t('packEditor.shellMenu.localeMenuAria'))"
        :style="{
          position: 'fixed',
          top: menuStyle.top,
          left: menuStyle.left,
          minWidth: menuStyle.minWidth,
          zIndex: 100,
        }"
      >
        <button
          v-for="opt in localeOptions"
          :key="opt.value"
          type="button"
          class="psm-menu-item"
          :class="{ 'psm-menu-item--active': locale === opt.value }"
          role="menuitemradio"
          :aria-checked="locale === opt.value"
          @click="pickLocale(opt.value)"
        >
          {{ t(opt.labelKey) }}
        </button>
      </div>
      <div
        v-if="openMenu === 'theme'"
        class="pack-shell-menu-dropdown pha-export-menu--teleport"
        data-menu-kind="theme"
        role="menu"
        :aria-label="String(t('packEditor.shellMenu.themeMenuAria'))"
        :style="{
          position: 'fixed',
          top: menuStyle.top,
          left: menuStyle.left,
          minWidth: menuStyle.minWidth,
          zIndex: 100,
        }"
      >
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          type="button"
          class="psm-menu-item"
          :class="{ 'psm-menu-item--active': theme === opt.value }"
          role="menuitemradio"
          :aria-checked="theme === opt.value"
          @click="pickTheme(opt.value)"
        >
          {{ t(opt.labelKey) }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.pack-shell-menu {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.psm-split {
  display: inline-flex;
}

.psm-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  min-height: 30px;
  border-radius: var(--fluent-radius);
  border: 1px solid var(--pack-glass-border);
  background: var(--pack-glass-fill-strong);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  color: var(--fluent-text-primary);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: var(--fluent-font);
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.psm-btn:hover {
  background: var(--fluent-bg-subtle);
  border-color: var(--fluent-text-secondary);
}

.psm-btn:focus-visible {
  outline: none;
  box-shadow:
    var(--fluent-shadow-soft),
    var(--pack-glass-inset),
    0 0 0 2px rgba(255, 255, 255, 0.92),
    0 0 0 4px var(--fluent-border-focus);
}

.psm-label {
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.psm-icon {
  font-size: 0.95rem;
  line-height: 1;
}

.psm-caret {
  font-size: 0.65rem;
  opacity: 0.75;
}
</style>

<style>
.pack-shell-menu-dropdown {
  box-sizing: border-box;
  max-width: calc(100vw - 1rem);
  max-height: min(70vh, 22rem);
  overflow-y: auto;
  padding: 0.3rem;
  border: 1px solid var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-bg-card) 92%, transparent);
  backdrop-filter: blur(12px) saturate(110%);
  -webkit-backdrop-filter: blur(12px) saturate(110%);
  box-shadow:
    var(--fluent-shadow-card),
    0 14px 32px color-mix(in srgb, var(--fluent-text-primary) 12%, transparent);
}

.pack-shell-menu-dropdown .psm-menu-item {
  display: block;
  width: 100%;
  padding: 0.45rem 0.85rem 0.45rem 0.75rem;
  border: none;
  border-left: 3px solid transparent;
  border-radius: calc(var(--fluent-radius-lg) - 0.3rem);
  background: transparent;
  color: var(--fluent-text-primary);
  font-size: 0.8125rem;
  font-family: var(--fluent-font);
  text-align: left;
  cursor: pointer;
}

.pack-shell-menu-dropdown .psm-menu-item:hover {
  background: var(--fluent-bg-subtle);
}

.pack-shell-menu-dropdown .psm-menu-item--active {
  border-left-color: var(--fluent-accent);
  background: color-mix(in srgb, var(--fluent-accent-subtle) 45%, transparent);
  font-weight: 600;
}
</style>
