<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HelpHint from '../HelpHint.vue'

type OptionalNumber = number | ''

type InferenceForm = {
  temperature: OptionalNumber
  topP: OptionalNumber
  preferredOutputTokens: OptionalNumber
  maximumOutputTokens: OptionalNumber
  minimumContextTokens: OptionalNumber
  preferredContextTokens: OptionalNumber
  reasoningMode: '' | 'instant' | 'adaptive' | 'deep'
  reasoningEffort: OptionalNumber
  priority: '' | 'latency' | 'balanced' | 'quality'
  preferPrefixCache: boolean
  preferModelResidency: boolean
  allowContextReduction: boolean
  allowOutputReduction: boolean
}

const settingsText = defineModel<string>('settingsText', { required: true })
const { t } = useI18n()
const enabled = ref(false)
const parseError = ref('')
let syncing = false

const form = reactive<InferenceForm>({
  temperature: 0.8,
  topP: 0.9,
  preferredOutputTokens: 768,
  maximumOutputTokens: 1536,
  minimumContextTokens: 8192,
  preferredContextTokens: 16384,
  reasoningMode: 'adaptive',
  reasoningEffort: 0.65,
  priority: 'balanced',
  preferPrefixCache: true,
  preferModelResidency: true,
  allowContextReduction: true,
  allowOutputReduction: true,
})

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function optionalNumber(value: unknown): OptionalNumber {
  return typeof value === 'number' && Number.isFinite(value) ? value : ''
}

function hydrate(): void {
  if (syncing) return
  try {
    const root = objectValue(JSON.parse(settingsText.value))
    const profile = objectValue(root.inference_profile)
    enabled.value = Object.keys(profile).length > 0
    if (!enabled.value) {
      parseError.value = ''
      return
    }
    const generation = objectValue(profile.generation)
    const context = objectValue(profile.context)
    const reasoning = objectValue(profile.reasoning)
    const performance = objectValue(profile.performance_intent)
    form.temperature = optionalNumber(generation.temperature)
    form.topP = optionalNumber(generation.top_p)
    form.preferredOutputTokens = optionalNumber(generation.preferred_output_tokens)
    form.maximumOutputTokens = optionalNumber(generation.maximum_output_tokens)
    form.minimumContextTokens = optionalNumber(context.minimum_tokens)
    form.preferredContextTokens = optionalNumber(context.preferred_tokens)
    form.reasoningMode = ['instant', 'adaptive', 'deep'].includes(String(reasoning.mode))
      ? (String(reasoning.mode) as InferenceForm['reasoningMode'])
      : ''
    form.reasoningEffort = optionalNumber(reasoning.effort)
    form.priority = ['latency', 'balanced', 'quality'].includes(String(performance.priority))
      ? (String(performance.priority) as InferenceForm['priority'])
      : ''
    form.preferPrefixCache = performance.prefer_prefix_cache !== false
    form.preferModelResidency = performance.prefer_model_residency !== false
    form.allowContextReduction = performance.allow_context_reduction !== false
    form.allowOutputReduction = performance.allow_output_reduction !== false
    parseError.value = ''
  } catch {
    parseError.value = String(t('advancedCreation.inference.invalidSettings'))
  }
}

function addNumber(target: Record<string, unknown>, key: string, value: OptionalNumber): void {
  if (typeof value === 'number' && Number.isFinite(value)) target[key] = value
  else delete target[key]
}

function commit(): void {
  let root: Record<string, unknown>
  try {
    root = objectValue(JSON.parse(settingsText.value))
  } catch {
    parseError.value = String(t('advancedCreation.inference.invalidSettings'))
    return
  }
  if (!enabled.value) {
    delete root.inference_profile
  } else {
    const previous = objectValue(root.inference_profile)
    const generation = { ...objectValue(previous.generation) }
    addNumber(generation, 'temperature', form.temperature)
    addNumber(generation, 'top_p', form.topP)
    addNumber(generation, 'preferred_output_tokens', form.preferredOutputTokens)
    addNumber(generation, 'maximum_output_tokens', form.maximumOutputTokens)
    const context = { ...objectValue(previous.context) }
    addNumber(context, 'minimum_tokens', form.minimumContextTokens)
    addNumber(context, 'preferred_tokens', form.preferredContextTokens)
    const reasoning = { ...objectValue(previous.reasoning) }
    if (form.reasoningMode) reasoning.mode = form.reasoningMode
    else delete reasoning.mode
    addNumber(reasoning, 'effort', form.reasoningEffort)
    const performance: Record<string, unknown> = {
      ...objectValue(previous.performance_intent),
      prefer_prefix_cache: form.preferPrefixCache,
      prefer_model_residency: form.preferModelResidency,
      allow_context_reduction: form.allowContextReduction,
      allow_output_reduction: form.allowOutputReduction,
    }
    if (form.priority) performance.priority = form.priority
    else delete performance.priority
    root.inference_profile = {
      ...previous,
      generation,
      context,
      reasoning,
      performance_intent: performance,
    }
  }
  syncing = true
  settingsText.value = `${JSON.stringify(root, null, 2)}\n`
  syncing = false
  parseError.value = ''
}

function toggleEnabled(): void {
  enabled.value = !enabled.value
  commit()
}

watch(settingsText, hydrate, { immediate: true })
</script>

