<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HelpHint from '../HelpHint.vue'

const model = defineModel<string>({ required: true })
const { t } = useI18n()
const enabled = ref(false)
const error = ref('')
let syncing = false
const form = reactive({
  schemaVersion: 2,
  directorProfile: 'rules-v1',
  synthProfile: '',
  speed: 1,
  energy: 'normal',
  engineFamilies: '',
  refDefault: '',
  refText: '',
  emoTextTemplate: '',
})

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function hydrate(): void {
  if (syncing) return
  if (!model.value.trim()) {
    enabled.value = false
    error.value = ''
    return
  }
  try {
    const root = record(JSON.parse(model.value))
    enabled.value = true
    form.schemaVersion = root.schema_version === 1 ? 1 : 2
    form.directorProfile = typeof root.director_profile === 'string' ? root.director_profile : ''
    form.synthProfile = typeof root.synth_profile === 'string' ? root.synth_profile : ''
    form.speed = typeof root.speed === 'number' ? root.speed : 1
    form.energy = ['soft', 'normal', 'strong'].includes(String(root.energy))
      ? String(root.energy)
      : 'normal'
    form.engineFamilies = Array.isArray(root.engine_family)
      ? root.engine_family.map(String).join(', ')
      : ''
    form.refDefault = typeof root.ref_default === 'string' ? root.ref_default : ''
    form.refText = typeof root.ref_text === 'string' ? root.ref_text : ''
    form.emoTextTemplate = typeof root.emo_text_template === 'string'
      ? root.emo_text_template
      : ''
    error.value = ''
  } catch {
    enabled.value = true
    error.value = String(t('advancedCreation.voice.invalidJson'))
  }
}

function commit(): void {
  if (!enabled.value) {
    model.value = ''
    error.value = ''
    return
  }
  let root: Record<string, unknown> = {}
  if (model.value.trim()) {
    try {
      root = record(JSON.parse(model.value))
    } catch {
      error.value = String(t('advancedCreation.voice.invalidJson'))
      return
    }
  }
  root.schema_version = form.schemaVersion
  const putString = (key: string, value: string): void => {
    if (value.trim()) root[key] = value.trim()
    else delete root[key]
  }
  putString('director_profile', form.directorProfile)
  putString('synth_profile', form.synthProfile)
  root.speed = form.speed
  root.energy = form.energy
  const engines = form.engineFamilies.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
  if (engines.length) root.engine_family = engines
  else delete root.engine_family
  putString('ref_default', form.refDefault)
  putString('ref_text', form.refText)
  putString('emo_text_template', form.emoTextTemplate)
  syncing = true
  model.value = `${JSON.stringify(root, null, 2)}\n`
  syncing = false
  error.value = ''
}

function toggle(): void {
  enabled.value = !enabled.value
  if (enabled.value && !model.value.trim()) model.value = '{}\n'
  commit()
}

watch(model, hydrate, { immediate: true })
</script>

<template>
  <div class="file-editor">
    <div class="file-head">
      <div>
        <h2>{{ t('advancedCreation.voice.title') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.file'))]" /></h2>
        <p>{{ t('advancedCreation.voice.desc') }}</p>
      </div>
      <label class="enable"><input :checked="enabled" type="checkbox" @change="toggle" />{{ t('advancedCreation.voice.enabled') }}</label>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="enabled" class="grid">
      <label><span>{{ t('advancedCreation.voice.schema') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.schema'))]" /></span><select v-model.number="form.schemaVersion" @change="commit"><option :value="1">1</option><option :value="2">2</option></select></label>
      <label><span>{{ t('advancedCreation.voice.director') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.director'))]" /></span><input v-model="form.directorProfile" type="text" @change="commit" /></label>
      <label><span>{{ t('advancedCreation.voice.synth') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.synth'))]" /></span><input v-model="form.synthProfile" type="text" @change="commit" /></label>
      <label><span>{{ t('advancedCreation.voice.speed') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.speed'))]" /></span><input v-model.number="form.speed" type="number" min="0.5" max="2" step="0.05" @change="commit" /></label>
      <label><span>{{ t('advancedCreation.voice.energy') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.energy'))]" /></span><select v-model="form.energy" @change="commit"><option value="soft">soft</option><option value="normal">normal</option><option value="strong">strong</option></select></label>
      <label><span>{{ t('advancedCreation.voice.engines') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.engines'))]" /></span><input v-model="form.engineFamilies" type="text" placeholder="cosyvoice2" @change="commit" /></label>
      <label class="wide"><span>{{ t('advancedCreation.voice.refDefault') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.refDefault'))]" /></span><input v-model="form.refDefault" type="text" placeholder="assets/voice/ref_neutral.wav" @change="commit" /></label>
      <label class="wide"><span>{{ t('advancedCreation.voice.refText') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.refText'))]" /></span><textarea v-model="form.refText" rows="3" @change="commit" /></label>
      <label class="wide"><span>{{ t('advancedCreation.voice.emoTemplate') }} <HelpHint :paragraphs="[String(t('advancedCreation.voice.help.emoTemplate'))]" /></span><textarea v-model="form.emoTextTemplate" rows="3" placeholder="请用{tone}的语气朗读" @change="commit" /></label>
    </div>
    <details v-if="enabled" class="raw"><summary>{{ t('advancedCreation.files.rawSource') }}</summary><textarea v-model="model" spellcheck="false" rows="14" /></details>
  </div>
</template>

<style scoped>
.file-editor { padding: 1rem; }
.file-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
.file-head h2 { display: flex; align-items: center; gap: .35rem; margin: 0; font-size: 1.05rem; }
.file-head p { margin: .4rem 0 0; color: var(--fluent-text-secondary); font-size: .8125rem; }
.enable { display: flex; gap: .4rem; align-items: center; white-space: nowrap; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .8rem; margin-top: 1rem; }
.grid label > span { display: flex; gap: .35rem; align-items: center; margin-bottom: .35rem; font-size: .8125rem; }
.grid input, .grid select, .grid textarea { width: 100%; box-sizing: border-box; }
.wide { grid-column: 1 / -1; }
.raw { margin-top: 1rem; }
.raw textarea { width: 100%; box-sizing: border-box; margin-top: .6rem; font-family: var(--fluent-font-mono, monospace); }
.error { color: var(--fluent-danger-text, #d13438); }
</style>
