<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HelpHint from '../HelpHint.vue'

const manifestText = defineModel<string>('manifestText', { required: true })
const settingsText = defineModel<string>('settingsText', { required: true })
const deepCapsuleText = defineModel<string>('deepCapsuleText', { required: true })
const systemPromptMarkdown = defineModel<string>('systemPromptMarkdown', { required: true })
const polishPromptMarkdown = defineModel<string>('polishPromptMarkdown', { required: true })
const { t } = useI18n()

function parseRecord(raw: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(raw) as unknown
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

const replyQualityAnchor = computed({
  get(): string {
    const root = parseRecord(settingsText.value)
    return typeof root?.reply_quality_anchor === 'string' ? root.reply_quality_anchor : ''
  },
  set(value: string): void {
    const root = parseRecord(settingsText.value)
    if (!root) return
    if (value.trim()) root.reply_quality_anchor = value
    else delete root.reply_quality_anchor
    settingsText.value = `${JSON.stringify(root, null, 2)}\n`
  },
})

const deepCapsuleEnabled = computed({
  get(): boolean {
    return parseRecord(manifestText.value)?.deep_capsule_enabled === true
  },
  set(value: boolean): void {
    const root = parseRecord(manifestText.value)
    if (!root) return
    if (value) root.deep_capsule_enabled = true
    else delete root.deep_capsule_enabled
    manifestText.value = `${JSON.stringify(root, null, 2)}\n`
  },
})
</script>

<template>
  <div class="prompt-files">
    <div class="section-head">
      <h2>{{ t('advancedCreation.prompts.title') }} <HelpHint :paragraphs="[String(t('advancedCreation.prompts.help.folder'))]" /></h2>
      <p>{{ t('advancedCreation.prompts.desc') }}</p>
    </div>

    <article class="prompt-card">
      <h3><code>prompts/reply_quality_anchor.md</code> <HelpHint :paragraphs="[String(t('advancedCreation.prompts.help.anchor'))]" /></h3>
      <p>{{ t('advancedCreation.prompts.anchorDesc') }}</p>
      <textarea v-model="replyQualityAnchor" rows="8" spellcheck="false" />
    </article>

    <article class="prompt-card">
      <div class="title-row">
        <h3><code>prompts/deep_capsule.txt</code> <HelpHint :paragraphs="[String(t('advancedCreation.prompts.help.capsule'))]" /></h3>
        <label><input v-model="deepCapsuleEnabled" type="checkbox" />{{ t('advancedCreation.prompts.capsuleEnabled') }}</label>
      </div>
      <p>{{ t('advancedCreation.prompts.capsuleDesc') }}</p>
      <textarea v-model="deepCapsuleText" rows="8" spellcheck="false" maxlength="2500" />
      <small>{{ t('advancedCreation.prompts.capsuleCount', { count: deepCapsuleText.length }) }}</small>
    </article>

    <article class="prompt-card">
      <h3><code>prompts/system.md</code> <HelpHint :paragraphs="[String(t('advancedCreation.prompts.help.system'))]" /></h3>
      <p>{{ t('advancedCreation.prompts.systemDesc') }}</p>
      <textarea v-model="systemPromptMarkdown" rows="8" spellcheck="false" />
    </article>

    <article class="prompt-card">
      <h3><code>polish_prompt.md</code> <HelpHint :paragraphs="[String(t('advancedCreation.prompts.help.polish'))]" /></h3>
      <p>{{ t('advancedCreation.prompts.polishDesc') }}</p>
      <textarea v-model="polishPromptMarkdown" rows="8" spellcheck="false" />
    </article>
  </div>
</template>

<style scoped>
.prompt-files { padding: 1rem; display: grid; gap: 1rem; }
.section-head h2, .prompt-card h3 { display: flex; align-items: center; gap: .4rem; margin: 0; }
.section-head h2 { font-size: 1.05rem; }
.prompt-card h3 { font-size: .9rem; }
.section-head p, .prompt-card p, .prompt-card small { color: var(--fluent-text-secondary); font-size: .8125rem; line-height: 1.5; }
.prompt-card { padding: .9rem; border: 1px solid var(--fluent-border-stroke); border-radius: var(--fluent-radius-lg); background: var(--fluent-bg-card); }
.prompt-card textarea { width: 100%; box-sizing: border-box; font-family: var(--fluent-font-mono, monospace); }
.title-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.title-row label { display: flex; align-items: center; gap: .4rem; white-space: nowrap; font-size: .8125rem; }
</style>
