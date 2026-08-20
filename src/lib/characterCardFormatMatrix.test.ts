import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import {
  charxCard,
  embeddedPayload,
  jsonCard,
  legacyFieldPng,
  pngCard,
  pngChunk,
  TEST_PNG_SIGNATURE,
  v1Card,
  v2Card,
  v3Card,
  zipFile,
} from './characterCardImport.fixtures'
import {
  importCharacterCard,
  type CharacterCardConversion,
  type CharacterCardSourceFormat,
} from './characterCardImport'
import { buildRolePackFiles } from './exportPack'
import { runAllPackChecks } from './packChecks'

type FormatCase = {
  name: string
  sourceFormat: CharacterCardSourceFormat
  makeFile: () => File | Promise<File>
}

function dualVersionPng(): File {
  return new File([
    TEST_PNG_SIGNATURE,
    pngChunk('tEXt', embeddedPayload('chara', v2Card({ name: 'Fallback Two' }))),
    pngChunk('tEXt', embeddedPayload('ccv3', v3Card({ name: 'Preferred Three' }))),
    pngChunk('IEND', new Uint8Array()),
  ], 'dual-version.png', { type: 'image/png' })
}

async function expectValidPackFoundation(conversion: CharacterCardConversion): Promise<void> {
  const manifest = JSON.parse(conversion.input.manifestJson) as Record<string, unknown>
  const settings = JSON.parse(conversion.input.settingsJson) as Record<string, unknown>
  const packCheck = await runAllPackChecks(
    conversion.input.manifestJson,
    conversion.input.settingsJson,
  )
  expect(packCheck.errors).toEqual([])
  expect(packCheck.ok).toBe(true)

  const textFiles = buildRolePackFiles(
    conversion.report.roleId,
    manifest,
    settings,
    {
      corePersonality: conversion.input.corePersonality ?? '',
      worldviewMarkdown: conversion.input.worldviewMarkdown ?? '',
      knowledgeMarkdownFiles: conversion.input.knowledgeMarkdownFiles ?? [],
      emotionImages: conversion.input.emotionImageFiles ?? [],
      portraitCatalogJson: conversion.input.portraitCatalogJson,
      configJson: conversion.input.configJson,
      adultExtensionJson: conversion.input.adultExtensionJson,
      creatorMessage: conversion.input.creatorMessage,
      authorJson: conversion.input.authorJson,
      systemPromptMarkdown: conversion.input.systemPromptMarkdown,
      preservedFiles: conversion.input.preservedFiles,
      sceneEditorEntries: conversion.input.sceneEditorEntries,
    },
  )
  const blueprintPath = `${conversion.report.roleId}/pipeline.ocblueprint`
  expect(() => JSON.parse(textFiles.get(blueprintPath) ?? '')).not.toThrow()
  expect(conversion.input.adultExtensionJson).toBe('')
}

const formatCases: FormatCase[] = [
  {
    name: 'Tavern V1 flat JSON',
    sourceFormat: 'v1-json',
    makeFile: () => jsonCard(v1Card(), 'v1.json'),
  },
  {
    name: 'Tavern V1 chara PNG with Base64 payload',
    sourceFormat: 'v1-png',
    makeFile: () => pngCard(v1Card(), 'chara'),
  },
  {
    name: 'Tavern V1 chara PNG with raw JSON payload',
    sourceFormat: 'v1-png',
    makeFile: () => pngCard(v1Card(), 'chara', { encoding: 'json' }),
  },
  {
    name: 'Tavern V1 chara PNG with uncompressed international text',
    sourceFormat: 'v1-png',
    makeFile: () => pngCard(v1Card(), 'chara', { chunkType: 'iTXt' }),
  },
  {
    name: 'Character Card V2 explicit JSON',
    sourceFormat: 'v2-json',
    makeFile: () => jsonCard(v2Card(), 'v2.json'),
  },
  {
    name: 'Character Card V2 unwrapped JSON dialect',
    sourceFormat: 'v2-json',
    makeFile: () => jsonCard(v2Card().data, 'v2-unwrapped.json'),
  },
  {
    name: 'Character Card V2 chara PNG with Base64 payload',
    sourceFormat: 'v2-png',
    makeFile: () => pngCard(v2Card(), 'chara'),
  },
  {
    name: 'Character Card V2 chara PNG with raw JSON payload',
    sourceFormat: 'v2-png',
    makeFile: () => pngCard(v2Card(), 'chara', { encoding: 'json' }),
  },
  {
    name: 'Character Card V2 chara PNG with Base64URL payload',
    sourceFormat: 'v2-png',
    makeFile: () => pngCard(v2Card(), 'chara', { encoding: 'base64url' }),
  },
  {
    name: 'Character Card V3 JSON',
    sourceFormat: 'v3-json',
    makeFile: () => jsonCard(v3Card(), 'v3.json'),
  },
  {
    name: 'Character Card V3 ccv3 PNG',
    sourceFormat: 'v3-png',
    makeFile: () => pngCard(v3Card(), 'ccv3'),
  },
  {
    name: 'Character Card V3 ccv3 APNG',
    sourceFormat: 'v3-apng',
    makeFile: () => pngCard(v3Card(), 'ccv3', { name: 'v3.apng', type: 'image/apng' }),
  },
  {
    name: 'Character Card V3 CHARX',
    sourceFormat: 'v3-charx',
    makeFile: () => charxCard(v3Card()),
  },
  {
    name: 'Character Card V3 wins when ccv3 and chara coexist',
    sourceFormat: 'v3-png',
    makeFile: dualVersionPng,
  },
]

