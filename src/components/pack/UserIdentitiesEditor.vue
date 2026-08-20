<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RolePackTextFile } from '../../lib/exportPack'
import {
  parseUserIdentityEditorState,
  parseUserRelationOptions,
  serializeUserIdentityEditorState,
  validateUserIdentityEditorState,
  type UserIdentityEditorEntry,
  type UserIdentityEditorIssue,
  type UserIdentityEditorState,
} from '../../lib/userIdentityEditor'

const props = defineProps<{ manifestText: string }>()
const indexJson = defineModel<string>('indexJson', { required: true })
const files = defineModel<RolePackTextFile[]>('files', { required: true })
const { t } = useI18n()

const state = ref<UserIdentityEditorState>({
  defaultIdentityId: '',
  entries: [],
  rootExtra: {},
  unreferencedFiles: [],
})
const parseError = ref('')
const rawIndexDraft = ref('')
const rawApplyError = ref('')
let nextKey = 1

const relations = computed(() => parseUserRelationOptions(props.manifestText))
const issues = computed(() => validateUserIdentityEditorState(state.value))
const defaultIdentityLabel = computed(() => {
  const entry = state.value.entries.find((item) => item.id === state.value.defaultIdentityId)
  return entry?.displayName || entry?.id || String(t('advancedCreation.sections.identities.editor.noDefault'))
})

watch(
  [indexJson, files],
  () => {
    const parsed = parseUserIdentityEditorState(indexJson.value, files.value)
    state.value = parsed.state
    parseError.value = parsed.parseError
    rawIndexDraft.value = indexJson.value
    rawApplyError.value = ''
  },
  { deep: true, immediate: true },
)

function issueText(issue: UserIdentityEditorIssue): string {
  return String(
    t(`advancedCreation.sections.identities.editor.issues.${issue.code}`, {
      value: issue.value ?? '',
    }),
  )
}

function issuesFor(entry: UserIdentityEditorEntry): string[] {
  return issues.value.filter((issue) => issue.entryKey === entry.key).map(issueText)
}

function commitIfValid(): void {
  if (validateUserIdentityEditorState(state.value).length > 0) return
  const serialized = serializeUserIdentityEditorState(state.value)
  indexJson.value = serialized.indexJson
  files.value = serialized.files
}

function uniqueIdentityId(): string {
  const used = new Set(state.value.entries.map((entry) => entry.id.trim()))
  let suffix = 1
  let id = 'identity_1'
  while (used.has(id)) id = `identity_${++suffix}`
  return id
}

function addIdentity(): void {
  const id = uniqueIdentityId()
  state.value.entries.push({
    key: `new-identity-${nextKey++}`,
    id,
    displayName: String(t('advancedCreation.sections.identities.editor.newDisplayName')),
    templateFile: `${id}.md`,
    mapsToRelationId: relations.value[0]?.id ?? '',
    templateBody: String(t('advancedCreation.sections.identities.editor.newTemplateBody')),
    extra: {},
  })
  if (!state.value.defaultIdentityId) state.value.defaultIdentityId = id
  commitIfValid()
}

function removeIdentity(index: number): void {
  const [removed] = state.value.entries.splice(index, 1)
  if (removed?.id === state.value.defaultIdentityId) {
    state.value.defaultIdentityId = state.value.entries[0]?.id ?? ''
  }
  const serialized = serializeUserIdentityEditorState(state.value)
  indexJson.value = serialized.indexJson
  files.value = serialized.files
}

function setDefaultIdentity(id: string): void {
  state.value.defaultIdentityId = id
  commitIfValid()
}

function updateIdentityId(entry: UserIdentityEditorEntry, event: Event): void {
  const previousId = entry.id
  entry.id = (event.target as HTMLInputElement).value
  if (state.value.defaultIdentityId === previousId) {
    state.value.defaultIdentityId = entry.id
  }
  commitIfValid()
}

function relationExists(relationId: string): boolean {
  return relations.value.some((relation) => relation.id === relationId)
}

