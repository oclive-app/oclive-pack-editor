<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { emptyAuthorRecRow, type AuthorRecRow } from '../../lib/authorPack'
import HelpHint from '../HelpHint.vue'

const summary = defineModel<string>('summary', { required: true })
const detailMarkdown = defineModel<string>('detailMarkdown', { required: true })
const rows = defineModel<AuthorRecRow[]>('rows', { required: true })
const includeSuggestedUi = defineModel<boolean>('includeSuggestedUi', { required: true })
const suggestedBackendsJson = defineModel<string>('suggestedBackendsJson', { required: true })
const { t } = useI18n()

function addRow(): void {
  rows.value = [...rows.value, emptyAuthorRecRow()]
}

function removeRow(index: number): void {
  const next = rows.value.filter((_, rowIndex) => rowIndex !== index)
  rows.value = next.length ? next : [emptyAuthorRecRow()]
}

function updateRow(index: number, field: keyof AuthorRecRow, event: Event): void {
  const value = (event.target as HTMLInputElement).value
  rows.value = rows.value.map((row, rowIndex) => (
    rowIndex === index ? { ...row, [field]: value } : row
  ))
}
</script>

<template>
  <div class="author-editor">
    <div class="section-head">
      <h2><code>author.json</code> <HelpHint :paragraphs="[String(t('advancedCreation.author.help.file'))]" /></h2>
      <p>{{ t('simpleCreation.author.desc') }}</p>
    </div>
    <label><span>{{ t('simpleCreation.author.oneLineSummaryLabel') }} <HelpHint :paragraphs="[String(t('advancedCreation.author.help.summary'))]" /></span><input v-model="summary" type="text" :placeholder="String(t('simpleCreation.author.oneLineSummaryPlaceholder'))" /></label>
    <label><span>{{ t('simpleCreation.author.detailMarkdownLabel') }} <HelpHint :paragraphs="[String(t('advancedCreation.author.help.detail'))]" /></span><textarea v-model="detailMarkdown" rows="8" :placeholder="String(t('simpleCreation.author.detailMarkdownPlaceholder'))" /></label>

    <div class="rows-head">
      <h3>{{ t('simpleCreation.author.recommendedDirectoryPluginsLabel') }} <HelpHint :paragraphs="[String(t('advancedCreation.author.help.plugins'))]" /></h3>
      <button type="button" @click="addRow">{{ t('simpleCreation.author.addRow') }}</button>
    </div>
    <div v-for="(row, index) in rows" :key="index" class="plugin-row">
      <input :value="row.id" type="text" :placeholder="String(t('simpleCreation.author.row.pluginIdPlaceholder'))" @input="updateRow(index, 'id', $event)" />
      <input :value="row.version_range" type="text" :placeholder="String(t('simpleCreation.author.row.versionRangePlaceholder'))" @input="updateRow(index, 'version_range', $event)" />
      <input :value="row.note" type="text" :placeholder="String(t('simpleCreation.author.row.notePlaceholder'))" @input="updateRow(index, 'note', $event)" />
      <button type="button" @click="removeRow(index)">{{ t('simpleCreation.author.removeRow') }}</button>
    </div>
    <label class="check"><input v-model="includeSuggestedUi" type="checkbox" />{{ t('simpleCreation.author.includeSuggestedUi') }} <HelpHint :paragraphs="[String(t('advancedCreation.author.help.suggestedUi'))]" /></label>
    <label><span>{{ t('simpleCreation.author.suggestedPluginBackendsLabel') }} <HelpHint :paragraphs="[String(t('advancedCreation.author.help.backends'))]" /></span><textarea v-model="suggestedBackendsJson" rows="8" spellcheck="false" :placeholder="String(t('simpleCreation.author.suggestedPluginBackendsPlaceholder'))" /></label>
  </div>
</template>

<style scoped>
.author-editor { padding: 1rem; display: grid; gap: .9rem; }
.section-head h2, .rows-head h3, label > span { display: flex; align-items: center; gap: .4rem; }
.section-head h2 { margin: 0; font-size: 1.05rem; }
.section-head p { color: var(--fluent-text-secondary); font-size: .8125rem; line-height: 1.5; }
label > span { margin-bottom: .35rem; font-size: .8125rem; }
label input, label textarea { width: 100%; box-sizing: border-box; }
.rows-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.rows-head h3 { margin: 0; font-size: .9rem; }
.plugin-row { display: grid; grid-template-columns: 1.2fr .8fr 1.4fr auto; gap: .5rem; }
.check { display: flex; align-items: center; gap: .4rem; font-size: .8125rem; }
.check input { width: auto; }
@media (max-width: 760px) { .plugin-row { grid-template-columns: 1fr; } }
</style>