describe('[spec-fixture] Character Card container matrix', () => {
  it.each(formatCases)('$name', async ({ makeFile, sourceFormat }) => {
    const conversion = await importCharacterCard(await makeFile())
    expect(conversion.report.sourceFormat).toBe(sourceFormat)
    expect(conversion.report.converted).toContain('identity')
    expect(conversion.report.converted).toContain('persona')
    expect(conversion.input.preservedFiles?.map((item) => item.relPath))
      .toContain('imports/original_character_card.json')
    await expectValidPackFoundation(conversion)
  })
})

describe('[spec-fixture] Character Card field mapping', () => {
  it('normalizes char and user macros without losing Unicode text', async () => {
    const conversion = await importCharacterCard(jsonCard(v2Card({
      name: '测试角色',
      description: '{{char}} 喜欢安静阅读。',
      scenario: '<bot> 正在等待 <user>。',
      first_mes: '你好，{{user}}。',
      alternate_greetings: ['欢迎回来，<user>。'],
    })))
    expect(conversion.input.corePersonality).toContain('测试角色 喜欢安静阅读。')
    expect(conversion.input.sceneEditorEntries?.[0]?.scenePrompt).toBe('测试角色 正在等待 用户。')
    expect(conversion.input.sceneEditorEntries?.[0]?.welcomeMessage).toBe('你好，用户。')
    expect(conversion.input.sceneEditorEntries?.[0]?.monologues).toEqual(['欢迎回来，用户。'])
  })

  it('uses a V3 nickname for prompt macros while retaining the formal name', async () => {
    const conversion = await importCharacterCard(jsonCard(v3Card({
      name: 'Formal Name',
      nickname: 'Nick',
      description: '{{char}} answers carefully.',
    })))
    expect(conversion.input.corePersonality).toContain('你是Formal Name')
    expect(conversion.input.corePersonality).toContain('Nick answers carefully.')
  })

  it('preserves external prompts as review-only material', async () => {
    const conversion = await importCharacterCard(jsonCard(v2Card({
      system_prompt: 'External system instruction.',
      post_history_instructions: 'External post-history instruction.',
    })))
    expect(conversion.report.review).toContain('externalPromptsReference')
    expect(conversion.input.systemPromptMarkdown).toContain('仅供创作者检查')
    expect(conversion.input.systemPromptMarkdown).toContain('External system instruction.')
    expect(conversion.input.corePersonality).not.toContain('External system instruction.')
  })

  it('maps ordinary enabled lorebook entries to knowledge files', async () => {
    const conversion = await importCharacterCard(jsonCard(v2Card({
      character_book: {
        entries: [{
          keys: ['station'],
          content: 'The station closes at midnight.',
          enabled: true,
        }],
      },
    })))
    expect(conversion.report.converted).toContain('lorebook')
    expect(conversion.report.review).not.toContain('advancedLorebookReference')
    expect(conversion.input.knowledgeMarkdownFiles?.[0]?.content).toContain('station closes')
  })

  it('does not activate disabled lorebook entries', async () => {
    const conversion = await importCharacterCard(jsonCard(v2Card({
      character_book: {
        entries: [{ keys: ['hidden'], content: 'Disabled content.', enabled: false }],
      },
    })))
    expect(conversion.input.knowledgeMarkdownFiles).toEqual([])
    expect(conversion.report.converted).not.toContain('lorebook')
  })

  it('flags advanced lorebook behavior for human review', async () => {
    const conversion = await importCharacterCard(jsonCard(v3Card({
      character_book: {
        entries: [{
          keys: ['^station$'],
          content: 'Regex-triggered reference.',
          enabled: true,
          use_regex: true,
          constant: true,
          selective: true,
          secondary_keys: ['platform'],
          position: 'before_char',
        }],
      },
    })))
    expect(conversion.report.converted).toContain('lorebook')
    expect(conversion.report.review).toContain('advancedLorebookReference')
  })

  it('retains creator metadata, multilingual notes, source and timestamps', async () => {
    const conversion = await importCharacterCard(jsonCard(v3Card({
      creator_notes: 'English note.',
      creator_notes_multilingual: { zh: '中文说明', ja: '日本語メモ' },
      source: ['https://example.invalid/source'],
      creation_date: 10,
      modification_date: 20,
    })))
    expect(conversion.report.converted).toContain('creatorMetadata')
    expect(conversion.input.authorJson).toContain('中文说明')
    expect(conversion.input.authorJson).toContain('日本語メモ')
    expect(conversion.input.authorJson).toContain('https://example.invalid/source')
    expect(conversion.input.authorJson).toContain('创建：10')
  })

  it('keeps group-only greetings as inactive review material', async () => {
    const conversion = await importCharacterCard(jsonCard(v3Card({
      group_only_greetings: ['Hello, group.'],
      alternate_greetings: ['Hello, individual.'],
    })))
    expect(conversion.report.review).toContain('groupGreetingsReference')
    expect(conversion.input.sceneEditorEntries?.[0]?.monologues).toEqual(['Hello, individual.'])
    expect(conversion.input.authorJson).toContain('Hello, group.')
  })

  it('imports future V3 revisions while marking them for review', async () => {
    const conversion = await importCharacterCard(jsonCard({
      ...v3Card(),
      spec_version: '3.8',
    }))
    expect(conversion.report.sourceFormat).toBe('v3-json')
    expect(conversion.report.review).toContain('futureVersionReference')
  })

  it('maps a safe raster data URL without fetching the network', async () => {
    const conversion = await importCharacterCard(jsonCard(v3Card({
      assets: [{
        type: 'icon',
        uri: 'data:image/png;base64,iVBORw0KGgo=',
        name: 'main',
        ext: 'png',
      }],
    })))
    expect(conversion.report.converted).toContain('portrait')
    expect(conversion.input.emotionImageFiles?.map((item) => item.name)).toEqual(['neutral.png'])
  })
})

