<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PortraitCatalogEditor from './PortraitCatalogEditor.vue'
import SceneSimpleEditor from './SceneSimpleEditor.vue'
import UserIdentitiesEditor from './UserIdentitiesEditor.vue'
import WorldKnowledgeSimpleEditor from './WorldKnowledgeSimpleEditor.vue'
import AuthorFileEditor from './AuthorFileEditor.vue'
import ConfigFileEditor from './ConfigFileEditor.vue'
import InferenceProfileEditor from './InferenceProfileEditor.vue'
import PromptsFileEditor from './PromptsFileEditor.vue'
import UiConfigEditor from './UiConfigEditor.vue'
import VoiceProfileEditor from './VoiceProfileEditor.vue'
import type { PortraitSlotId } from '../../lib/portraitCatalog'
import type { ExtraEmotionUserChoices } from '../../lib/portraitExtraUser'
import type { SceneEditorEntry } from '../../lib/scenePackUser'
import type { WorldKnowledgeTexts } from '../../lib/worldKnowledgeUser'
import type { RolePackTextFile } from '../../lib/exportPack'
import type { AuthorRecRow } from '../../lib/authorPack'
import type { UiConfig } from '../../types/uiConfig'
import {
  CORE_FAQ,
  IMAGES_FAQ,
  MANIFEST_FAQ,
  SETTINGS_FAQ,
} from '../../lib/advancedEditorFaq'
import {
  ADV_CORE_TXT,
  ADV_MANIFEST,
  ADV_OVERVIEW,
  ADV_SETTINGS,
  CORE_PERSONALITY_SCOPE_GUIDE,
  EMOTION_ASSET_SCOPE_GUIDE,
  MANIFEST_FIELD_SCOPE_GUIDE,
  MANIFEST_KEY_GUIDE,
  MANIFEST_MERGE_NOTE,
  SETTINGS_FIELD_SCOPE_GUIDE,
  SETTINGS_KEY_GUIDE,
  SETTINGS_MERGE_NOTE,
} from '../../lib/advancedEditorHints'
import AdvFaqList from '../AdvFaqList.vue'
import HelpHint from '../HelpHint.vue'

const { t } = useI18n()

const manifestText = defineModel<string>('manifestText', { required: true })
const settingsText = defineModel<string>('settingsText', { required: true })
const corePersonality = defineModel<string>('corePersonality', { required: true })
const memorySeedJson = defineModel<string>('memorySeedJson', { required: true })
const configJsonText = defineModel<string>('configJsonText', { required: true })
const voiceProfileJson = defineModel<string>('voiceProfileJson', { required: true })
const deepCapsuleText = defineModel<string>('deepCapsuleText', { required: true })
const systemPromptMarkdown = defineModel<string>('systemPromptMarkdown', { required: true })
const polishPromptMarkdown = defineModel<string>('polishPromptMarkdown', { required: true })
const creatorMessage = defineModel<string>('creatorMessage', { required: true })
const authorSummary = defineModel<string>('authorSummary', { required: true })
const authorDetailMarkdown = defineModel<string>('authorDetailMarkdown', { required: true })
const authorRecommendedRows = defineModel<AuthorRecRow[]>('authorRecommendedRows', { required: true })
const authorIncludeSuggestedUi = defineModel<boolean>('authorIncludeSuggestedUi', { required: true })
const authorSuggestedBackendsJson = defineModel<string>('authorSuggestedBackendsJson', { required: true })
const userIdentityFiles = defineModel<RolePackTextFile[]>('userIdentityFiles', { required: true })
const userIdentitiesIndexJson = defineModel<string>('userIdentitiesIndexJson', { required: true })
const worldKnowledgeTexts = defineModel<WorldKnowledgeTexts>('worldKnowledgeTexts', { required: true })
const sceneEditorEntries = defineModel<SceneEditorEntry[]>('sceneEditorEntries', { required: true })
const advancedTab = defineModel<
  'manifest' | 'settings' | 'core' | 'config' | 'memory' | 'identities' | 'world' | 'scenes' | 'prompts' | 'voice' | 'ui' | 'author' | 'images'
>('advancedTab', {
  required: true,
})
const emit = defineEmits<{
  portraitSlotPick: [id: PortraitSlotId, e: Event]
  portraitSlotClear: [id: PortraitSlotId]
  portraitClearAll: []
  portraitExtraApplyChoices: [index: number, choices: ExtraEmotionUserChoices, file?: File]
  portraitExtraAdd: []
  portraitExtraRemove: [index: number]
}>()

const TAB_ORDER = ['manifest', 'core', 'config', 'memory', 'identities', 'world', 'prompts', 'voice', 'ui', 'author', 'scenes', 'images'] as const
const MEMORY_SEED_PLACEHOLDER = '{\n  "schema_version": 1,\n  "memories": [],\n  "extensions": {}\n}'

