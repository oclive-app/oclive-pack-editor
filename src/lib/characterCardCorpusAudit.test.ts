import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { importCharacterCard } from './characterCardImport'
import {
  buildRolePackFiles,
  collectRolePackBinaryFilesForExport,
} from './exportPack'
import { runAllPackChecks } from './packChecks'

const corpusRoot = process.env.OCLIVE_CHARACTER_CARD_CORPUS?.trim()
const reportPath = process.env.OCLIVE_CHARACTER_CARD_AUDIT_REPORT?.trim()

const CARD_EXTENSIONS = new Set(['.json', '.png', '.apng', '.charx'])

interface CorpusAuditResult {
  file: string
  bytes: number
  status: 'converted' | 'rejected'
  sourceFormat?: string
  roleId?: string
  converted?: string[]
  review?: string[]
  personalityChars?: number
  scenes?: number
  greetings?: number
  knowledgeFiles?: number
  portraitFiles?: number
  textFiles?: number
  binaryFiles?: number
  error?: string
}

async function collectCardFiles(root: string): Promise<string[]> {
  const output: string[] = []
  const pending = [root]
  while (pending.length) {
    const current = pending.pop()!
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        pending.push(fullPath)
      } else if (CARD_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        output.push(fullPath)
      }
    }
  }
  return output.sort((left, right) => left.localeCompare(right))
}

function mimeForFile(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.apng') return 'image/apng'
  if (extension === '.json') return 'application/json'
  if (extension === '.charx') return 'application/charx'
  return 'application/octet-stream'
}

describe('Character Card local corpus audit', () => {
  it.skipIf(!corpusRoot)('converts an explicitly supplied local corpus and writes an aggregate report', async () => {
    if (!corpusRoot) return
    const cardFiles = await collectCardFiles(corpusRoot)
    const results: CorpusAuditResult[] = []

    for (const filePath of cardFiles) {
      const bytes = await readFile(filePath)
      const relativePath = path.relative(corpusRoot, filePath).replaceAll('\\', '/')
      const file = new File([bytes], path.basename(filePath), { type: mimeForFile(filePath) })
      try {
        const conversion = await importCharacterCard(file)
        const packCheck = await runAllPackChecks(
          conversion.input.manifestJson,
          conversion.input.settingsJson,
        )
        if (!packCheck.ok) {
          throw new Error(`转换后的基础角色包校验失败：${packCheck.errors.join('；')}`)
        }
        const manifest = JSON.parse(conversion.input.manifestJson) as Record<string, unknown>
        const settings = JSON.parse(conversion.input.settingsJson) as Record<string, unknown>
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
        JSON.parse(textFiles.get(blueprintPath) ?? '')
        const binaryFiles = collectRolePackBinaryFilesForExport(
          conversion.report.roleId,
          textFiles.keys(),
          {
            emotionImages: conversion.input.emotionImageFiles,
            preservedFiles: conversion.input.preservedFiles,
          },
        )
        results.push({
          file: relativePath,
          bytes: bytes.byteLength,
          status: 'converted',
          sourceFormat: conversion.report.sourceFormat,
          roleId: conversion.report.roleId,
          converted: [...conversion.report.converted],
          review: [...conversion.report.review],
          personalityChars: conversion.input.corePersonality?.length ?? 0,
          scenes: conversion.input.sceneEditorEntries?.length ?? 0,
          greetings: conversion.input.sceneEditorEntries?.reduce(
            (count, scene) => count + (scene.welcomeMessage ? 1 : 0) + scene.monologues.length,
            0,
          ) ?? 0,
          knowledgeFiles: conversion.input.knowledgeMarkdownFiles?.length ?? 0,
          portraitFiles: conversion.input.emotionImageFiles?.length ?? 0,
          textFiles: textFiles.size,
          binaryFiles: binaryFiles.length,
        })
      } catch (error) {
        results.push({
          file: relativePath,
          bytes: bytes.byteLength,
          status: 'rejected',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const converted = results.filter((item) => item.status === 'converted')
    const rejected = results.filter((item) => item.status === 'rejected')
    const byFormat = Object.fromEntries(
      [...new Set(converted.map((item) => item.sourceFormat).filter(Boolean))]
        .sort()
        .map((format) => [format, converted.filter((item) => item.sourceFormat === format).length]),
    )
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      corpusRoot,
      summary: {
        total: results.length,
        converted: converted.length,
        rejected: rejected.length,
        byFormat,
      },
      results,
    }

    if (reportPath) {
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    }
    console.info(`CHARACTER_CARD_CORPUS_AUDIT ${JSON.stringify(report.summary)}`)
    for (const item of rejected) console.info(`CHARACTER_CARD_CORPUS_REJECTED ${item.file}: ${item.error}`)

    expect(results.length).toBeGreaterThan(0)
    expect(converted.length).toBeGreaterThan(0)
  })
})