<template>
  <div class="inference-card">
    <div class="card-head">
      <div>
        <h3>{{ t('advancedCreation.inference.title') }}</h3>
        <p>{{ t('advancedCreation.inference.desc') }}</p>
      </div>
      <label class="enable-switch">
        <input :checked="enabled" type="checkbox" @change="toggleEnabled" />
        <span>{{ t('advancedCreation.inference.enabled') }}</span>
      </label>
    </div>
    <p class="owner-note">{{ t('advancedCreation.inference.ownerNote') }}</p>
    <p v-if="parseError" class="parse-error" role="alert">{{ parseError }}</p>

    <div v-if="enabled" class="profile-grid">
      <label>
        <span>{{ t('advancedCreation.inference.temperature') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.temperature'))]" /></span>
        <input v-model.number="form.temperature" type="number" min="0" max="2" step="0.05" @change="commit" />
      </label>
      <label>
        <span>{{ t('advancedCreation.inference.topP') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.topP'))]" /></span>
        <input v-model.number="form.topP" type="number" min="0.01" max="1" step="0.01" @change="commit" />
      </label>
      <label>
        <span>{{ t('advancedCreation.inference.preferredOutput') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.preferredOutput'))]" /></span>
        <input v-model.number="form.preferredOutputTokens" type="number" min="1" max="32768" step="1" @change="commit" />
      </label>
      <label>
        <span>{{ t('advancedCreation.inference.maximumOutput') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.maximumOutput'))]" /></span>
        <input v-model.number="form.maximumOutputTokens" type="number" min="1" max="32768" step="1" @change="commit" />
      </label>
      <label>
        <span>{{ t('advancedCreation.inference.minimumContext') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.minimumContext'))]" /></span>
        <input v-model.number="form.minimumContextTokens" type="number" min="1" max="262144" step="1" @change="commit" />
      </label>
      <label>
        <span>{{ t('advancedCreation.inference.preferredContext') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.preferredContext'))]" /></span>
        <input v-model.number="form.preferredContextTokens" type="number" min="1" max="262144" step="1" @change="commit" />
      </label>
      <label>
        <span>{{ t('advancedCreation.inference.reasoningMode') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.reasoningMode'))]" /></span>
        <select v-model="form.reasoningMode" @change="commit">
          <option value="">{{ t('advancedCreation.inference.inherit') }}</option>
          <option value="instant">instant</option>
          <option value="adaptive">adaptive</option>
          <option value="deep">deep</option>
        </select>
      </label>
      <label>
        <span>{{ t('advancedCreation.inference.reasoningEffort') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.reasoningEffort'))]" /></span>
        <input v-model.number="form.reasoningEffort" type="number" min="0" max="1" step="0.05" @change="commit" />
      </label>
      <label>
        <span>{{ t('advancedCreation.inference.priority') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.priority'))]" /></span>
        <select v-model="form.priority" @change="commit">
          <option value="">{{ t('advancedCreation.inference.inherit') }}</option>
          <option value="latency">latency</option>
          <option value="balanced">balanced</option>
          <option value="quality">quality</option>
        </select>
      </label>
    </div>

    <div v-if="enabled" class="intent-checks">
      <label><input v-model="form.preferPrefixCache" type="checkbox" @change="commit" />{{ t('advancedCreation.inference.preferPrefixCache') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.preferPrefixCache'))]" /></label>
      <label><input v-model="form.preferModelResidency" type="checkbox" @change="commit" />{{ t('advancedCreation.inference.preferModelResidency') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.preferModelResidency'))]" /></label>
      <label><input v-model="form.allowContextReduction" type="checkbox" @change="commit" />{{ t('advancedCreation.inference.allowContextReduction') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.allowContextReduction'))]" /></label>
      <label><input v-model="form.allowOutputReduction" type="checkbox" @change="commit" />{{ t('advancedCreation.inference.allowOutputReduction') }} <HelpHint :paragraphs="[String(t('advancedCreation.inference.help.allowOutputReduction'))]" /></label>
    </div>
  </div>
</template>

<style scoped>
.inference-card { margin: 0 0 1rem; padding: 1rem; border: 1px solid var(--fluent-border-stroke); border-radius: var(--fluent-radius-lg); background: color-mix(in srgb, var(--fluent-accent) 5%, var(--fluent-bg-card)); }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.card-head h3 { margin: 0; font-size: 1rem; }
.card-head p, .owner-note { margin: .35rem 0 0; color: var(--fluent-text-secondary); font-size: .8125rem; line-height: 1.5; }
.owner-note { padding: .65rem .75rem; border-radius: var(--fluent-radius-md); background: color-mix(in srgb, var(--fluent-accent) 9%, transparent); }
.enable-switch { display: flex; align-items: center; gap: .45rem; white-space: nowrap; }
.profile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .8rem; margin-top: 1rem; }
.profile-grid label > span { display: flex; align-items: center; gap: .35rem; margin-bottom: .35rem; font-size: .8125rem; }
.profile-grid input, .profile-grid select { width: 100%; box-sizing: border-box; }
.intent-checks { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: .6rem; margin-top: 1rem; }
.intent-checks label { display: flex; align-items: center; gap: .4rem; font-size: .8125rem; }
.parse-error { color: var(--fluent-danger-text, #d13438); font-size: .8125rem; }
</style>
