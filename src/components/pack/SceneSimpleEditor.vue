<script setup lang="ts">
import HelpHint from '../HelpHint.vue'
import type { SceneEditorEntry } from '../../lib/scenePackUser'
import { normalizeSceneId } from '../../lib/scenePackUser'
import { useI18n } from 'vue-i18n'

const entries = defineModel<SceneEditorEntry[]>('entries', { required: true })

const { t } = useI18n()

function addScene(): void {
  const base = `scene_${entries.value.length + 1}`
  entries.value = [
    ...entries.value,
    {
      sceneId: base,
      displayName: base,
      activitySetting: '',
      scenePrompt: '',
      welcomeMessage: '',
      monologues: [],
    },
  ]
}

function removeScene(index: number): void {
  if (entries.value.length <= 1) return
  entries.value = entries.value.filter((_, i) => i !== index)
}

function onSceneIdInput(index: number, raw: string): void {
  const next = [...entries.value]
  const item = next[index]
  if (!item) return
  next[index] = { ...item, sceneId: normalizeSceneId(raw) || item.sceneId }
  entries.value = next
}

function addMonologue(index: number): void {
  const entry = entries.value[index]
  if (!entry) return
  entry.monologues = [...(entry.monologues ?? []), '']
}

function removeMonologue(sceneIndex: number, monologueIndex: number): void {
  const entry = entries.value[sceneIndex]
  if (!entry) return
  entry.monologues = (entry.monologues ?? []).filter((_, index) => index !== monologueIndex)
}
</script>

<template>
  <div class="scene-editor">
    <div class="section-head">
      <h3 class="section-title">{{ t('sceneEditor.sectionTitle') }}</h3>
      <p class="section-lead">{{ t('sceneEditor.sectionLead') }}</p>
    </div>
    <HelpHint :paragraphs="[t('sceneEditor.hint')]" />

    <div v-for="(entry, index) in entries" :key="`${entry.sceneId}-${index}`" class="scene-card">
      <div class="scene-card-head">
        <h4 class="scene-card-title">{{ t('sceneEditor.sceneCardTitle', { index: index + 1 }) }}</h4>
        <button
          v-if="entries.length > 1"
          type="button"
          class="btn-remove"
          @click="removeScene(index)"
        >
          {{ t('sceneEditor.removeScene') }}
        </button>
      </div>

      <div class="field-row two">
        <div class="field-block">
          <label class="field-label">{{ t('sceneEditor.sceneIdLabel') }}</label>
          <p class="field-hint">{{ t('sceneEditor.sceneIdHint') }}</p>
          <input
            :value="entry.sceneId"
            type="text"
            spellcheck="false"
            autocomplete="off"
            :placeholder="t('sceneEditor.sceneIdPlaceholder')"
            @input="onSceneIdInput(index, ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="field-block">
          <label class="field-label">{{ t('sceneEditor.displayNameLabel') }}</label>
          <p class="field-hint">{{ t('sceneEditor.displayNameHint') }}</p>
          <input v-model="entry.displayName" type="text" :placeholder="t('sceneEditor.displayNamePlaceholder')" />
        </div>
      </div>

      <div class="field-block">
        <label class="field-label">{{ t('sceneEditor.activitySettingLabel') }}</label>
        <p class="field-hint">{{ t('sceneEditor.activitySettingHint') }}</p>
        <textarea
          v-model="entry.activitySetting"
          class="field-ta"
          rows="4"
          spellcheck="true"
          :placeholder="t('sceneEditor.activitySettingPlaceholder')"
        />
        <p class="field-file">{{ t('sceneEditor.activitySettingPath') }}</p>
      </div>

      <div class="field-block">
        <label class="field-label">{{ t('sceneEditor.scenePromptLabel') }}</label>
        <p class="field-hint">{{ t('sceneEditor.scenePromptHint') }}</p>
        <textarea
          v-model="entry.scenePrompt"
          class="field-ta"
          rows="6"
          spellcheck="true"
          :placeholder="t('sceneEditor.scenePromptPlaceholder')"
        />
        <p class="field-file">{{ t('sceneEditor.scenePromptPath', { id: entry.sceneId || '…' }) }}</p>
      </div>

      <div class="field-block">
        <label class="field-label">{{ t('sceneEditor.welcomeMessageLabel') }}</label>
        <p class="field-hint">{{ t('sceneEditor.welcomeMessageHint') }}</p>
        <textarea
          v-model="entry.welcomeMessage"
          class="field-ta"
          rows="4"
          spellcheck="true"
          :placeholder="t('sceneEditor.welcomeMessagePlaceholder')"
        />
      </div>

      <div class="field-block">
        <div class="monologue-heading">
          <div>
            <label class="field-label">{{ t('sceneEditor.monologuesLabel') }}</label>
            <p class="field-hint">{{ t('sceneEditor.monologuesHint') }}</p>
          </div>
          <button type="button" class="btn-add" @click="addMonologue(index)">
            {{ t('sceneEditor.addMonologue') }}
          </button>
        </div>
        <div
          v-for="(_, monologueIndex) in entry.monologues ?? []"
          :key="monologueIndex"
          class="monologue-row"
        >
          <textarea
            v-model="entry.monologues![monologueIndex]"
            class="field-ta"
            rows="3"
            spellcheck="true"
            :aria-label="String(t('sceneEditor.monologueAria', { index: monologueIndex + 1 }))"
          />
          <button
            type="button"
            class="btn-remove"
            @click="removeMonologue(index, monologueIndex)"
          >
            {{ t('sceneEditor.removeMonologue') }}
          </button>
        </div>
      </div>
    </div>

    <button type="button" class="btn-add" @click="addScene">{{ t('sceneEditor.addScene') }}</button>
  </div>
</template>

<style scoped>
.scene-editor {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.section-head {
  margin-bottom: 0.1rem;
}
.section-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
}
.section-lead {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--fluent-text-secondary);
}
.scene-card {
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: var(--fluent-surface-secondary, rgba(255, 255, 255, 0.02));
}
.scene-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.scene-card-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
}
.btn-remove {
  font-size: 0.72rem;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  border: 1px solid var(--fluent-border-control);
  background: transparent;
  color: var(--fluent-text-secondary);
  cursor: pointer;
}
.field-row.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
@media (max-width: 720px) {
  .field-row.two {
    grid-template-columns: 1fr;
  }
}
.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
}
.field-hint {
  margin: 0;
  font-size: 0.72rem;
  color: var(--fluent-text-secondary);
}
.field-block input {
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  font-size: 0.82rem;
}
.field-ta {
  width: 100%;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  font-size: 0.82rem;
  line-height: 1.45;
  resize: vertical;
}
.field-file {
  margin: 0;
  font-size: 0.68rem;
  color: var(--fluent-text-secondary);
}
.btn-add {
  align-self: flex-start;
  font-size: 0.78rem;
  padding: 0.35rem 0.65rem;
  border-radius: var(--fluent-radius);
  border: 1px dashed var(--fluent-border-control);
  background: transparent;
  cursor: pointer;
}
.monologue-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.monologue-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.5rem;
}
</style>
