<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AdvFaqList from '../AdvFaqList.vue'
import HelpHint from '../HelpHint.vue'
import PortraitCatalogEditor from './PortraitCatalogEditor.vue'
import WorldKnowledgeSimpleEditor from './WorldKnowledgeSimpleEditor.vue'
import { SIMPLE_BASE_FAQ } from '../../lib/simpleEditorFaq'
import {
  SIMPLE_BASE_INTRO,
  SIMPLE_CORE_PERSONALITY,
  SIMPLE_FIELD_DISPLAY_NAME,
  SIMPLE_FIELD_ROLE_ID,
} from '../../lib/simpleCreationHints'
import type { SimpleManifestForm, SimpleSettingsForm } from '../../lib/simpleCreation'
import type { PortraitCatalogEntry, PortraitSlotId } from '../../lib/portraitCatalog'
import type { ExtraEmotionUserChoices } from '../../lib/portraitExtraUser'
import type { WorldKnowledgeTexts } from '../../lib/worldKnowledgeUser'

const { t } = useI18n()

defineProps<{
  simpleM: SimpleManifestForm
  simpleS: SimpleSettingsForm
  syncFormWarning: string
  multiRelationWarning: boolean
  portraitPlaceholderWarning: boolean
  emotionSummary: string
  portraitSlotFiles: Partial<Record<PortraitSlotId, File>>
  portraitExtraEntries: PortraitCatalogEntry[]
}>()

const corePersonality = defineModel<string>('corePersonality', { required: true })
const worldKnowledgeTexts = defineModel<WorldKnowledgeTexts>('worldKnowledgeTexts', { required: true })

const emit = defineEmits<{
  portraitSlotPick: [id: PortraitSlotId, e: Event]
  portraitSlotClear: [id: PortraitSlotId]
  portraitClearAll: []
  portraitExtraAdd: []
  portraitExtraRemove: [index: number]
  portraitExtraApplyChoices: [index: number, choices: ExtraEmotionUserChoices, file?: File]
}>()
</script>

<template>
  <div>
    <p v-if="syncFormWarning" class="sync-warn" role="status">
      {{ t('simpleCreation.syncWarning', { detail: syncFormWarning }) }}
    </p>
    <p v-if="multiRelationWarning" class="sync-warn" role="status">
      {{ t('simpleCreation.manifest.multiRelationWarning') }}
    </p>
    <p v-if="portraitPlaceholderWarning" class="sync-warn" role="status">
      {{ t('simpleCreation.portraits.placeholderWarning') }}
    </p>

    <section class="panel base-panel">
      <div class="section-title-row">
        <h2>{{ t('simpleCreation.base.title') }}</h2>
        <HelpHint :paragraphs="SIMPLE_BASE_INTRO" />
      </div>
      <p class="base-desc">{{ t('simpleCreation.base.desc') }}</p>
      <p class="hint tiny adv-pointer">{{ t('simpleCreation.base.advancedPointer') }}</p>

      <h3 class="h3 essentials-title">{{ t('simpleCreation.base.essentialsTitle') }}</h3>
      <div class="form-row two">
        <div>
          <div class="label-hint-row">
            <label for="f-id-base">{{ t('simpleCreation.manifest.roleIdLabel') }}</label>
            <HelpHint :paragraphs="SIMPLE_FIELD_ROLE_ID" />
          </div>
          <input id="f-id-base" v-model="simpleM.id" type="text" autocomplete="off" />
        </div>
        <div>
          <div class="label-hint-row">
            <label for="f-name-base">{{ t('simpleCreation.manifest.displayNameLabel') }}</label>
            <HelpHint :paragraphs="SIMPLE_FIELD_DISPLAY_NAME" />
          </div>
          <input id="f-name-base" v-model="simpleM.name" type="text" />
        </div>
      </div>

      <div class="form-row">
        <div class="label-hint-row">
          <label for="core-ta">{{ t('simpleCreation.base.corePersonalityLabel') }}</label>
          <HelpHint :paragraphs="SIMPLE_CORE_PERSONALITY" />
        </div>
        <textarea
          id="core-ta"
          v-model="corePersonality"
          rows="8"
          class="txt"
          spellcheck="false"
        />
      </div>

      <p class="runtime-owner-note">
        {{ t('simpleCreation.base.runtimeOwnerNote') }}
      </p>

      <details class="simple-faq-details">
        <summary class="simple-faq-sum">{{ t('simpleCreation.base.faqTitle') }}</summary>
        <AdvFaqList :items="SIMPLE_BASE_FAQ" show-intro />
      </details>
    </section>

    <section class="panel extra-panel">
      <div class="section-title-row">
        <h2>{{ t('simpleCreation.portraits.title') }}</h2>
      </div>
      <p class="section-lead">{{ t('simpleCreation.portraits.lead') }}</p>
      <PortraitCatalogEditor
        :summary="emotionSummary"
        :slot-files="portraitSlotFiles"
        :extra-entries="portraitExtraEntries"
        @pick-slot="(id, e) => emit('portraitSlotPick', id, e)"
        @clear-slot="(id) => emit('portraitSlotClear', id)"
        @clear-all="emit('portraitClearAll')"
        @extra-apply-choices="(index, c, f) => emit('portraitExtraApplyChoices', index, c, f)"
        @extra-add="emit('portraitExtraAdd')"
        @extra-remove="(index) => emit('portraitExtraRemove', index)"
      />
    </section>

    <section class="panel extra-panel">
      <WorldKnowledgeSimpleEditor v-model="worldKnowledgeTexts" />
    </section>
  </div>
