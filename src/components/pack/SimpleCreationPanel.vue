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
import type {
  CharacterCardConversionReport,
  CharacterCardReportCode,
} from '../../lib/characterCardImport'

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
  characterCardImportReport: CharacterCardConversionReport | null
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

function reportItem(code: CharacterCardReportCode): string {
  return String(t(`simpleCreation.characterCardImport.items.${code}`))
}
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

    <details v-if="characterCardImportReport" class="conversion-report" open>
      <summary>
        {{ t('simpleCreation.characterCardImport.title') }}
        <span class="conversion-format">
          {{ t(`simpleCreation.characterCardImport.formats.${characterCardImportReport.sourceFormat}`) }}
        </span>
      </summary>
      <p class="conversion-source">
        {{
          t('simpleCreation.characterCardImport.source', {
            file: characterCardImportReport.sourceFileName,
            roleId: characterCardImportReport.roleId,
          })
        }}
      </p>
      <div class="conversion-groups">
        <section>
          <h3>{{ t('simpleCreation.characterCardImport.convertedTitle') }}</h3>
          <ul>
            <li v-for="code in characterCardImportReport.converted" :key="`converted-${code}`">
              {{ reportItem(code) }}
            </li>
          </ul>
        </section>
        <section v-if="characterCardImportReport.review.length">
          <h3>{{ t('simpleCreation.characterCardImport.reviewTitle') }}</h3>
          <ul>
            <li v-for="code in characterCardImportReport.review" :key="`review-${code}`">
              {{ reportItem(code) }}
            </li>
          </ul>
        </section>
      </div>
    </details>

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

      <div class="reply-quality-box">
        <div class="reply-quality-heading">
          <div class="label-hint-row">
            <span class="field-label">{{ t('simpleCreation.base.replyQualityTitle') }}</span>
            <HelpHint :paragraphs="[String(t('simpleCreation.base.replyQualityHelp'))]" />
          </div>
          <label class="reply-quality-switch">
            <input v-model="simpleS.customReplyQualityEnabled" type="checkbox" />
            <span>{{ t('simpleCreation.base.replyQualityCustom') }}</span>
          </label>
        </div>
        <p class="reply-quality-desc">
          {{
            t(
              simpleS.customReplyQualityEnabled
                ? 'simpleCreation.base.replyQualityCustomDesc'
                : 'simpleCreation.base.replyQualityDefaultDesc',
            )
          }}
        </p>
        <textarea
          v-if="simpleS.customReplyQualityEnabled"
          id="reply-quality-ta"
          v-model="simpleS.replyQualityAnchor"
          rows="14"
          class="txt reply-quality-textarea"
          spellcheck="false"
          :aria-label="String(t('simpleCreation.base.replyQualityTextareaLabel'))"
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
.conversion-report {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--fluent-accent) 48%, var(--fluent-border-stroke));
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-accent) 8%, var(--fluent-bg-card));
}
.conversion-report summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}
.conversion-format {
  margin-left: 0.4rem;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fluent-accent) 14%, transparent);
  color: var(--fluent-text-secondary);
  font-size: 0.72rem;
  font-weight: 500;
}
.conversion-source {
  margin: 0.55rem 0;
  color: var(--fluent-text-secondary);
  font-size: 0.78rem;
  line-height: 1.5;
}
.conversion-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.75rem;
}
.conversion-groups section {
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-md);
  background: color-mix(in srgb, var(--fluent-bg-card) 88%, transparent);
}
.conversion-groups h3 {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
}
.conversion-groups ul {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--fluent-text-secondary);
  font-size: 0.76rem;
  line-height: 1.5;
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
.reply-quality-box {
  margin-top: 0.85rem;
  padding: 0.75rem;
  border: 1px solid var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-md);
  background: color-mix(in srgb, var(--fluent-accent) 5%, var(--fluent-bg-card));
}
.reply-quality-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}
.reply-quality-heading .label-hint-row {
  margin-bottom: 0;
}
.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--fluent-text-primary);
}
.reply-quality-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: var(--fluent-text-secondary);
  cursor: pointer;
}
.reply-quality-desc {
  margin: 0.45rem 0 0;
  color: var(--fluent-text-secondary);
  font-size: 0.8125rem;
  line-height: 1.5;
}
.reply-quality-textarea {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: min(16rem, 100%);
  height: clamp(18rem, 42vh, 32rem);
  min-height: 8rem !important;
  margin-top: 0.65rem;
  box-sizing: border-box;
  font-family: var(--fluent-font-mono, monospace) !important;
  line-height: 1.6;
  overflow: auto;
  resize: both;
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
