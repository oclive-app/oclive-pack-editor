<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  /** 点击问号后显示的说明；可用连续两个换行分段，或传 `paragraphs` */
  text?: string
  /** 多段说明（优先展示）；每段单独成段，便于阅读 */
  paragraphs?: readonly string[]
}>()

const segments = computed(() => {
  if (props.paragraphs?.length) {
    return props.paragraphs.map((s) => s.trim()).filter(Boolean)
  }
  const t = props.text?.trim() ?? ''
  if (!t) return []
  return t
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
})

const { t } = useI18n()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const popover = ref<HTMLElement | null>(null)
const popoverId = `help-hint-${useId().replaceAll(':', '')}`
const popoverStyle = ref({ top: '0px', left: '0px' })

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function updatePopoverPosition(): void {
  if (!open.value || !trigger.value || !popover.value) return

  const viewportMargin = 12
  const gap = 8
  const triggerRect = trigger.value.getBoundingClientRect()
  const popoverRect = popover.value.getBoundingClientRect()
  const left = clamp(
    triggerRect.left,
    viewportMargin,
    window.innerWidth - popoverRect.width - viewportMargin,
  )

  const belowTop = triggerRect.bottom + gap
  const aboveTop = triggerRect.top - popoverRect.height - gap
  const roomBelow = window.innerHeight - belowTop - viewportMargin
  const roomAbove = triggerRect.top - gap - viewportMargin
  const preferredTop = popoverRect.height > roomBelow && roomAbove > roomBelow ? aboveTop : belowTop

  popoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(clamp(
      preferredTop,
      viewportMargin,
      window.innerHeight - popoverRect.height - viewportMargin,
    ))}px`,
  }
}

function toggle(e: Event) {
  e.stopPropagation()
  open.value = !open.value
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as Node
  if (root.value?.contains(target) || popover.value?.contains(target)) return
  open.value = false
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

function onViewportChange(): void {
  updatePopoverPosition()
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  updatePopoverPosition()
})

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKeydown)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onDocKeydown)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<template>
  <span ref="root" class="help-hint">
    <button
      ref="trigger"
      type="button"
      class="help-btn"
      :aria-expanded="open"
      :aria-controls="open && segments.length ? popoverId : undefined"
      :aria-describedby="open && segments.length ? popoverId : undefined"
      :aria-label="String(t('helpHint.ariaLabel'))"
      @click="toggle"
    >
      ?
    </button>
    <Teleport to="body">
      <div
        v-if="open && segments.length"
        :id="popoverId"
        ref="popover"
        class="help-pop"
        role="tooltip"
        :style="popoverStyle"
      >
        <p v-for="(seg, i) in segments" :key="i" class="help-pop-p">{{ seg }}</p>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.help-hint {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-left: 0.3rem;
  position: relative;
}

.help-btn {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--fluent-border-control) 85%, rgba(255, 255, 255, 0.25));
  background: color-mix(in srgb, var(--fluent-bg-card) 80%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: var(--fluent-text-secondary);
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--fluent-text-primary) 6%, transparent);
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.help-btn:hover {
  border-color: color-mix(in srgb, var(--fluent-border-focus) 45%, var(--fluent-border-control));
  color: var(--fluent-text-primary);
  background: color-mix(in srgb, var(--fluent-bg-subtle) 82%, transparent);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--fluent-text-primary) 16%, transparent);
}

.help-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--fluent-bg-page),
    0 0 0 4px var(--fluent-border-focus);
}

.help-pop {
  position: fixed;
  z-index: 90;
  width: max-content;
  min-width: min(20rem, calc(100vw - 2rem));
  max-width: min(34rem, calc(100vw - 1.5rem));
  padding: 0.7rem 0.95rem;
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.55;
  color: var(--fluent-text-primary);
  background: color-mix(in srgb, var(--fluent-bg-card) 96%, transparent);
  backdrop-filter: blur(12px) saturate(108%);
  -webkit-backdrop-filter: blur(12px) saturate(108%);
  border: 1px solid var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-lg);
  box-shadow:
    var(--fluent-shadow-card),
    0 14px 36px color-mix(in srgb, var(--fluent-text-primary) 10%, transparent);
  animation: help-pop-in 0.18s ease-out;
  max-height: min(70vh, 26rem);
  overflow-y: auto;
}

@keyframes help-pop-in {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.help-pop-p {
  margin: 0 0 0.55rem;
}

.help-pop-p:last-child {
  margin-bottom: 0;
}
</style>