</template>

<style scoped>
.sync-warn {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--fluent-warning-text);
  background: var(--fluent-warning-bg);
  border: 1px solid var(--fluent-warning-border);
  border-radius: var(--fluent-radius-lg);
  line-height: 1.45;
}
.base-panel,
.extra-panel {
  margin-top: 1rem;
  padding: 1rem 1.15rem;
  border: 1px solid var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-bg-card) 82%, transparent);
  backdrop-filter: blur(9px) saturate(106%);
  -webkit-backdrop-filter: blur(9px) saturate(106%);
  box-shadow: var(--fluent-shadow-card);
}

.runtime-owner-note {
  margin: 0.85rem 0 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-md);
  color: var(--fluent-text-secondary);
  background: color-mix(in srgb, var(--fluent-accent) 7%, transparent);
  font-size: 0.8125rem;
  line-height: 1.5;
}
.base-panel {
  border-left: 3px solid var(--rail-accent-editor);
  box-shadow:
    var(--fluent-shadow-card),
    inset 0 1px 0 color-mix(in srgb, var(--rail-accent-editor) 22%, transparent);
}
.section-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.15rem;
  margin-bottom: 0.5rem;
}
.section-title-row h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.section-lead {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: var(--fluent-text-secondary);
  line-height: 1.45;
}
.label-hint-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
}
.label-hint-row label {
  margin-bottom: 0;
}
.base-desc {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--fluent-text-secondary);
  line-height: 1.5;
}
.adv-pointer {
  margin: 0 0 0.75rem;
}
.essentials-title {
  margin: 0 0 0.65rem;
  font-size: 0.92rem;
  font-weight: 600;
}
.form-row {
  margin-bottom: 0.65rem;
}
.form-row label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--fluent-text-secondary);
  margin-bottom: 0.25rem;
}
.form-row input[type='text'],
.form-row select,
.form-row .txt {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.6rem;
  min-height: 32px;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  font-size: 0.875rem;
  font-family: var(--fluent-font);
  background: var(--fluent-bg-input);
  color: var(--fluent-text-primary);
}
.form-row input:focus-visible,
.form-row select:focus-visible,
.form-row .txt:focus-visible {
  outline: 2px solid var(--fluent-border-focus);
  outline-offset: -1px;
}
.form-row.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
@media (max-width: 640px) {
  .form-row.two {
    grid-template-columns: 1fr;
  }
}
.hint.tiny {
  font-size: 0.78rem;
  color: var(--fluent-text-secondary);
  line-height: 1.45;
}
.simple-faq-details {
  margin-top: 1rem;
  padding: 0.6rem 0.8rem 0.8rem;
  border: 1px solid var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-bg-subtle) 92%, transparent);
}
.simple-faq-sum {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--fluent-text-primary);
  list-style: none;
}
.simple-faq-details[open] .simple-faq-sum {
  margin-bottom: 0.6rem;
}
.simple-faq-sum::-webkit-details-marker {
  display: none;
}
</style>
