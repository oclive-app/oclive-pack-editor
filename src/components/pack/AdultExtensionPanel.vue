<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  defaultAdultExtension,
  parseAdultExtension,
  serializeAdultExtension,
  syncAdultScenes,
  type AdultExtensionDocument,
} from '../../lib/adultExtension'

const props = defineProps<{
  modelValue: string
  sceneIds: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()
const document = ref<AdultExtensionDocument>(defaultAdultExtension())
const parseError = ref('')

const enabled = computed(() => props.modelValue.trim().length > 0)
const knownSceneIds = computed(() => [...new Set(props.sceneIds.filter(Boolean))])

watch(
  () => props.modelValue,
  (raw) => {
    if (!raw.trim()) {
      document.value = defaultAdultExtension()
      parseError.value = ''
      return
    }
    try {
      document.value = parseAdultExtension(raw)
      parseError.value = ''
    }
    catch (error) {
      parseError.value = error instanceof Error ? error.message : String(error)
    }
  },
  { immediate: true },
)

function commit(): void {
  parseError.value = ''
  emit('update:modelValue', serializeAdultExtension(document.value))
}

function createExtension(): void {
  document.value = syncAdultScenes(defaultAdultExtension(), knownSceneIds.value)
  commit()
}

function removeExtension(): void {
  if (!window.confirm(String(t('packEditor.adult.removeConfirm'))))
    return
  document.value = defaultAdultExtension()
  parseError.value = ''
  emit('update:modelValue', '')
}

function synchronizeScenes(): void {
  document.value = syncAdultScenes(document.value, knownSceneIds.value)
  commit()
}

function updateInterval(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  document.value.pacing.suggested_interval_ms =
    Number.isSafeInteger(value) && value > 0 ? value : 4_000
  commit()
}
</script>

<template>
  <section class="adult-panel" aria-labelledby="adult-extension-title">
    <header class="adult-hero">
      <div>
        <p class="adult-kicker">{{ t('packEditor.adult.kicker') }}</p>
        <h2 id="adult-extension-title">{{ t('packEditor.adult.title') }}</h2>
        <p>{{ t('packEditor.adult.lead') }}</p>
      </div>
      <button
        v-if="enabled"
        type="button"
        class="adult-button adult-button--danger"
        @click="removeExtension"
      >
        {{ t('packEditor.adult.remove') }}
      </button>
    </header>

    <div v-if="!enabled" class="adult-empty">
      <h3>{{ t('packEditor.adult.emptyTitle') }}</h3>
      <p>{{ t('packEditor.adult.emptyLead') }}</p>
      <button type="button" class="adult-button adult-button--primary" @click="createExtension">
        {{ t('packEditor.adult.create') }}
      </button>
    </div>

    <template v-else>
      <p v-if="parseError" class="adult-error" role="alert">
        {{ t('packEditor.adult.parseError', { error: parseError }) }}
      </p>

      <article class="adult-card">
        <h3>{{ t('packEditor.adult.baseTitle') }}</h3>
        <label class="adult-check">
          <input
            v-model="document.character_is_adult"
            type="checkbox"
            @change="commit"
          >
          <span>
            <strong>{{ t('packEditor.adult.characterAdult') }}</strong>
            <small>{{ t('packEditor.adult.characterAdultHint') }}</small>
          </span>
        </label>

        <label class="adult-field">
          <span>{{ t('packEditor.adult.persona') }}</span>
          <textarea
            v-model="document.persona"
            rows="7"
            :placeholder="String(t('packEditor.adult.personaPlaceholder'))"
            @input="commit"
          />
        </label>

        <label class="adult-field">
          <span>{{ t('packEditor.adult.dialogueGuidance') }}</span>
          <textarea
            v-model="document.dialogue_guidance"
            rows="6"
            :placeholder="String(t('packEditor.adult.dialoguePlaceholder'))"
            @input="commit"
          />
        </label>
      </article>

      <article class="adult-card">
        <h3>{{ t('packEditor.adult.pacingTitle') }}</h3>
        <p class="adult-muted">{{ t('packEditor.adult.pacingLead') }}</p>
        <div class="adult-grid">
          <label class="adult-field">
            <span>{{ t('packEditor.adult.pacingMode') }}</span>
            <select v-model="document.pacing.mode" @change="commit">
              <option value="creator">{{ t('packEditor.adult.pacingCreator') }}</option>
              <option value="ai">{{ t('packEditor.adult.pacingAi') }}</option>
            </select>
          </label>
          <label class="adult-field">
            <span>{{ t('packEditor.adult.pacingInterval') }}</span>
            <input
              :value="document.pacing.suggested_interval_ms"
              type="number"
              min="1"
              step="100"
              @change="updateInterval"
            >
          </label>
        </div>
      </article>

      <article class="adult-card">
        <div class="adult-card-heading">
          <div>
            <h3>{{ t('packEditor.adult.scenesTitle') }}</h3>
            <p class="adult-muted">{{ t('packEditor.adult.scenesLead') }}</p>
          </div>
          <button type="button" class="adult-button" @click="synchronizeScenes">
            {{ t('packEditor.adult.syncScenes') }}
          </button>
        </div>

        <p v-if="knownSceneIds.length === 0" class="adult-muted">
          {{ t('packEditor.adult.noScenes') }}
        </p>

        <section
          v-for="sceneId in Object.keys(document.scenes)"
          :key="sceneId"
          class="adult-scene"
        >
          <h4>{{ t('packEditor.adult.sceneHeading', { id: sceneId }) }}</h4>
          <label class="adult-field">
            <span>{{ t('packEditor.adult.sceneDirection') }}</span>
            <textarea
              v-model="document.scenes[sceneId]!.direction"
              rows="4"
              @input="commit"
            />
          </label>
          <label class="adult-field">
            <span>{{ t('packEditor.adult.actionFlow') }}</span>
            <textarea
              v-model="document.scenes[sceneId]!.action_flow"
              rows="5"
              @input="commit"
            />
          </label>
          <label class="adult-field">
            <span>{{ t('packEditor.adult.sceneDialogue') }}</span>
            <textarea
              v-model="document.scenes[sceneId]!.dialogue_guidance"
              rows="4"
              @input="commit"
            />
          </label>
        </section>
      </article>
    </template>
  </section>
</template>

<style scoped>
.adult-panel {
  display: grid;
  gap: 1rem;
  width: min(100%, 72rem);
  margin: 0 auto;
  padding: 0 0 2rem;
}

.adult-hero,
.adult-card-heading,
.adult-grid {
  display: flex;
  gap: 1rem;
}

.adult-hero,
.adult-card-heading {
  align-items: flex-start;
  justify-content: space-between;
}

.adult-hero h2,
.adult-card h3,
.adult-scene h4 {
  margin: 0;
}

.adult-hero p,
.adult-card p {
  margin: 0.45rem 0 0;
}

.adult-kicker {
  color: var(--fluent-accent, #67a8ff);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.adult-empty,
.adult-card {
  border: 1px solid var(--fluent-border-stroke);
  border-radius: 1rem;
  background: var(--fluent-bg-card);
  box-shadow: var(--fluent-shadow-card);
  padding: 1.15rem;
}

.adult-empty {
  display: grid;
  justify-items: start;
  gap: 0.8rem;
}

.adult-empty h3,
.adult-empty p {
  margin: 0;
}

.adult-card {
  display: grid;
  gap: 1rem;
}

.adult-grid > * {
  flex: 1 1 0;
}

.adult-field {
  display: grid;
  gap: 0.45rem;
  font-weight: 600;
}

.adult-field textarea,
.adult-field input,
.adult-field select {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--fluent-border-stroke);
  border-radius: 0.7rem;
  background: var(--fluent-bg-layer, rgba(255, 255, 255, 0.04));
  color: inherit;
  padding: 0.7rem 0.8rem;
  font: inherit;
  font-weight: 400;
}

.adult-field textarea {
  resize: vertical;
  line-height: 1.55;
}

.adult-check {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--fluent-accent, #67a8ff) 10%, transparent);
  padding: 0.85rem;
}

.adult-check input {
  margin-top: 0.2rem;
}

.adult-check span {
  display: grid;
  gap: 0.2rem;
}

.adult-check small,
.adult-muted {
  color: var(--fluent-text-secondary);
  font-weight: 400;
}

.adult-scene {
  display: grid;
  gap: 0.85rem;
  border-top: 1px solid var(--fluent-border-stroke);
  padding-top: 1rem;
}

.adult-button {
  border: 1px solid var(--fluent-border-stroke);
  border-radius: 0.65rem;
  background: var(--fluent-bg-layer, rgba(255, 255, 255, 0.06));
  color: inherit;
  cursor: pointer;
  padding: 0.58rem 0.9rem;
  font: inherit;
  font-weight: 650;
}

.adult-button--primary {
  border-color: transparent;
  background: var(--fluent-accent, #2563eb);
  color: #fff;
}

.adult-button--danger {
  color: var(--fluent-danger, #dc6262);
}

.adult-error {
  border: 1px solid color-mix(in srgb, #d33 55%, transparent);
  border-radius: 0.7rem;
  background: color-mix(in srgb, #d33 10%, transparent);
  padding: 0.75rem;
}

@media (max-width: 760px) {
  .adult-hero,
  .adult-card-heading,
  .adult-grid {
    flex-direction: column;
  }
}
</style>