describe('[observed-dialect] conservative ecosystem compatibility', () => {
  it('imports legacy Tavern PNG files that store one text chunk per field', async () => {
    const conversion = await importCharacterCard(legacyFieldPng({
      name: 'Legacy Fixture',
      description: 'Legacy flat metadata.',
      personality: 'Patient.',
      scenario: 'A quiet room.',
      first_message: 'Hello from a legacy card.',
      alternate_greetings: 'Morning. | Evening.',
      categories: 'Test, Legacy',
    }))
    expect(conversion.report.sourceFormat).toBe('v1-png')
    expect(conversion.input.sceneEditorEntries?.[0]?.monologues).toEqual(['Morning.', 'Evening.'])
  })

  it('retains private V2 extensions as inactive review material', async () => {
    const conversion = await importCharacterCard(jsonCard(v2Card({
      extensions: {
        platform_fixture: { talkativeness: 0.5, favorite: true },
      },
    })))
    expect(conversion.report.review).toContain('privateExtensionsReference')
    expect(conversion.input.adultExtensionJson).toBe('')
  })

  it('imports a local Risu static image asset but does not execute platform logic', async () => {
    const webpSignature = Uint8Array.from([
      82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32,
    ])
    const file = await charxCard(v3Card({
      assets: [{
        type: 'x-risu-asset',
        uri: 'embeded://assets/other/images/happy.png',
        name: 'Fixture Three_happy',
        ext: 'png',
      }],
    }), (zip) => zip.file('assets/other/images/happy.png', webpSignature), 'risu-fixture.charx')
    const conversion = await importCharacterCard(file)
    expect(conversion.input.emotionImageFiles?.map((item) => item.name)).toEqual(['happy.webp'])
    expect(conversion.report.review).toContain('v3AssetsReference')
  })
})

