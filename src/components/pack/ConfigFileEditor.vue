<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HelpHint from '../HelpHint.vue'

const model = defineModel<string>({ required: true })
const { t } = useI18n()

const parseState = computed(() => {
  try {
    const value = JSON.parse(model.value) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return {
      valid: true,
      keys: Object.keys(value as Record<string, unknown>),
    }
  } catch {
    return { valid: false, keys: [] as string[] }
  }
})
</script>

<template>
  <div class="config-editor">
    <div class="section-head">
      <h2><code>config.json</code> <HelpHint :paragraphs="[String(t('advancedCreation.config.help'))]" /></h2>
      <p>{{ t('advancedCreation.config.desc') }}</p>
    </div>
    <p class="preserve-note">{{ t('advancedCreation.config.preserveNote') }}</p>
    <p v-if="!parseState.valid" class="error" role="alert">{{ t('advancedCreation.config.invalid') }}</p>
    <div v-else class="key-list">
      <span v-if="parseState.keys.length === 0">{{ t('advancedCreation.config.empty') }}</span>
      <code v-for="key in parseState.keys" :key="key">{{ key }}</code>
    </div>
    <label class="source-label" for="config-json-source">{{ t('advancedCreation.files.rawSource') }}</label>
    <textarea id="config-json-source" v-model="model" rows="28" spellcheck="false" />
  </div>
</template>

<style scoped>
.config-editor { padding: 1rem; }
.section-head h2 { display: flex; align-items: center; gap: .4rem; margin: 0; font-size: 1.05rem; }
.section-head p, .preserve-note { color: var(--fluent-text-secondary); font-size: .8125rem; line-height: 1.5; }
.preserve-note { padding: .65rem .75rem; border-radius: var(--fluent-radius-md); background: color-mix(in srgb, var(--fluent-accent) 8%, transparent); }
.key-list { display: flex; flex-wrap: wrap; gap: .45rem; margin: .8rem 0; color: var(--fluent-text-secondary); font-size: .75rem; }
.key-list code { padding: .2rem .4rem; border: 1px solid var(--fluent-border-stroke); border-radius: .3rem; }
.source-label { display: block; margin: .7rem 0 .35rem; font-size: .8125rem; }
textarea { width: 100%; box-sizing: border-box; font-family: var(--fluent-font-mono, monospace); }
.error { color: var(--fluent-danger-text, #d13438); }
</style>