defineProps<{
  emotionSummary: string
  portraitSlotFiles: Partial<Record<PortraitSlotId, File>>
  portraitExtraEntries: import('../../lib/portraitCatalog').PortraitCatalogEntry[]
  manifestRoleId: string
  uiConfig: UiConfig
}>()

function onToolbarKeydown(e: KeyboardEvent): void {
  if (
    e.key !== 'ArrowLeft' &&
    e.key !== 'ArrowRight' &&
    e.key !== 'Home' &&
    e.key !== 'End'
  ) {
    return
  }
  e.preventDefault()
  const order = TAB_ORDER
  const current = advancedTab.value === 'settings' ? 'manifest' : advancedTab.value
  const i = order.indexOf(current)
  if (i < 0) return
  if (e.key === 'Home') {
    advancedTab.value = order[0]!
    return
  }
  if (e.key === 'End') {
    advancedTab.value = order[order.length - 1]!
    return
  }
  if (e.key === 'ArrowLeft') {
    advancedTab.value = order[(i - 1 + order.length) % order.length]!
  } else {
    advancedTab.value = order[(i + 1) % order.length]!
  }
}

</script>

<template>
  <div>
    <p class="adv-toolbar-lead">
      {{ t("advancedCreation.toolbar.leadPrefix") }}
      <HelpHint :paragraphs="ADV_OVERVIEW" />
      {{ t("advancedCreation.toolbar.leadSuffix") }}
    </p>
    <p class="adv-extensions-hint">{{ t('advancedCreation.toolbar.extensionsHint') }}</p>
    <div
      class="adv-toolbar"
      role="tablist"
      :aria-label="String(t('advancedCreation.toolbar.aria'))"
      tabindex="0"
      @keydown="onToolbarKeydown"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="advancedTab === 'manifest' || advancedTab === 'settings'"
        :class="{ on: advancedTab === 'manifest' || advancedTab === 'settings' }"
        @click="advancedTab = 'manifest'"
      >
        <span class="tab-stack">
          <span class="tab-title">{{ t("advancedCreation.tabs.manifest") }}</span>
          <span class="tab-file">pipeline.ocblueprint</span>
        </span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="advancedTab === 'core'"
        :class="{ on: advancedTab === 'core' }"
        @click="advancedTab = 'core'"
      >
        <span class="tab-stack">
          <span class="tab-title">{{ t("advancedCreation.tabs.core") }}</span>
          <span class="tab-file">core_personality.txt</span>
        </span>
      </button>
      <button type="button" role="tab" :aria-selected="advancedTab === 'config'" :class="{ on: advancedTab === 'config' }" @click="advancedTab = 'config'">
        <span class="tab-stack"><span class="tab-title">{{ t('advancedCreation.tabs.config') }}</span><span class="tab-file">config.json</span></span>
      </button>
      <button type="button" role="tab" :aria-selected="advancedTab === 'memory'" :class="{ on: advancedTab === 'memory' }" @click="advancedTab = 'memory'">
        <span class="tab-stack"><span class="tab-title">{{ t('advancedCreation.tabs.memory') }}</span><span class="tab-file">memory_seed.json</span></span>
      </button>
      <button type="button" role="tab" :aria-selected="advancedTab === 'identities'" :class="{ on: advancedTab === 'identities' }" @click="advancedTab = 'identities'">
        <span class="tab-stack"><span class="tab-title">{{ t('advancedCreation.tabs.identities') }}</span><span class="tab-file">user_identities/</span></span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="advancedTab === 'world'"
        :class="{ on: advancedTab === 'world' }"
        @click="advancedTab = 'world'"
      >
        <span class="tab-stack">
          <span class="tab-title">{{ t("advancedCreation.tabs.world") }}</span>
          <span class="tab-file">knowledge/*.md</span>
        </span>
      </button>
      <button type="button" role="tab" :aria-selected="advancedTab === 'prompts'" :class="{ on: advancedTab === 'prompts' }" @click="advancedTab = 'prompts'">
        <span class="tab-stack"><span class="tab-title">{{ t('advancedCreation.tabs.prompts') }}</span><span class="tab-file">prompts/</span></span>
      </button>
      <button type="button" role="tab" :aria-selected="advancedTab === 'voice'" :class="{ on: advancedTab === 'voice' }" @click="advancedTab = 'voice'">
        <span class="tab-stack"><span class="tab-title">{{ t('advancedCreation.tabs.voice') }}</span><span class="tab-file">voice_profile.json</span></span>
      </button>
      <button type="button" role="tab" :aria-selected="advancedTab === 'ui'" :class="{ on: advancedTab === 'ui' }" @click="advancedTab = 'ui'">
        <span class="tab-stack"><span class="tab-title">{{ t('advancedCreation.tabs.ui') }}</span><span class="tab-file">ui.json</span></span>
      </button>
      <button type="button" role="tab" :aria-selected="advancedTab === 'author'" :class="{ on: advancedTab === 'author' }" @click="advancedTab = 'author'">
        <span class="tab-stack"><span class="tab-title">{{ t('advancedCreation.tabs.author') }}</span><span class="tab-file">author.json</span></span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="advancedTab === 'scenes'"
        :class="{ on: advancedTab === 'scenes' }"
        @click="advancedTab = 'scenes'"
      >
        <span class="tab-stack">
          <span class="tab-title">{{ t("advancedCreation.tabs.scenes") }}</span>
          <span class="tab-file">scenes/</span>
        </span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="advancedTab === 'images'"
        :class="{ on: advancedTab === 'images' }"
        @click="advancedTab = 'images'"
      >
        <span class="tab-stack">
          <span class="tab-title">{{ t("advancedCreation.tabs.images") }}</span>
          <span class="tab-file">assets/images</span>
        </span>
      </button>
    </div>

    <section v-show="advancedTab === 'manifest'" class="panel adv-single">
      <div class="adv-section-head">
        <h2 class="adv-h2">
          <span>{{ t("advancedCreation.sections.manifest.title") }}</span>
          <HelpHint :paragraphs="ADV_MANIFEST" />
        </h2>
        <p class="adv-lead">{{ t("advancedCreation.sections.manifest.lead") }}</p>
        <details class="adv-key-map">
          <summary>{{ t("advancedCreation.sections.manifest.keyMapSummary") }}</summary>
          <ul class="adv-key-list">
            <li v-for="row in MANIFEST_KEY_GUIDE" :key="row.key">
              <code>{{ row.key }}</code>
              <span class="adv-key-say">{{ row.say }}</span>
            </li>
          </ul>
        </details>
      </div>
      <textarea v-model="manifestText" spellcheck="false" class="ta" :aria-label="t('packEditor.rolePack.manifestCard')" />
      <div class="adv-dock-stack">
        <details
          class="adv-examples-dock adv-examples-dock--collapsible adv-examples-dock--keypoints"
          :aria-label="String(t('advancedCreation.sections.manifest.docks.keypointsAria'))"
        >
          <summary class="adv-examples-dock-summary">
            <span class="adv-examples-badge">{{ t("advancedCreation.docks.badges.keypoints") }}</span>
            <span class="adv-examples-dock-title">{{ t("advancedCreation.sections.manifest.docks.keypointsTitle") }}</span>
          </summary>
          <div class="adv-examples-dock-body">
            <p class="adv-merge-note">{{ MANIFEST_MERGE_NOTE }}</p>
            <p class="adv-examples-dock-note">
              {{ t("advancedCreation.sections.manifest.docks.keypointsNotePrefix") }}<strong>{{ t("advancedCreation.sections.manifest.docks.keypointsNoteStrong") }}</strong>{{ t("advancedCreation.sections.manifest.docks.keypointsNoteSuffix") }}
            </p>
            <h4 class="adv-ex-part">{{ t("advancedCreation.docks.eachItemTitle") }}</h4>
            <div class="adv-scope-matrix">
              <ul class="adv-scope-list">
                <li v-for="row in MANIFEST_FIELD_SCOPE_GUIDE" :key="row.field" class="adv-scope-li">
                  <code class="adv-scope-field">{{ row.field }}</code>
                  <p class="adv-scope-mean">{{ row.meaning }}</p>
                  <p class="adv-scope-scope">
                    <strong>{{ t("advancedCreation.docks.scopeStrong") }}</strong>{{ row.scope }}
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </details>
        <details
          class="adv-examples-dock adv-examples-dock--collapsible adv-examples-dock--faq"
          :aria-label="String(t('advancedCreation.sections.manifest.docks.faqAria'))"
        >
          <summary class="adv-examples-dock-summary">
            <span class="adv-examples-badge adv-examples-badge--faq">{{ t("advancedCreation.docks.badges.faq") }}</span>
            <span class="adv-examples-dock-title">{{ t("advancedCreation.sections.manifest.docks.faqTitle") }}</span>
          </summary>
          <div class="adv-examples-dock-body">
            <AdvFaqList :items="MANIFEST_FAQ" show-intro />
          </div>
        </details>
      </div>
    </section>
    <section v-show="advancedTab === 'memory'" class="panel adv-single">
      <div class="adv-section-head">
        <h2 class="adv-h2"><span>{{ t("advancedCreation.sections.memory.title") }}</span></h2>
        <p class="adv-lead">{{ t("advancedCreation.sections.memory.lead") }}</p>
      </div>
      <textarea
        v-model="memorySeedJson"
        spellcheck="false"
        class="ta"
        aria-label="memory_seed.json"
        :placeholder="MEMORY_SEED_PLACEHOLDER"
      />
    </section>
    <section v-show="advancedTab === 'identities'" class="panel adv-single">
      <div class="adv-section-head">
        <h2 class="adv-h2"><span>{{ t("advancedCreation.sections.identities.title") }}</span></h2>
        <p class="adv-lead">{{ t("advancedCreation.sections.identities.lead") }}</p>
      </div>
      <UserIdentitiesEditor
        v-model:index-json="userIdentitiesIndexJson"
        v-model:files="userIdentityFiles"
        :manifest-text="manifestText"
      />
    </section>
    <section v-show="advancedTab === 'manifest' || advancedTab === 'settings'" class="panel adv-single">
      <div class="adv-section-head">
        <h2 class="adv-h2">
          <span>{{ t("advancedCreation.sections.settings.title") }}</span>
          <HelpHint :paragraphs="ADV_SETTINGS" />
        </h2>
        <p class="adv-lead">{{ t("advancedCreation.sections.settings.lead") }}</p>
        <details class="adv-key-map">
          <summary>{{ t("advancedCreation.sections.settings.keyMapSummary") }}</summary>
          <ul class="adv-key-list">
            <li v-for="row in SETTINGS_KEY_GUIDE" :key="row.key">
              <code>{{ row.key }}</code>
              <span class="adv-key-say">{{ row.say }}</span>
            </li>
          </ul>
        </details>
      </div>
      <InferenceProfileEditor v-model:settings-text="settingsText" />
      <textarea v-model="settingsText" spellcheck="false" class="ta" :aria-label="t('packEditor.rolePack.settingsCard')" />
      <div class="adv-dock-stack">
        <details
          class="adv-examples-dock adv-examples-dock--collapsible adv-examples-dock--keypoints"
          :aria-label="String(t('advancedCreation.sections.settings.docks.keypointsAria'))"
        >
          <summary class="adv-examples-dock-summary">
            <span class="adv-examples-badge">{{ t("advancedCreation.docks.badges.keypoints") }}</span>
            <span class="adv-examples-dock-title">{{ t("advancedCreation.sections.settings.docks.keypointsTitle") }}</span>
          </summary>
          <div class="adv-examples-dock-body">
            <p class="adv-merge-note">{{ SETTINGS_MERGE_NOTE }}</p>
            <p class="adv-examples-dock-note">
              {{ t("advancedCreation.sections.settings.docks.keypointsNotePrefix") }}<strong>{{ t("advancedCreation.sections.settings.docks.keypointsNoteStrong") }}</strong>{{ t("advancedCreation.sections.settings.docks.keypointsNoteSuffix") }}
            </p>
            <h4 class="adv-ex-part">{{ t("advancedCreation.docks.eachItemTitle") }}</h4>
            <div class="adv-scope-matrix">
              <ul class="adv-scope-list">
                <li v-for="row in SETTINGS_FIELD_SCOPE_GUIDE" :key="row.field" class="adv-scope-li">
                  <code class="adv-scope-field">{{ row.field }}</code>
                  <p class="adv-scope-mean">{{ row.meaning }}</p>
                  <p class="adv-scope-scope">
                    <strong>{{ t("advancedCreation.docks.scopeStrong") }}</strong>{{ row.scope }}
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </details>
        <details
          class="adv-examples-dock adv-examples-dock--collapsible adv-examples-dock--faq"
          :aria-label="String(t('advancedCreation.sections.settings.docks.faqAria'))"
        >
          <summary class="adv-examples-dock-summary">
            <span class="adv-examples-badge adv-examples-badge--faq">{{ t("advancedCreation.docks.badges.faq") }}</span>
            <span class="adv-examples-dock-title">{{ t("advancedCreation.sections.settings.docks.faqTitle") }}</span>
          </summary>
          <div class="adv-examples-dock-body">
            <AdvFaqList :items="SETTINGS_FAQ" />
          </div>
        </details>
      </div>
    </section>
    <section v-show="advancedTab === 'core'" class="panel adv-single">
      <div class="adv-section-head">
        <h2 class="adv-h2">
          <span>{{ t("advancedCreation.sections.core.coreTitle") }}</span>
          <HelpHint :paragraphs="ADV_CORE_TXT" />
        </h2>
        <p class="adv-lead">{{ t("advancedCreation.sections.core.coreLead") }}</p>
      </div>
      <textarea
        v-model="corePersonality"
        spellcheck="false"
        class="ta"
        aria-label="core_personality.txt"
      />
      <div class="creator-message-file">
        <h3>{{ t('advancedCreation.sections.core.creatorMsgTitle') }} <HelpHint :paragraphs="[String(t('advancedCreation.sections.core.creatorMsgLead'))]" /></h3>
        <textarea v-model="creatorMessage" rows="4" spellcheck="false" aria-label="creator_message.txt" />
      </div>
      <div class="adv-dock-stack">
        <details
          class="adv-examples-dock adv-examples-dock--collapsible adv-examples-dock--keypoints"
          :aria-label="String(t('advancedCreation.sections.core.coreDocks.keypointsAria'))"
        >
          <summary class="adv-examples-dock-summary">
            <span class="adv-examples-badge">{{ t("advancedCreation.docks.badges.keypoints") }}</span>
            <span class="adv-examples-dock-title">{{ t("advancedCreation.sections.core.coreDocks.keypointsTitle") }}</span>
          </summary>
          <div class="adv-examples-dock-body">
            <h4 class="adv-ex-part">{{ t("advancedCreation.sections.core.coreDocks.scopeTitle") }}</h4>
            <div class="adv-scope-matrix">
              <ul class="adv-scope-list">
                <li v-for="row in CORE_PERSONALITY_SCOPE_GUIDE" :key="row.field" class="adv-scope-li">
                  <code class="adv-scope-field">{{ row.field }}</code>
                  <p class="adv-scope-mean">{{ row.meaning }}</p>
                  <p class="adv-scope-scope">
                    <strong>{{ t("advancedCreation.docks.scopeStrong") }}</strong>{{ row.scope }}
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </details>
        <details
          class="adv-examples-dock adv-examples-dock--collapsible adv-examples-dock--faq"
          :aria-label="String(t('advancedCreation.sections.core.coreDocks.faqAria'))"
        >
          <summary class="adv-examples-dock-summary">
            <span class="adv-examples-badge adv-examples-badge--faq">{{ t("advancedCreation.docks.badges.faq") }}</span>
            <span class="adv-examples-dock-title">{{ t("advancedCreation.sections.core.coreDocks.faqTitle") }}</span>
          </summary>
          <div class="adv-examples-dock-body">
            <p class="adv-examples-dock-note">
              {{ t("advancedCreation.sections.core.coreDocks.faqNotePrefix") }}<strong>{{ t("advancedCreation.sections.core.coreDocks.faqNoteStrong") }}</strong>{{ t("advancedCreation.sections.core.coreDocks.faqNoteSuffix") }}
            </p>
            <AdvFaqList :items="CORE_FAQ" />
          </div>
        </details>
      </div>
    </section>
    <section v-show="advancedTab === 'world'" class="panel adv-single">
      <WorldKnowledgeSimpleEditor v-model="worldKnowledgeTexts" />
    </section>
    <section v-show="advancedTab === 'config'" class="panel adv-single">
      <ConfigFileEditor v-model="configJsonText" />
    </section>
    <section v-show="advancedTab === 'scenes'" class="panel adv-single">
      <SceneSimpleEditor v-model:entries="sceneEditorEntries" />
    </section>
    <section v-show="advancedTab === 'prompts'" class="panel adv-single">
      <PromptsFileEditor
        v-model:manifest-text="manifestText"
        v-model:settings-text="settingsText"
        v-model:deep-capsule-text="deepCapsuleText"
        v-model:system-prompt-markdown="systemPromptMarkdown"
        v-model:polish-prompt-markdown="polishPromptMarkdown"
      />
    </section>
    <section v-show="advancedTab === 'voice'" class="panel adv-single">
      <VoiceProfileEditor v-model="voiceProfileJson" />
    </section>
    <section v-show="advancedTab === 'ui'" class="panel adv-single">
      <UiConfigEditor :ui-config="uiConfig" />
    </section>
    <section v-show="advancedTab === 'author'" class="panel adv-single">
      <AuthorFileEditor
        v-model:summary="authorSummary"
        v-model:detail-markdown="authorDetailMarkdown"
        v-model:rows="authorRecommendedRows"
        v-model:include-suggested-ui="authorIncludeSuggestedUi"
        v-model:suggested-backends-json="authorSuggestedBackendsJson"
      />
    </section>
    <section v-show="advancedTab === 'images'" class="panel adv-single">
      <div class="adv-section-head">
        <h2 class="adv-h2"><span>{{ t("advancedCreation.sections.images.title") }}</span></h2>
        <p class="adv-lead">{{ t("advancedCreation.sections.images.lead") }}</p>
      </div>
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
      <div class="adv-dock-stack">
        <details
          class="adv-examples-dock adv-examples-dock--collapsible adv-examples-dock--keypoints"
          :aria-label="String(t('advancedCreation.sections.images.docks.keypointsAria'))"
        >
          <summary class="adv-examples-dock-summary">
            <span class="adv-examples-badge">{{ t("advancedCreation.docks.badges.keypoints") }}</span>
            <span class="adv-examples-dock-title">{{ t("advancedCreation.sections.images.docks.keypointsTitle") }}</span>
          </summary>
          <div class="adv-examples-dock-body">
            <h4 class="adv-ex-part">{{ t("advancedCreation.sections.images.docks.eachButtonTitle") }}</h4>
            <div class="adv-scope-matrix">
              <ul class="adv-scope-list">
                <li v-for="row in EMOTION_ASSET_SCOPE_GUIDE" :key="row.field" class="adv-scope-li">
                  <code class="adv-scope-field">{{ row.field }}</code>
                  <p class="adv-scope-mean">{{ row.meaning }}</p>
                  <p class="adv-scope-scope">
                    <strong>{{ t("advancedCreation.docks.scopeStrong") }}</strong>{{ row.scope }}
                  </p>
                </li>
              </ul>
            </div>
            <p class="adv-examples-dock-note">
              {{ t("advancedCreation.sections.images.docks.notePrefix") }}<strong>{{ t("advancedCreation.sections.images.docks.noteStrong") }}</strong>{{ t("advancedCreation.sections.images.docks.noteSuffix") }}
            </p>
          </div>
        </details>
        <details
          class="adv-examples-dock adv-examples-dock--collapsible adv-examples-dock--faq"
          :aria-label="String(t('advancedCreation.sections.images.docks.faqAria'))"
        >
          <summary class="adv-examples-dock-summary">
            <span class="adv-examples-badge adv-examples-badge--faq">{{ t("advancedCreation.docks.badges.faq") }}</span>
            <span class="adv-examples-dock-title">{{ t("advancedCreation.sections.images.docks.faqTitle") }}</span>
          </summary>
          <div class="adv-examples-dock-body">
            <AdvFaqList :items="IMAGES_FAQ" />
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<style scoped>
code {
  font-size: 0.88em;
}

.panel {
  margin-top: 0.75rem;
  padding: 1rem 1.125rem 1.1rem;
  border: 1px solid var(--pack-glass-border);
  border-radius: var(--fluent-radius-lg);
  background: var(--pack-glass-fill);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  box-shadow: var(--fluent-shadow-card), var(--pack-glass-inset);
}

.base-desc {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--fluent-text-secondary);
  line-height: 1.5;
}
.adv-toolbar-lead {
  margin: 0 0 0.65rem;
  font-size: 0.8125rem;
  color: var(--fluent-text-secondary);
  line-height: 1.55;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}
.adv-extensions-hint {
  margin: 0 0 0.85rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--fluent-radius);
  background: color-mix(in srgb, var(--fluent-accent-subtle) 30%, transparent);
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--fluent-text-secondary);
}
.adv-section-head {
  margin-bottom: 0.65rem;
}
.adv-h2 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
}
.adv-h3 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin: 0 0 0.35rem;
  font-size: 0.86rem;
  font-weight: 600;
}
.adv-lead {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--fluent-text-secondary);
  line-height: 1.5;
}
.adv-lead code {
  font-size: 0.78em;
  background: var(--fluent-bg-subtle);
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
}
.adv-key-map {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  color: var(--fluent-text-secondary);
}
.adv-key-map summary {
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  color: var(--fluent-text-primary);
}
.adv-key-list {
  margin: 0.45rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
}
.adv-key-list li {
  line-height: 1.45;
}
.adv-key-list code {
  font-size: 0.72rem;
  background: var(--fluent-bg-subtle);
  padding: 0.08rem 0.28rem;
  border-radius: 3px;
  margin-right: 0.35rem;
}
.adv-key-say {
  font-size: 0.78rem;
  color: var(--fluent-text-secondary);
}
.adv-dock-stack {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.adv-examples-dock {
  margin-top: 0;
  border-radius: var(--fluent-radius-lg);
  border: 1px solid color-mix(in srgb, var(--fluent-accent) 35%, var(--pack-glass-border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--fluent-accent) 10%, var(--pack-glass-fill-subtle)) 0%,
    var(--pack-glass-fill) 48%
  );
  box-shadow:
    var(--fluent-shadow-soft),
    0 0 0 1px color-mix(in srgb, var(--fluent-accent) 12%, transparent) inset;
}
.adv-examples-dock--faq {
  border-color: color-mix(in srgb, var(--fluent-text-secondary) 28%, var(--pack-glass-border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--fluent-text-secondary) 6%, var(--pack-glass-fill-subtle)) 0%,
    var(--pack-glass-fill) 50%
  );
}
.adv-examples-dock:not(.adv-examples-dock--collapsible) {
  padding: 0.85rem 0.95rem 0.95rem;
}
.adv-examples-dock--collapsible {
  padding: 0;
}
.adv-examples-dock-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  padding: 0.85rem 0.95rem;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.adv-examples-dock-summary::-webkit-details-marker {
  display: none;
}
.adv-examples-dock-summary::before {
  content: '▸';
  font-size: 0.75rem;
  color: var(--fluent-accent);
  margin-right: 0.15rem;
  transition: transform 0.15s ease;
}
.adv-examples-dock--collapsible[open] .adv-examples-dock-summary::before {
  transform: rotate(90deg);
}
.adv-examples-dock-body {
  padding: 0 0.95rem 0.95rem;
}
/* 閲嶇偣鍖猴細瀛楁琛ㄩ殢鍐呭澧為珮锛屼笉鍗犲浐瀹氳绐楅珮搴?*/
.adv-examples-dock--keypoints .adv-scope-matrix {
  max-height: none;
  overflow: visible;
  margin-bottom: 0.55rem;
}
.adv-examples-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #fff;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--fluent-accent) 92%, #000) 0%,
    var(--fluent-accent) 100%
  );
  box-shadow: 0 1px 3px color-mix(in srgb, var(--fluent-accent) 35%, transparent);
}
.adv-examples-badge--faq {
  color: var(--fluent-text-primary);
  background: color-mix(in srgb, var(--fluent-text-secondary) 14%, transparent);
  box-shadow: none;
  border: 1px solid color-mix(in srgb, var(--fluent-text-secondary) 22%, transparent);
}
.adv-examples-dock-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--fluent-text-primary);
}
.adv-examples-dock-note {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--fluent-text-secondary);
}
.adv-examples-dock-note strong {
  color: var(--fluent-accent);
  font-weight: 700;
}
.adv-merge-note {
  margin: 0 0 0.65rem;
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--fluent-text-secondary);
  padding: 0.45rem 0.55rem;
  border-radius: var(--fluent-radius);
  background: var(--fluent-bg-subtle);
  border: 1px dashed var(--fluent-border-stroke);
}
.adv-ex-part {
  margin: 0.65rem 0 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--fluent-text-primary);
}
.adv-scope-matrix {
  max-height: min(50vh, 22rem);
  overflow: auto;
  margin-bottom: 0.55rem;
  padding-right: 0.25rem;
}
.adv-scope-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.adv-scope-li {
  margin-bottom: 0.65rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid color-mix(in srgb, var(--pack-glass-border) 80%, transparent);
}
.adv-scope-li:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.adv-scope-field {
  display: block;
  font-size: 0.72rem;
  font-family: var(--fluent-mono);
  margin-bottom: 0.28rem;
  color: var(--fluent-accent);
  font-weight: 600;
  word-break: break-word;
}
.adv-scope-mean {
  margin: 0 0 0.28rem;
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--fluent-text-primary);
}
.adv-scope-scope {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.45;
  color: var(--fluent-text-secondary);
}
.adv-scope-scope strong {
  color: var(--fluent-text-primary);
}
.adv-ex-block {
  margin-bottom: 0.85rem;
  padding-left: 0.55rem;
  border-left: 3px solid color-mix(in srgb, var(--fluent-accent) 55%, transparent);
}
.adv-ex-block:last-child {
  margin-bottom: 0;
}
.adv-ex-title {
  margin: 0 0 0.2rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--fluent-accent) 88%, var(--fluent-text-primary));
}
.adv-ex-caption {
  margin: 0 0 0.35rem;
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--fluent-text-secondary);
}
.adv-ex-pre {
  margin: 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.72rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--fluent-mono);
  border-radius: var(--fluent-radius);
  border: 1px solid color-mix(in srgb, var(--fluent-accent) 22%, var(--pack-glass-border));
  background: color-mix(in srgb, var(--fluent-bg-input) 88%, var(--pack-glass-fill-subtle));
  color: var(--fluent-text-primary);
  box-shadow: var(--pack-glass-inset);
}
.knowledge-actions {
  margin-bottom: 0.75rem;
}
.knowledge-preview {
  border: 1px dashed var(--fluent-border-stroke);
  border-radius: var(--fluent-radius);
  padding: 0.6rem;
  margin-bottom: 0.8rem;
}
.knowledge-preview h3 {
  margin: 0 0 0.35rem;
  font-size: 0.86rem;
}
.knowledge-query {
  width: 100%;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  margin-bottom: 0.55rem;
  box-sizing: border-box;
}
.preview-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;
  align-items: center;
  margin-bottom: 0.45rem;
}
.knowledge-scene {
  min-width: 220px;
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
}
.preview-check {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  font-size: 0.78rem;
  color: var(--fluent-text-secondary);
}
.preview-reset {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  background: var(--fluent-bg-card);
  color: var(--fluent-text-secondary);
  cursor: pointer;
  font-size: 0.75rem;
}
.knowledge-hits {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.35rem;
}
.knowledge-hits li {
  font-size: 0.78rem;
}
.hit-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}
.hit-top code {
  font-size: 0.75rem;
}
.hit-reasons {
  color: var(--fluent-text-secondary);
}
.hit-score {
  color: var(--fluent-text-secondary);
  font-size: 0.75rem;
}
.hit-weight {
  margin-top: 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.hit-weight label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  color: var(--fluent-text-secondary);
}
.hit-weight input[type='range'] {
  width: 150px;
}
.preview-reset-one {
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  background: var(--fluent-bg-subtle);
  color: var(--fluent-text-secondary);
  cursor: pointer;
  font-size: 0.72rem;
}
.hit-snippets {
  margin: 0.2rem 0 0;
  padding-left: 1rem;
  color: var(--fluent-text-secondary);
  font-size: 0.75rem;
}
.knowledge-actions button {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  background: var(--fluent-bg-card);
  color: var(--fluent-text-primary);
  cursor: pointer;
}
.empty-tip {
  font-size: 0.8125rem;
  color: var(--fluent-text-secondary);
  margin-bottom: 0.75rem;
}
.knowledge-card {
  border: 1px solid var(--pack-glass-border);
  border-radius: var(--fluent-radius-lg);
  padding: 0.6rem;
  background: var(--pack-glass-fill-subtle);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  margin-bottom: 0.75rem;
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
}
.knowledge-head {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.knowledge-path {
  flex: 1;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  font-family: var(--fluent-mono);
  font-size: 0.8125rem;
}
.knowledge-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
.knowledge-meta label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: var(--fluent-text-secondary);
}
.knowledge-meta input {
  padding: 0.38rem 0.5rem;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  font-size: 0.8rem;
  font-family: var(--fluent-font);
}
.danger {
  padding: 0.35rem 0.65rem;
  border-radius: var(--fluent-radius);
  border: 1px solid var(--fluent-danger-border);
  background: var(--fluent-danger-bg);
  color: var(--fluent-danger-text);
  cursor: pointer;
}
.adv-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 1rem;
  padding: 2px;
  border-radius: var(--fluent-radius-lg);
  background: var(--pack-glass-fill-subtle);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  border: 1px solid var(--pack-glass-border);
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
}
.adv-toolbar button {
  padding: 0.38rem 0.65rem;
  min-height: 42px;
  border-radius: calc(var(--fluent-radius-lg) - 2px);
  border: none;
  background: transparent;
  color: var(--fluent-text-primary);
  cursor: pointer;
  font-size: 0.8125rem;
  font-family: var(--fluent-font);
  font-weight: 500;
  text-align: left;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    box-shadow 0.18s ease;
}
.tab-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.06rem;
  line-height: 1.2;
}
.tab-title {
  font-size: 0.8125rem;
  font-weight: 600;
}
.tab-file {
  font-size: 0.68rem;
  font-weight: 400;
  color: var(--fluent-text-secondary);
  font-family: var(--fluent-mono);
}
.adv-toolbar button.on {
  background: var(--pack-glass-fill-strong);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  color: var(--fluent-accent);
  box-shadow:
    var(--fluent-shadow-soft),
    var(--pack-glass-inset),
    0 0 0 1px color-mix(in srgb, var(--fluent-accent) 26%, transparent),
    0 0 10px color-mix(in srgb, var(--fluent-accent) 18%, transparent);
}
.adv-toolbar button:not(.on):hover {
  background: rgba(0, 0, 0, 0.05);
}
.adv-toolbar button:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.92),
    0 0 0 4px var(--fluent-border-focus);
}
:global(html[data-theme='dark']) .adv-toolbar button:not(.on):hover {
  background: rgba(255, 255, 255, 0.06);
}
.adv-single {
  margin-top: 0.75rem;
  padding: 0;
  --adv-editor-min-h: min(62vh, 640px);
}
.h2-spaced {
  margin-top: 1.25rem;
}
.adv-single :deep(.ta:not(.ta--short)) {
  min-height: var(--adv-editor-min-h);
}
.ta {
  width: 100%;
  min-height: min(62vh, 640px);
  padding: 0.65rem 0.75rem;
  font-family: var(--fluent-mono);
  font-size: 12px;
  line-height: 1.45;
  border: 1px solid var(--fluent-border-control);
  border-radius: var(--fluent-radius);
  resize: vertical;
  box-sizing: border-box;
  background: var(--fluent-bg-input);
  color: var(--fluent-text-primary);
}
.ta:focus-visible {
  outline: 2px solid var(--fluent-border-focus);
  outline-offset: -1px;
}
.ta--short {
  min-height: 4.5rem;
  font-family: var(--fluent-font);
}
.creator-message-file {
  margin: 1rem 0;
  padding: .85rem;
  border: 1px solid var(--fluent-border-stroke);
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-accent) 5%, transparent);
}
.creator-message-file h3 {
  display: flex;
  align-items: center;
  gap: .4rem;
  margin: 0 0 .55rem;
  font-size: .9rem;
}
.creator-message-file textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
}
@media (max-width: 860px) {
  .knowledge-meta {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
}
@media (max-width: 560px) {
  .knowledge-meta {
    grid-template-columns: 1fr;
  }
}

.creator-msg-mode {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0.5rem 0 0.65rem;
}
.radio-line {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--fluent-text-primary);
  cursor: pointer;
}
.radio-line input {
  margin-top: 0.2rem;
  flex-shrink: 0;
}
</style>