describe('[negative-security] malformed and unsafe inputs', () => {
  const rejectionCases: Array<{
    name: string
    makeFile: () => File | Promise<File>
    message: RegExp
  }> = [
    {
      name: 'JSON array instead of an object',
      makeFile: () => jsonCard([], 'array.json'),
      message: /JSON 须为对象/,
    },
    {
      name: 'malformed JSON document',
      makeFile: () => new File(['{"name":'], 'broken.json', { type: 'application/json' }),
      message: /JSON 无法解析/,
    },
    {
      name: 'V2 object without data',
      makeFile: () => jsonCard({ spec: 'chara_card_v2', spec_version: '2.0' }),
      message: /V2 缺少 data/,
    },
    {
      name: 'V3 object without a character name',
      makeFile: () => jsonCard(v3Card({ name: '' })),
      message: /V3 缺少角色名称/,
    },
    {
      name: 'ordinary PNG metadata that is not a card',
      makeFile: () => legacyFieldPng({ name: 'Photo', description: 'Not a card.' }, 'photo.png'),
      message: /未找到角色卡元数据/,
    },
    {
      name: 'file with a PNG extension but invalid signature',
      makeFile: () => new File(['not png'], 'fake.png', { type: 'image/png' }),
      message: /不是有效的 PNG/,
    },
    {
      name: 'truncated PNG chunk',
      makeFile: () => new File([
        TEST_PNG_SIGNATURE,
        Uint8Array.from([0, 0, 0, 100, 116, 69, 88, 116, 1, 2]),
      ], 'truncated.png', { type: 'image/png' }),
      message: /PNG 数据块损坏/,
    },
    {
      name: 'invalid Base64 metadata',
      makeFile: () => new File([
        TEST_PNG_SIGNATURE,
        pngChunk('tEXt', new TextEncoder().encode('chara\0***')),
        pngChunk('IEND', new Uint8Array()),
      ], 'invalid-base64.png', { type: 'image/png' }),
      message: /不是有效的 Base64/,
    },
    {
      name: 'CHARX that is not a ZIP archive',
      makeFile: () => new File(['not zip'], 'invalid.charx', { type: 'application/zip' }),
      message: /不是有效的 ZIP/,
    },
    {
      name: 'CHARX without root card.json',
      makeFile: async () => {
        const zip = new JSZip()
        zip.file('nested/card.json', JSON.stringify(v3Card()))
        return zipFile(zip, 'missing-root-card.charx')
      },
      message: /根目录缺少 card.json/,
    },
    {
      name: 'CHARX with malformed card.json',
      makeFile: async () => {
        const zip = new JSZip()
        zip.file('card.json', '{"spec":')
        return zipFile(zip, 'malformed-card.charx')
      },
      message: /card.json 不是有效 JSON/,
    },
    {
      name: 'CHARX containing a V2 card',
      makeFile: () => charxCard(v2Card(), undefined, 'v2.charx'),
      message: /不是 Character Card V3/,
    },
    {
      name: 'CHARX path traversal attempt',
      makeFile: () => charxCard(v3Card(), (zip) => zip.file('../outside.txt', 'blocked'), 'unsafe.charx'),
      message: /不安全的文件路径/,
    },
    {
      name: 'CHARX with more than 1024 archive entries',
      makeFile: async () => {
        const zip = new JSZip()
        zip.file('card.json', JSON.stringify(v3Card()))
        for (let index = 0; index < 1024; index++) zip.file(`assets/other/${index}.txt`, '')
        return zipFile(zip, 'too-many-entries.charx')
      },
      message: /文件条目超过 1024 个/,
    },
  ]

  it.each(rejectionCases)('rejects $name', async ({ makeFile, message }) => {
    await expect(importCharacterCard(await makeFile())).rejects.toThrow(message)
  })

  it('does not fetch remote assets or execute script and SVG data URLs', async () => {
    const conversion = await importCharacterCard(jsonCard(v3Card({
      assets: [
        { type: 'icon', uri: 'https://example.invalid/portrait.png', name: 'main', ext: 'png' },
        { type: 'emotion', uri: 'data:image/svg+xml;base64,PHN2Zy8+', name: 'svg', ext: 'svg' },
        { type: 'emotion', uri: 'data:text/javascript;base64,YWxlcnQoMSk=', name: 'script', ext: 'js' },
      ],
    })))
    expect(conversion.input.emotionImageFiles).toEqual([])
    expect(conversion.report.review).toContain('v3AssetsReference')
  })
})
