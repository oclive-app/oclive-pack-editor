import {
  DEFAULT_CORE_PERSONALITY_TEXT,
  DEFAULT_MANIFEST_JSON,
  DEFAULT_SETTINGS_JSON,
} from '../defaults'
import type { SceneEditorEntry } from './scenePackUser'
import type { WorldKnowledgeTexts } from './worldKnowledgeUser'

export const NEW_PACK_PRESET_IDS = ['blank', 'companion', 'story', 'knowledge'] as const
export type NewPackPresetId = (typeof NEW_PACK_PRESET_IDS)[number]

export type NewPackPreset = {
  id: NewPackPresetId
  manifestText: string
  settingsText: string
  corePersonalityText: string
  worldKnowledgeTexts: WorldKnowledgeTexts
  sceneEditorEntries: SceneEditorEntry[]
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function defaultManifest(): Record<string, unknown> {
  return JSON.parse(DEFAULT_MANIFEST_JSON) as Record<string, unknown>
}

function defaultSettings(): Record<string, unknown> {
  return JSON.parse(DEFAULT_SETTINGS_JSON) as Record<string, unknown>
}

function presetSettings(sceneIds: string[]): string {
  const settings = defaultSettings()
  settings.memory_config = {
    scene_weight_multiplier: 1.2,
    topic_weights: Object.fromEntries(sceneIds.map((sceneId) => [sceneId, { 日常: 1.0 }])),
  }
  return prettyJson(settings)
}

function scene(
  sceneId: string,
  displayName: string,
  scenePrompt: string,
): SceneEditorEntry {
  return {
    sceneId,
    displayName,
    activitySetting: '',
    scenePrompt,
  }
}

export function buildNewPackPreset(id: NewPackPresetId): NewPackPreset {
  if (id === 'companion') {
    const manifest = defaultManifest()
    manifest.id = 'daily_companion'
    manifest.name = '日常陪伴角色'
    manifest.description = '适合日常聊天、生活陪伴与关系逐步发展的角色起点。'
    manifest.scenes = ['home', 'walk']
    manifest.user_relations = {
      friend: {
        display_name: '熟悉的朋友',
        prompt_hint: '你们彼此熟悉，可以自然关心近况，但不要替用户说话或复述用户原句。',
        favor_multiplier: 1.0,
        initial_favorability: 55,
      },
    }
    return {
      id,
      manifestText: prettyJson(manifest),
      settingsText: presetSettings(['home', 'walk']),
      corePersonalityText:
        '这是一个用于继续完善的日常陪伴角色起点。说话自然、愿意倾听，会根据用户信息量调整回复长短；不替用户作决定，不复述用户刚说过的话。请继续补充具体性格、口癖、经历与关系边界。\n',
      worldKnowledgeTexts: { dialogueWorldview: '', knowledgeBoundary: '' },
      sceneEditorEntries: [
        scene('home', '家中', '以放松的日常相处为主，主动承接用户的话题，避免每轮重新寒暄。'),
        scene('walk', '散步', '环境更轻松开放，可以聊近况、观察周围事物并自然推进话题。'),
      ],
    }
  }

  if (id === 'story') {
    const manifest = defaultManifest()
    manifest.id = 'story_role'
    manifest.name = '剧情互动角色'
    manifest.description = '适合多场景、带动作与事件发展的剧情角色起点。'
    manifest.scenes = ['opening', 'daily']
    return {
      id,
      manifestText: prettyJson(manifest),
      settingsText: presetSettings(['opening', 'daily']),
      corePersonalityText:
        '这是一个用于继续完善的剧情互动角色起点。角色应保持自身目标、情绪与行动逻辑，用短句和长句混合推进剧情；可以描写角色自己的动作，但不得替用户编造台词、动作或决定。请继续补充背景、动机、弱点与说话风格。\n',
      worldKnowledgeTexts: {
        dialogueWorldview: '故事规则与时代背景由创作者继续补充；角色应遵守已经写明的世界规则。',
        knowledgeBoundary: '角色只知道其经历、身份与当前场景允许知道的信息，不凭空获得场外知识。',
      },
      sceneEditorEntries: [
        scene('opening', '初次登场', '完成角色与用户的自然相遇，建立当下目标，不替用户决定反应。'),
        scene('daily', '日常推进', '承接已经发生的事件与关系变化，让角色依据人设主动行动。'),
      ],
    }
  }

  if (id === 'knowledge') {
    const manifest = defaultManifest()
    manifest.id = 'knowledge_guide'
    manifest.name = '知识向角色'
    manifest.description = '适合围绕特定知识领域讲解、讨论和陪伴学习的角色起点。'
    manifest.scenes = ['consulting']
    manifest.knowledge = { enabled: true, glob: 'knowledge/**/*.md' }
    return {
      id,
      manifestText: prettyJson(manifest),
      settingsText: presetSettings(['consulting']),
      corePersonalityText:
        '这是一个用于继续完善的知识向角色起点。表达清楚、耐心，先判断用户真正想解决的问题；区分事实、推测与个人建议，不确定时明确说明。请继续补充擅长领域、表达风格与不能回答的边界。\n',
      worldKnowledgeTexts: {
        dialogueWorldview: '对话以交流、讲解和共同梳理问题为主；具体世界背景可由创作者继续补充。',
        knowledgeBoundary: '只在创作者指定的知识范围内给出确定结论；超出范围时说明不确定，并建议核实可靠来源。',
      },
      sceneEditorEntries: [
        scene('consulting', '交流与讲解', '先澄清目标，再分步骤解释；根据用户熟悉程度调整术语和篇幅。'),
      ],
    }
  }

  return {
    id: 'blank',
    manifestText: DEFAULT_MANIFEST_JSON,
    settingsText: DEFAULT_SETTINGS_JSON,
    corePersonalityText: DEFAULT_CORE_PERSONALITY_TEXT,
    worldKnowledgeTexts: { dialogueWorldview: '', knowledgeBoundary: '' },
    sceneEditorEntries: [],
  }
}
