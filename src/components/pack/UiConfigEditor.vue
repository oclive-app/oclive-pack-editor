<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { UiConfig } from '../../types/uiConfig'
import HelpHint from '../HelpHint.vue'

const props = defineProps<{ uiConfig: UiConfig }>()
const { t } = useI18n()
const slotKeys = Object.keys(props.uiConfig.slots) as Array<keyof UiConfig['slots']>

function csv(values: string[]): string {
  return values.join(', ')
}

function updateSlot(key: keyof UiConfig['slots'], field: 'order' | 'visible', event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  props.uiConfig.slots[key][field] = raw.split(/[,，]/).map((value) => value.trim()).filter(Boolean)
}
</script>

<template>
  <div class="ui-editor">
    <div class="section-head">
      <h2><code>ui.json</code> <HelpHint :paragraphs="[String(t('advancedCreation.ui.help.file'))]" /></h2>
      <p>{{ t('simpleCreation.ui.desc') }}</p>
    </div>
    <div class="grid">
      <label><span>{{ t('simpleCreation.ui.shellLabel') }} <HelpHint :paragraphs="[String(t('advancedCreation.ui.help.shell'))]" /></span><input v-model="uiConfig.shell" type="text" /></label>
      <label><span>{{ t('simpleCreation.ui.theme.primary') }} <HelpHint :paragraphs="[String(t('advancedCreation.ui.help.theme'))]" /></span><input v-model="uiConfig.theme.primaryColor" type="text" placeholder="#7c5cff" /></label>
      <label><span>{{ t('simpleCreation.ui.theme.background') }}</span><input v-model="uiConfig.theme.backgroundColor" type="text" /></label>
      <label><span>{{ t('simpleCreation.ui.theme.font') }}</span><input v-model="uiConfig.theme.fontFamily" type="text" /></label>
      <label><span>{{ t('simpleCreation.ui.layout.sidebar') }} <HelpHint :paragraphs="[String(t('advancedCreation.ui.help.layout'))]" /></span><select v-model="uiConfig.layout.sidebar"><option value="">{{ t('simpleCreation.ui.common.defaultBuiltin') }}</option><option value="left">{{ t('simpleCreation.ui.common.left') }}</option><option value="right">{{ t('simpleCreation.ui.common.right') }}</option></select></label>
      <label><span>{{ t('simpleCreation.ui.layout.chatInput') }}</span><select v-model="uiConfig.layout.chatInput"><option value="">{{ t('simpleCreation.ui.common.defaultBuiltin') }}</option><option value="bottom">{{ t('simpleCreation.ui.common.bottom') }}</option><option value="top">{{ t('simpleCreation.ui.common.top') }}</option></select></label>
    </div>
    <div class="slots-head"><h3>{{ t('advancedCreation.ui.slotsTitle') }}</h3><HelpHint :paragraphs="[String(t('advancedCreation.ui.help.slots'))]" /></div>
    <div class="slot-grid">
      <article v-for="key in slotKeys" :key="key" class="slot-card">
        <h4><code>{{ key }}</code></h4>
        <label><span>{{ t('advancedCreation.ui.order') }}</span><input :value="csv(uiConfig.slots[key].order)" type="text" @change="updateSlot(key, 'order', $event)" /></label>
        <label><span>{{ t('simpleCreation.ui.slot.defaultVisible') }}</span><input :value="csv(uiConfig.slots[key].visible)" type="text" @change="updateSlot(key, 'visible', $event)" /></label>
      </article>
    </div>
  </div>
</template>

<style scoped>
.ui-editor { padding: 1rem; }
.section-head h2, .slots-head, label > span { display: flex; align-items: center; gap: .4rem; }
.section-head h2 { margin: 0; font-size: 1.05rem; }
.section-head p { color: var(--fluent-text-secondary); font-size: .8125rem; line-height: 1.5; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .8rem; }
label > span { margin-bottom: .35rem; font-size: .8125rem; }
label input, label select { width: 100%; box-sizing: border-box; }
.slots-head { margin-top: 1.2rem; }
.slots-head h3 { margin: 0; font-size: .95rem; }
.slot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: .7rem; margin-top: .7rem; }
.slot-card { padding: .75rem; border: 1px solid var(--fluent-border-stroke); border-radius: var(--fluent-radius-md); }
.slot-card h4 { margin: 0 0 .6rem; }
.slot-card label + label { display: block; margin-top: .55rem; }
</style>
