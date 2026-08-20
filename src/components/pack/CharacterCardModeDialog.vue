<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CharacterCardConversionReport } from '../../lib/characterCardImport'

defineProps<{
  open: boolean
  report: CharacterCardConversionReport | null
}>()

const emit = defineEmits<{
  simple: []
  advanced: []
  cancel: []
}>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && report"
      class="character-card-mode-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="String(t('packEditor.characterCardMode.title'))"
      @click="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <div class="character-card-mode-card" @click.stop>
        <p class="character-card-mode-kicker">{{ t('packEditor.characterCardMode.kicker') }}</p>
        <h2 class="character-card-mode-title">{{ t('packEditor.characterCardMode.title') }}</h2>
        <p class="character-card-mode-lead">
          {{
            t('packEditor.characterCardMode.lead', {
              roleId: report.roleId,
              format: t(`simpleCreation.characterCardImport.formats.${report.sourceFormat}`),
            })
          }}
        </p>
        <p class="character-card-mode-note">{{ t('packEditor.characterCardMode.sameDraft') }}</p>

        <div class="character-card-mode-options">
          <button
            type="button"
            class="character-card-mode-option character-card-mode-option--primary"
            data-mode="simple"
            @click="emit('simple')"
          >
            <span class="character-card-mode-option-heading">
              <span>{{ t('packEditor.characterCardMode.simpleTitle') }}</span>
              <span class="character-card-mode-badge">{{ t('packEditor.characterCardMode.recommended') }}</span>
            </span>
            <span class="character-card-mode-option-desc">{{ t('packEditor.characterCardMode.simpleDesc') }}</span>
          </button>

          <button
            type="button"
            class="character-card-mode-option"
            data-mode="advanced"
            @click="emit('advanced')"
          >
            <span class="character-card-mode-option-heading">
              <span>{{ t('packEditor.characterCardMode.advancedTitle') }}</span>
            </span>
            <span class="character-card-mode-option-desc">{{ t('packEditor.characterCardMode.advancedDesc') }}</span>
          </button>
        </div>

        <button type="button" class="character-card-mode-later" @click="emit('cancel')">
          {{ t('packEditor.characterCardMode.later') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.character-card-mode-backdrop {
  position: fixed;
  inset: 0;
  z-index: 115;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.5);
}

.character-card-mode-card {
  width: min(38rem, 100%);
  max-height: min(90vh, 44rem);
  overflow-y: auto;
  padding: 1.45rem;
  border: 1px solid var(--pack-glass-border);
  border-radius: var(--fluent-radius-lg);
  background: var(--fluent-bg-card);
  box-shadow: var(--fluent-shadow-card);
}

.character-card-mode-kicker {
  margin: 0 0 0.3rem;
  color: var(--fluent-accent);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.character-card-mode-title {
  margin: 0;
  color: var(--fluent-text-primary);
  font-size: 1.2rem;
}

.character-card-mode-lead,
.character-card-mode-note {
  color: var(--fluent-text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
  word-break: break-word;
}

.character-card-mode-lead {
  margin: 0.65rem 0 0;
}

.character-card-mode-note {
  margin: 0.35rem 0 1rem;
}

.character-card-mode-options {
  display: grid;
  gap: 0.7rem;
}

.character-card-mode-option {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid var(--pack-glass-border);
  border-radius: var(--fluent-radius);
  background: var(--pack-glass-fill-strong);
  color: var(--fluent-text-primary);
  font-family: var(--fluent-font);
  text-align: left;
  cursor: pointer;
}

.character-card-mode-option:hover {
  border-color: color-mix(in srgb, var(--fluent-accent) 62%, var(--pack-glass-border));
  background: var(--fluent-bg-subtle);
}

.character-card-mode-option--primary {
  border-color: color-mix(in srgb, var(--fluent-accent) 55%, var(--pack-glass-border));
}

.character-card-mode-option-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.9rem;
  font-weight: 650;
}

.character-card-mode-badge {
  flex: 0 0 auto;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fluent-accent) 16%, transparent);
  color: var(--fluent-accent);
  font-size: 0.7rem;
  font-weight: 700;
}

.character-card-mode-option-desc {
  color: var(--fluent-text-secondary);
  font-size: 0.8rem;
  line-height: 1.5;
}

.character-card-mode-later {
  display: block;
  margin: 0.9rem auto 0;
  padding: 0.35rem 0.7rem;
  border: 0;
  background: transparent;
  color: var(--fluent-text-secondary);
  font-family: var(--fluent-font);
  font-size: 0.8rem;
  cursor: pointer;
}

.character-card-mode-later:hover {
  color: var(--fluent-text-primary);
}
</style>