function relationPrompt(relationId: string): string {
  return relations.value.find((relation) => relation.id === relationId)?.promptHint ?? ''
}

function applyRawIndex(): void {
  const parsed = parseUserIdentityEditorState(rawIndexDraft.value, files.value)
  if (parsed.parseError) {
    rawApplyError.value = parsed.parseError
    return
  }
  rawApplyError.value = ''
  indexJson.value = rawIndexDraft.value.trim()
    ? `${rawIndexDraft.value.trimEnd()}\n`
    : ''
  state.value = parsed.state
  parseError.value = ''
}
</script>

<template>
  <div class="identity-visual-editor">
    <div v-if="parseError" class="identity-alert identity-alert--error" role="alert">
      <strong>{{ t('advancedCreation.sections.identities.editor.parseErrorTitle') }}</strong>
      <span>{{ parseError }}</span>
      <span>{{ t('advancedCreation.sections.identities.editor.parseErrorLead') }}</span>
    </div>

    <div class="identity-toolbar">
      <div class="identity-toolbar-copy">
        <span class="identity-kicker">{{ t('advancedCreation.sections.identities.editor.kicker') }}</span>
        <h3>{{ t('advancedCreation.sections.identities.editor.visualTitle') }}</h3>
        <p>{{ t('advancedCreation.sections.identities.editor.visualLead') }}</p>
      </div>
      <button
        v-if="state.entries.length > 0"
        type="button"
        class="secondary-btn"
        :disabled="Boolean(parseError)"
        @click="addIdentity"
      >
        {{ t('advancedCreation.sections.identities.add') }}
      </button>
    </div>

    <div v-if="!parseError" class="identity-overview" :aria-label="String(t('advancedCreation.sections.identities.editor.overviewAria'))">
      <span class="identity-overview-item">
        <strong>{{ state.entries.length }}</strong>
        {{ t('advancedCreation.sections.identities.editor.identityCount', { count: state.entries.length }) }}
      </span>
      <span class="identity-overview-divider" aria-hidden="true"></span>
      <span class="identity-overview-item">
        {{ t('advancedCreation.sections.identities.editor.defaultSummary', { name: defaultIdentityLabel }) }}
      </span>
      <code>user_identities/index.json</code>
    </div>

    <div v-if="!parseError && state.entries.length === 0" class="identity-empty">
      <span class="identity-empty-icon" aria-hidden="true">＋</span>
      <div>
        <strong>{{ t('advancedCreation.sections.identities.editor.emptyTitle') }}</strong>
        <p>{{ t('advancedCreation.sections.identities.editor.emptyLead') }}</p>
      </div>
      <button type="button" class="secondary-btn" @click="addIdentity">
        {{ t('advancedCreation.sections.identities.add') }}
      </button>
    </div>

    <article
      v-for="(entry, index) in state.entries"
      :key="entry.key"
      class="identity-card"
      :class="{ 'identity-card--default': state.defaultIdentityId === entry.id }"
    >
      <header class="identity-card-head">
        <label class="identity-default">
          <input
            type="radio"
            name="default-user-identity"
            :checked="state.defaultIdentityId === entry.id"
            @change="setDefaultIdentity(entry.id)"
          />
          {{ t('advancedCreation.sections.identities.editor.defaultIdentity') }}
        </label>
        <strong>{{ entry.displayName || entry.id || t('advancedCreation.sections.identities.editor.unnamed') }}</strong>
        <button type="button" class="identity-remove" @click="removeIdentity(index)">
          {{ t('advancedCreation.sections.identities.remove') }}
        </button>
      </header>

      <div class="identity-grid">
        <label>
          <span>{{ t('advancedCreation.sections.identities.editor.idLabel') }}</span>
          <input
            :value="entry.id"
            class="text-input"
            spellcheck="false"
            @input="updateIdentityId(entry, $event)"
          />
          <small>{{ t('advancedCreation.sections.identities.editor.idHint') }}</small>
        </label>
        <label>
          <span>{{ t('advancedCreation.sections.identities.editor.displayNameLabel') }}</span>
          <input v-model="entry.displayName" class="text-input" @input="commitIfValid" />
        </label>
        <label>
          <span>{{ t('advancedCreation.sections.identities.editor.templateFileLabel') }}</span>
          <div class="identity-file-input">
            <code>user_identities/</code>
            <input v-model="entry.templateFile" class="text-input" spellcheck="false" @input="commitIfValid" />
          </div>
        </label>
        <label>
          <span>{{ t('advancedCreation.sections.identities.editor.relationLabel') }}</span>
          <select v-model="entry.mapsToRelationId" class="text-input" @change="commitIfValid">
            <option value="">{{ t('advancedCreation.sections.identities.editor.noRelation') }}</option>
            <option
              v-if="entry.mapsToRelationId && !relationExists(entry.mapsToRelationId)"
              :value="entry.mapsToRelationId"
            >
              {{ t('advancedCreation.sections.identities.editor.missingRelation', { id: entry.mapsToRelationId }) }}
            </option>
            <option v-for="relation in relations" :key="relation.id" :value="relation.id">
              {{ relation.displayName }} ({{ relation.id }})
            </option>
          </select>
        </label>
      </div>

      <div v-if="entry.mapsToRelationId" class="identity-relation-preview">
        <span>{{ t('advancedCreation.sections.identities.editor.relationPreview') }}</span>
        <p>
          {{ relationPrompt(entry.mapsToRelationId) || t('advancedCreation.sections.identities.editor.noRelationPreview') }}
        </p>
      </div>

      <label class="identity-body">
        <span>{{ t('advancedCreation.sections.identities.editor.bodyLabel') }}</span>
        <textarea v-model="entry.templateBody" class="ta ta--identity" spellcheck="false" @input="commitIfValid" />
        <small>{{ t('advancedCreation.sections.identities.editor.bodyHint') }}</small>
      </label>

      <ul v-if="issuesFor(entry).length" class="identity-issues">
        <li v-for="message in issuesFor(entry)" :key="message">{{ message }}</li>
      </ul>
    </article>

    <p
      v-for="issue in issues.filter((item) => !item.entryKey)"
      :key="`${issue.code}-${issue.value ?? ''}`"
      class="identity-alert identity-alert--error"
    >
      {{ issueText(issue) }}
    </p>

    <details class="identity-raw">
      <summary>{{ t('advancedCreation.sections.identities.editor.rawTitle') }}</summary>
      <p>{{ t('advancedCreation.sections.identities.editor.rawLead') }}</p>
      <textarea v-model="rawIndexDraft" class="ta ta--raw" spellcheck="false" aria-label="user_identities/index.json" />
      <p v-if="rawApplyError" class="identity-alert identity-alert--error" role="alert">{{ rawApplyError }}</p>
      <button type="button" class="secondary-btn" @click="applyRawIndex">
        {{ t('advancedCreation.sections.identities.editor.applyRaw') }}
      </button>
    </details>
  </div>
