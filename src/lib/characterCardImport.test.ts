import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import {
  extractCharacterCardJsonFromPng,
  importCharacterCard,
  parseCharacterCardJson,
} from './characterCardImport'
import {
  buildRolePackFiles,
  collectRolePackBinaryFilesForExport,
} from './exportPack'
import {
  embeddedPayload,
  pngCard,
  pngChunk,
  zipFile,
} from './characterCardImport.fixtures'

describe('characterCardImport', () => {
  it('detects Tavern V1 JSON', () => {
    const parsed = parseCharacterCardJson({
      name: 'Alice',
      description: 'A traveler.',
      personality: 'Curious.',
      scenario: 'At a station.',
      first_mes: 'Hello.',
      mes_example: '<START>',
    })
    expect(parsed.version).toBe(1)
    expect(parsed.data.name).toBe('Alice')
  })

  it('converts V2 fields into an editable OCLive foundation', async () => {
    const file = new File([JSON.stringify({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'Alice Smith',
        description: '{{char}} is a traveler.',
        personality: 'Curious and calm.',
        scenario: '{{char}} meets {{user}} at a station.',
        first_mes: 'Hello, {{user}}.',
        mes_example: '{{char}}: The train is late.',
        alternate_greetings: ['Good evening, {{user}}.'],
        creator: 'Card Author',
        creator_notes: 'Imported notes.',
        character_version: '2.3.0',
        system_prompt: 'Platform-specific system prompt.',
        character_book: {
          entries: [{ keys: ['station'], content: 'The station closes at midnight.' }],
        },
        extensions: { vendor: { setting: true } },
      },
    })], 'alice.json', { type: 'application/json' })

    const converted = await importCharacterCard(file)
    const manifest = JSON.parse(converted.input.manifestJson) as Record<string, unknown>
    const settings = JSON.parse(converted.input.settingsJson) as Record<string, unknown>
    const scene = converted.input.sceneEditorEntries?.[0]

    expect(converted.report.sourceFormat).toBe('v2-json')
    expect(converted.report.roleId).toBe('alice_smith')
    expect(manifest.name).toBe('Alice Smith')
    expect(manifest.version).toBe('2.3.0')
    expect(settings.reply_quality_anchor).toContain('【角色表现优化】')
    expect(converted.input.corePersonality).toContain('Alice Smith is a traveler.')
    expect(converted.input.corePersonality).toContain('Alice Smith: The train is late.')
    expect(scene?.scenePrompt).toContain('Alice Smith meets 用户')
    expect(scene?.welcomeMessage).toBe('Hello, 用户.')
    expect(scene?.monologues).toEqual(['Good evening, 用户.'])
    expect(converted.input.knowledgeMarkdownFiles?.[0]?.content).toContain('station closes')
    expect(converted.input.systemPromptMarkdown).toContain('仅供创作者检查')
    expect(converted.report.review).toContain('privateExtensionsReference')
    expect(converted.input.adultExtensionJson).toBe('')

    const textFiles = buildRolePackFiles(
      converted.report.roleId,
      manifest,
      settings,
      {
        corePersonality: converted.input.corePersonality ?? '',
        worldviewMarkdown: '',
        knowledgeMarkdownFiles: converted.input.knowledgeMarkdownFiles ?? [],
        emotionImages: converted.input.emotionImageFiles ?? [],
        portraitCatalogJson: converted.input.portraitCatalogJson,
        configJson: converted.input.configJson,
        authorJson: converted.input.authorJson,
        systemPromptMarkdown: converted.input.systemPromptMarkdown,
        preservedFiles: converted.input.preservedFiles,
        sceneEditorEntries: converted.input.sceneEditorEntries,
      },
    )
    const sceneJson = JSON.parse(textFiles.get('alice_smith/scenes/default/scene.json') ?? '{}')
    const blueprint = JSON.parse(textFiles.get('alice_smith/pipeline.ocblueprint') ?? '{}')
    expect(sceneJson.welcome_message).toBe('Hello, 用户.')
    expect(sceneJson.monologues).toEqual(['Good evening, 用户.'])
    expect(blueprint.runtime_config.reply_quality_anchor).toContain('【角色表现优化】')
    expect(textFiles.get('alice_smith/prompts/system.md')).toContain('Platform-specific')
    expect(textFiles.get('alice_smith/knowledge/imported_lore_001.md')).toContain('station closes')
    expect(
      collectRolePackBinaryFilesForExport(
        'alice_smith',
        textFiles.keys(),
        { preservedFiles: converted.input.preservedFiles },
      ).map((item) => item.relPath),
    ).toContain('imports/original_character_card.json')
  })

  it('extracts a V2 card from PNG and uses the image as the neutral portrait', async () => {
    const file = pngCard({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'Png Role',
        description: 'Portrait role.',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
        alternate_greetings: [],
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        tags: [],
        creator: '',
        character_version: '',
        extensions: {},
      },
    })

    const extracted = await extractCharacterCardJsonFromPng(file) as { spec?: string }
    expect(extracted.spec).toBe('chara_card_v2')

    const converted = await importCharacterCard(file)
    expect(converted.report.sourceFormat).toBe('v2-png')
    expect(converted.report.converted).toContain('portrait')
    expect(converted.input.emotionImageFiles?.[0]?.name).toBe('neutral.png')
    expect(converted.input.portraitCatalogJson).toContain('neutral_default')
  })

  it('imports legacy V1 PNG cards with one text chunk per field', async () => {
    const flatChunk = (key: string, value: string) => pngChunk(
      'tEXt',
      new TextEncoder().encode(`${key}\0${value}`),
    )
    const file = new File([
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
      flatChunk('name', 'Puro'),
      flatChunk('personality', 'Soft-spoken bookshop cat.'),
      flatChunk('first_message', '*looks up* Oh.'),
      flatChunk('scenario', 'A quiet bookshop at night.'),
      flatChunk('categories', 'Slice of Life, Literary'),
      flatChunk('alternate_greetings', 'Good morning. | Good evening.'),
      pngChunk('IEND', new Uint8Array()),
    ], 'legacy-flat.png', { type: 'image/png' })

    const converted = await importCharacterCard(file)
    expect(converted.report.sourceFormat).toBe('v1-png')
    expect(converted.report.roleId).toBe('puro')
    expect(converted.input.corePersonality).toContain('Soft-spoken bookshop cat.')
    expect(converted.input.sceneEditorEntries?.[0]?.welcomeMessage).toBe('*looks up* Oh.')
    expect(converted.input.sceneEditorEntries?.[0]?.monologues)
      .toEqual(['Good morning.', 'Good evening.'])
    expect(converted.input.authorJson).toContain('Slice of Life')
  })

  it('does not mistake ordinary descriptive PNG metadata for a legacy V1 card', async () => {
    const flatChunk = (key: string, value: string) => pngChunk(
      'tEXt',
      new TextEncoder().encode(`${key}\0${value}`),
    )
    const file = new File([
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
      flatChunk('name', 'Vacation photo'),
      flatChunk('description', 'A normal image with descriptive metadata.'),
      pngChunk('IEND', new Uint8Array()),
    ], 'photo.png', { type: 'image/png' })

    await expect(extractCharacterCardJsonFromPng(file))
      .rejects.toThrow(/未找到角色卡元数据/)
  })

  it('parses V3 JSON and applies nickname macros without activating group-only greetings', async () => {
    const file = new File([JSON.stringify({
      spec: 'chara_card_v3',
      spec_version: '3.1',
      data: {
        name: 'Alice Formal',
        nickname: 'Alice',
        description: '{{char}} is a V3 traveler.',
        personality: 'Careful.',
        scenario: '<char> meets <user>.',
        first_mes: 'Hello, {{user}}.',
        mes_example: '',
        creator_notes: '',
        creator_notes_multilingual: { zh: '中文说明' },
        system_prompt: '',
        post_history_instructions: '',
        alternate_greetings: [],
        group_only_greetings: ['Welcome, group.'],
        character_book: {
          entries: [{
            keys: ['^station$'],
            content: 'Regex-triggered lore.',
            enabled: true,
            use_regex: true,
            constant: false,
          }],
        },
        tags: [],
        creator: '',
        character_version: '3.0.0',
        source: ['https://example.invalid/card'],
        extensions: {},
      },
    })], 'alice-v3.json', { type: 'application/json' })

    const converted = await importCharacterCard(file)
    expect(converted.report.sourceFormat).toBe('v3-json')
    expect(converted.input.corePersonality).toContain('Alice is a V3 traveler.')
    expect(converted.input.sceneEditorEntries?.[0]?.scenePrompt).toBe('Alice meets 用户.')
    expect(converted.input.sceneEditorEntries?.[0]?.monologues).toEqual([])
    expect(converted.report.review).toContain('groupGreetingsReference')
    expect(converted.report.review).toContain('advancedLorebookReference')
    expect(converted.report.review).toContain('futureVersionReference')
    expect(converted.input.authorJson).toContain('Welcome, group.')
    expect(converted.input.authorJson).toContain('中文说明')
  })

  it('prefers ccv3 over a V2 chara fallback in PNG', async () => {
    const v2 = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: { name: 'Fallback V2' },
    }
    const v3 = {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { name: 'Preferred V3' },
    }
    const file = new File([
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk('tEXt', embeddedPayload('chara', v2)),
      pngChunk('tEXt', embeddedPayload('ccv3', v3)),
      pngChunk('IEND', new Uint8Array()),
    ], 'dual-card.png', { type: 'image/png' })

    const extracted = await extractCharacterCardJsonFromPng(file) as { spec?: string }
    expect(extracted.spec).toBe('chara_card_v3')
    const converted = await importCharacterCard(file)
    expect(converted.report.sourceFormat).toBe('v3-png')
    expect(converted.report.roleId).toBe('preferred_v3')
    expect(converted.input.emotionImageFiles?.[0]?.name).toBe('neutral.png')
  })

  it('imports V3 APNG metadata and retains the original container', async () => {
    const png = pngCard({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { name: 'Animated Role' },
    }, 'ccv3')
    const file = new File([await png.arrayBuffer()], 'animated.apng', { type: 'image/apng' })

    const converted = await importCharacterCard(file)
    expect(converted.report.sourceFormat).toBe('v3-apng')
    expect(converted.input.emotionImageFiles?.[0]?.name).toBe('neutral.png')
    expect(converted.input.preservedFiles?.map((item) => item.relPath))
      .toContain('imports/original_character_card.apng')
  })

  it('imports CHARX embedded icon and emotion images while retaining unsupported assets', async () => {
    const zip = new JSZip()
    zip.file('card.json', JSON.stringify({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: 'CHARX Alice',
        description: 'Archive role.',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        alternate_greetings: [],
        group_only_greetings: [],
        tags: [],
        creator: '',
        character_version: '3.0.0',
        extensions: {},
        assets: [
          { type: 'icon', uri: 'embeded://assets/icon/images/main.png', name: 'main', ext: 'png' },
          { type: 'emotion', uri: 'embeded://assets/emotion/images/happy.png', name: 'happy', ext: 'png' },
          { type: 'background', uri: 'https://example.invalid/bg.png', name: 'main', ext: 'png' },
        ],
      },
    }))
    const pngSignature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
    zip.file('assets/icon/images/main.png', pngSignature)
    zip.file('assets/emotion/images/happy.png', pngSignature)
    const file = await zipFile(zip)

    const converted = await importCharacterCard(file)
    expect(converted.report.sourceFormat).toBe('v3-charx')
    expect(converted.input.emotionImageFiles?.map((item) => item.name).sort())
      .toEqual(['happy.png', 'neutral.png'])
    expect(converted.input.portraitCatalogJson).toContain('happy_default')
    expect(converted.input.portraitCatalogJson).toContain('neutral_default')
    expect(converted.report.review).toContain('v3AssetsReference')
    expect(converted.input.preservedFiles?.map((item) => item.relPath))
      .toContain('imports/original_character_card.charx')
  })

  it('sniffs mislabeled CHARX images and imports Risu image assets for review', async () => {
    const zip = new JSZip()
    zip.file('card.json', JSON.stringify({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: 'Risu Alice',
        assets: [
          { type: 'icon', uri: 'embeded://assets/icon/image/main.png', name: 'main', ext: 'png' },
          {
            type: 'x-risu-asset',
            uri: 'embeded://assets/other/image/angry.png',
            name: 'Risu Alice_angry',
            ext: 'png',
          },
        ],
      },
    }))
    const webpSignature = Uint8Array.from([
      82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32,
    ])
    zip.file('assets/icon/image/main.png', webpSignature)
    zip.file('assets/other/image/angry.png', webpSignature)

    const converted = await importCharacterCard(await zipFile(zip, 'risu-assets.charx'))
    expect(converted.input.emotionImageFiles?.map((item) => item.name).sort())
      .toEqual(['angry.webp', 'neutral.webp'])
    expect(converted.input.portraitCatalogJson).toContain('angry_default')
    expect(converted.input.portraitCatalogJson).toContain('neutral_default')
    expect(converted.report.review).toContain('v3AssetsReference')
  })

  it('rejects unsafe CHARX archive paths', async () => {
    const zip = new JSZip()
    zip.file('card.json', JSON.stringify({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { name: 'Unsafe' },
    }))
    zip.file('../outside.txt', 'not allowed')
    await expect(importCharacterCard(await zipFile(zip, 'unsafe.charx')))
      .rejects.toThrow(/不安全的文件路径/)
  })
})