</template>

<style scoped>
.identity-visual-editor {
  display: grid;
  gap: 0.85rem;
}
.identity-toolbar,
.identity-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.identity-toolbar h3 {
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
}
.identity-toolbar p,
.identity-raw p {
  margin: 0;
  color: var(--fluent-text-secondary);
  font-size: 0.78rem;
  line-height: 1.5;
}
.identity-toolbar-copy {
  min-width: 0;
}
.identity-kicker {
  display: block;
  margin-bottom: 0.22rem;
  color: var(--fluent-accent);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.identity-overview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.7rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--pack-glass-border);
  border-radius: var(--fluent-radius);
  background: var(--fluent-bg-subtle);
  color: var(--fluent-text-secondary);
  font-size: 0.74rem;
}
.identity-overview-item {
  display: inline-flex;
  align-items: baseline;
  gap: 0.22rem;
}
.identity-overview-item strong {
  color: var(--fluent-text-primary);
  font-size: 0.86rem;
}
.identity-overview-divider {
  width: 1px;
  height: 0.9rem;
  background: var(--pack-glass-border);
}
.identity-overview code {
  margin-left: auto;
  color: var(--fluent-text-secondary);
  font-size: 0.68rem;
}
.identity-empty {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  min-height: 5rem;
  padding: 1rem;
  border: 1px dashed color-mix(in srgb, var(--fluent-accent) 42%, var(--pack-glass-border));
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-accent-subtle) 18%, var(--pack-glass-fill-subtle));
}
.identity-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--fluent-accent) 14%, transparent);
  color: var(--fluent-accent);
  font-size: 1.3rem;
}
.identity-empty strong {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.84rem;
}
.identity-empty p {
  margin: 0;
  color: var(--fluent-text-secondary);
  font-size: 0.76rem;
  line-height: 1.5;
}
.identity-card {
  padding: 0.85rem;
  border: 1px solid var(--pack-glass-border);
  border-radius: var(--fluent-radius-lg);
  background: var(--pack-glass-fill-subtle);
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
}
.identity-card--default {
  border-color: color-mix(in srgb, var(--fluent-accent) 55%, var(--pack-glass-border));
}
.identity-card-head {
  justify-content: flex-start;
  margin-bottom: 0.75rem;
}
.identity-card-head strong {
  flex: 1;
  font-size: 0.88rem;
}
.identity-default {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--fluent-text-secondary);
}
.identity-remove {
  border: 1px solid var(--fluent-danger-border);
  border-radius: var(--fluent-radius);
  background: var(--fluent-danger-bg);
  color: var(--fluent-danger-text);
  padding: 0.32rem 0.6rem;
  cursor: pointer;
}
.identity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}
.identity-grid label,
.identity-body {
  display: grid;
  gap: 0.28rem;
  color: var(--fluent-text-secondary);
  font-size: 0.75rem;
}
.text-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  background: var(--fluent-bg-input);
  color: var(--fluent-text-primary);
}
.identity-file-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  background: var(--fluent-bg-input);
  overflow: hidden;
}
.identity-file-input code {
  padding-left: 0.55rem;
  color: var(--fluent-text-secondary);
  white-space: nowrap;
}
.identity-file-input input {
  border: 0;
  min-width: 0;
}
.identity-relation-preview {
  margin-top: 0.7rem;
  padding: 0.55rem 0.65rem;
  border-left: 3px solid var(--fluent-accent);
  background: color-mix(in srgb, var(--fluent-accent-subtle) 28%, transparent);
  font-size: 0.75rem;
}
.identity-relation-preview span {
  color: var(--fluent-text-secondary);
}
.identity-relation-preview p {
  margin: 0.25rem 0 0;
  line-height: 1.5;
}
.identity-body {
  margin-top: 0.7rem;
}
.ta--identity {
  min-height: 9rem !important;
}
.identity-issues {
  margin: 0.6rem 0 0;
  padding-left: 1.1rem;
  color: var(--fluent-danger-text);
  font-size: 0.75rem;
}
.identity-alert {
  display: grid;
  gap: 0.2rem;
  margin: 0;
  padding: 0.55rem 0.65rem;
  border-radius: var(--fluent-radius);
  font-size: 0.76rem;
  line-height: 1.45;
}
.identity-alert--error {
  border: 1px solid var(--fluent-danger-border);
  background: var(--fluent-danger-bg);
  color: var(--fluent-danger-text);
}
.identity-raw {
  padding: 0.7rem;
  border: 1px dashed var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-lg);
}
.identity-raw summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
}
.identity-raw p {
  margin: 0.45rem 0;
}
.ta--raw {
  min-height: 12rem !important;
  margin-bottom: 0.55rem;
}
@media (max-width: 760px) {
  .identity-grid {
    grid-template-columns: 1fr;
  }
  .identity-toolbar {
    align-items: flex-start;
  }
  .identity-empty {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .identity-empty .secondary-btn {
    grid-column: 1 / -1;
    width: 100%;
  }
  .identity-overview code {
    width: 100%;
    margin-left: 0;
  }
}
</style>
