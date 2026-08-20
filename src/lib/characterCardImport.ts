import JSZip from 'jszip'
import { DEFAULT_MANIFEST_JSON } from '../defaults'
import type { ApplyLoadedPackInput } from './applyLoadedPackToEditor'
import { buildKnowledgeMarkdown } from './knowledgeFrontMatter'
import {
  buildPortraitCatalogJson,
  buildSimpleConfigJson,
  PORTRAIT_SLOT_TAG,
  type PortraitCatalogEntry,
  type PortraitSlotFileMap,
  type PortraitSlotId,
} from './portraitCatalog'
import {
  applySimpleManifestToJson,
  applySimpleSettingsToJson,
  defaultSimpleManifestForm,
  defaultSimpleSettingsForm,
} from './simpleCreation'

const MAX_CHARACTER_CARD_BYTES = 50 * 1024 * 1024
const MAX_EMBEDDED_METADATA_BYTES = 8 * 1024 * 1024
const MAX_CHARX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
const MAX_CHARX_ASSET_BYTES = 25 * 1024 * 1024
const MAX_CHARX_ENTRIES = 1024
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const
const LEGACY_PNG_FIELD_BY_KEY: Record<string, string> = {
  name: 'name',
  personality: 'personality',
  scenario: 'scenario',
  first_mes: 'first_mes',
  first_message: 'first_mes',
  description: 'description',
  system_prompt: 'system_prompt',
  post_history_instructions: 'post_history_instructions',
  creator_notes: 'creator_notes',
  tags: 'tags',
  categories: 'tags',
  alternate_greetings: 'alternate_greetings',
}

export type CharacterCardSourceFormat =
  | 'v1-json'
  | 'v2-json'
  | 'v1-png'
  | 'v2-png'
  | 'v3-json'
  | 'v3-png'
  | 'v3-apng'
  | 'v3-charx'

export type CharacterCardReportCode =
  | 'identity'
  | 'persona'
  | 'scene'
  | 'greetings'
  | 'dialogueExamples'
  | 'lorebook'
  | 'portrait'
  | 'creatorMetadata'
  | 'externalPromptsReference'
  | 'privateExtensionsReference'
  | 'v3AssetsReference'
  | 'groupGreetingsReference'
  | 'advancedLorebookReference'
  | 'futureVersionReference'
  | 'languageAndAdultDeferred'

export type CharacterCardConversionReport = {
  sourceFileName: string
  sourceFormat: CharacterCardSourceFormat
  roleId: string
  converted: CharacterCardReportCode[]
  review: CharacterCardReportCode[]
}

export type CharacterCardConversion = {
  input: ApplyLoadedPackInput
  report: CharacterCardConversionReport
}

type CharacterBookEntry = {
  keys?: unknown
  content?: unknown
  enabled?: unknown
  name?: unknown
  comment?: unknown
  use_regex?: unknown
  constant?: unknown
  selective?: unknown
  secondary_keys?: unknown
  position?: unknown
}

type CharacterCardAsset = {
  type: string
  uri: string
  name: string
  ext: string
}

type CharacterCardData = {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  alternate_greetings: string[]
  character_book?: { entries?: CharacterBookEntry[] }
  tags: string[]
  creator: string
  character_version: string
  extensions: Record<string, unknown>
  nickname: string
  creator_notes_multilingual: Record<string, string>
  source: string[]
  group_only_greetings: string[]
  assets: CharacterCardAsset[]
  assetsDefined: boolean
  assetsHadUnsupportedEntries: boolean
  creation_date?: number
  modification_date?: number
}

type ParsedCharacterCard = {
  version: 1 | 2 | 3
  specVersion: string
  data: CharacterCardData
  original: Record<string, unknown>
}

type CharacterCardContainer = 'json' | 'png' | 'apng' | 'charx'

type CharacterCardAssetResolver = (asset: CharacterCardAsset) => Promise<File | null>

type CharacterCardImportContext = {
  container: CharacterCardContainer
  resolveAsset?: CharacterCardAssetResolver
  defaultImage?: File
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : []
}

function multilingualStrings(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key.trim().toLowerCase(), stringValue(item)] as const)
      .filter(([key, item]) => /^[a-z]{2}$/.test(key) && Boolean(item)),
  )
}

function cardAssets(value: unknown): CharacterCardAsset[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const type = stringValue(item.type).toLowerCase()
    const uri = stringValue(item.uri)
    const name = stringValue(item.name)
    const ext = stringValue(item.ext).toLowerCase().replace(/^\./, '')
    if (!type || !uri || !name || !ext) return []
    return [{ type, uri, name, ext }]
  })
}

function optionalTimestamp(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function cardDataFromRecord(record: Record<string, unknown>): CharacterCardData {
  const parsedAssets = cardAssets(record.assets)
  const characterBook = isRecord(record.character_book)
    ? { entries: Array.isArray(record.character_book.entries)
        ? (record.character_book.entries as CharacterBookEntry[])
        : [] }
    : undefined
  return {
    name: stringValue(record.name),
    description: stringValue(record.description),
    personality: stringValue(record.personality),
    scenario: stringValue(record.scenario),
    first_mes: stringValue(record.first_mes),
    mes_example: stringValue(record.mes_example),
    creator_notes: stringValue(record.creator_notes),
    system_prompt: stringValue(record.system_prompt),
    post_history_instructions: stringValue(record.post_history_instructions),
    alternate_greetings: stringArray(record.alternate_greetings),
    character_book: characterBook,
    tags: stringArray(record.tags),
    creator: stringValue(record.creator),
    character_version: stringValue(record.character_version),
    extensions: isRecord(record.extensions) ? record.extensions : {},
    nickname: stringValue(record.nickname),
    creator_notes_multilingual: multilingualStrings(record.creator_notes_multilingual),
    source: stringArray(record.source),
    group_only_greetings: stringArray(record.group_only_greetings),
    assets: parsedAssets,
    assetsDefined: Array.isArray(record.assets),
    assetsHadUnsupportedEntries: Array.isArray(record.assets)
      && parsedAssets.length !== record.assets.length,
    creation_date: optionalTimestamp(record.creation_date),
    modification_date: optionalTimestamp(record.modification_date),
  }
}

export function parseCharacterCardJson(value: unknown): ParsedCharacterCard {
  if (!isRecord(value)) throw new Error('角色卡 JSON 须为对象。')
  if (value.spec === 'chara_card_v3') {
    if (!isRecord(value.data)) throw new Error('Character Card V3 缺少 data 对象。')
    const data = cardDataFromRecord(value.data)
    if (!data.name) throw new Error('Character Card V3 缺少角色名称 data.name。')
    return {
      version: 3,
      specVersion: stringValue(value.spec_version) || '3.0',
      data,
      original: value,
    }
  }
  if (value.spec === 'chara_card_v2') {
    if (!isRecord(value.data)) throw new Error('Character Card V2 缺少 data 对象。')
    const data = cardDataFromRecord(value.data)
    if (!data.name) throw new Error('Character Card V2 缺少角色名称 data.name。')
    return {
      version: 2,
      specVersion: stringValue(value.spec_version) || '2.0',
      data,
      original: value,
    }
  }

  const flat = isRecord(value.data) && typeof value.data.name === 'string'
    ? value.data
    : value
  const hasV2Field = [
    'creator_notes',
    'system_prompt',
    'post_history_instructions',
    'alternate_greetings',
    'character_book',
    'character_version',
    'extensions',
  ].some((key) => key in flat)
  const data = cardDataFromRecord(flat)
  if (!data.name) throw new Error('未识别为角色卡：缺少 name。')
  const version = hasV2Field || isRecord(value.data) ? 2 : 1
  return {
    version,
    specVersion: version === 2 ? stringValue(value.spec_version) || '2.0' : '1.0',
    data,
    original: value,
  }
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! * 0x1000000)
    + (bytes[offset + 1]! << 16)
    + (bytes[offset + 2]! << 8)
    + bytes[offset + 3]!
  ) >>> 0
}

function bytesToAscii(bytes: Uint8Array): string {
  let output = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    output += String.fromCharCode(...bytes.slice(offset, offset + 8192))
  }
  return output
}

async function inflateDeflate(bytes: Uint8Array<ArrayBufferLike>): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前环境无法解压 PNG 中的压缩角色卡元数据。请改用 JSON 角色卡。')
  }
  const input = new Blob([bytes as BlobPart]).stream()
  const output = input.pipeThrough(new DecompressionStream('deflate'))
  const buffer = await new Response(output).arrayBuffer()
  if (buffer.byteLength > MAX_EMBEDDED_METADATA_BYTES) {
    throw new Error('PNG 中的角色卡元数据过大。')
  }
  return new Uint8Array(buffer)
}

async function decodePngTextChunk(type: string, data: Uint8Array): Promise<{ key: string; text: string } | null> {
  const firstNull = data.indexOf(0)
  if (firstNull <= 0) return null
  const key = bytesToAscii(data.slice(0, firstNull))

  if (type === 'tEXt') {
    return { key, text: bytesToAscii(data.slice(firstNull + 1)) }
  }
  if (type === 'zTXt') {
    const compressionMethod = data[firstNull + 1]
    if (compressionMethod !== 0) throw new Error('PNG 角色卡使用了未知压缩方式。')
    const inflated = await inflateDeflate(data.slice(firstNull + 2))
    return { key, text: new TextDecoder().decode(inflated) }
  }
  if (type !== 'iTXt') return null

  let cursor = firstNull + 1
  const compressed = data[cursor++] === 1
  const compressionMethod = data[cursor++]
  const languageEnd = data.indexOf(0, cursor)
  if (languageEnd < 0) return null
  cursor = languageEnd + 1
  const translatedEnd = data.indexOf(0, cursor)
  if (translatedEnd < 0) return null
  cursor = translatedEnd + 1
  let textBytes: Uint8Array<ArrayBufferLike> = data.slice(cursor)
  if (compressed) {
    if (compressionMethod !== 0) throw new Error('PNG 角色卡使用了未知压缩方式。')
    textBytes = await inflateDeflate(textBytes)
  }
  return { key, text: new TextDecoder().decode(textBytes) }
}

function decodeEmbeddedCharacterCard(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('PNG 角色卡元数据为空。')
  if (trimmed.startsWith('{')) return JSON.parse(trimmed) as unknown

  const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    throw new Error('PNG 角色卡元数据不是有效的 Base64。')
  }
  if (binary.length > MAX_EMBEDDED_METADATA_BYTES) {
    throw new Error('PNG 中的角色卡元数据过大。')
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

function legacyPngList(text: string, separator: string): string[] {
  try {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) return parsed.map(stringValue).filter(Boolean)
  } catch {
    // Legacy hand-authored cards commonly use comma or pipe separators.
  }
  return text.split(separator).map((item) => item.trim()).filter(Boolean)
}

async function extractCharacterCardFromPng(file: File): Promise<{
  value: unknown
  legacyFlatV1: boolean
}> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < PNG_SIGNATURE.length
    || PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) {
    throw new Error('所选文件不是有效的 PNG。')
  }

  let offset = PNG_SIGNATURE.length
  let v2Payload = ''
  let v3Payload = ''
  let sawImageEnd = false
  const legacyFields: Record<string, unknown> = {}
  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset)
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    if (dataEnd + 4 > bytes.length) {
      throw new Error('PNG 数据块损坏。')
    }
    const type = bytesToAscii(bytes.slice(offset + 4, offset + 8))
    if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
      if (length > MAX_EMBEDDED_METADATA_BYTES) {
        throw new Error('PNG 中的角色卡元数据过大。')
      }
      const decoded = await decodePngTextChunk(type, bytes.slice(dataStart, dataEnd))
      if (decoded?.key === 'chara' && !v2Payload) v2Payload = decoded.text
      if (decoded?.key === 'ccv3' && !v3Payload) v3Payload = decoded.text
      const legacyField = decoded ? LEGACY_PNG_FIELD_BY_KEY[decoded.key] : undefined
      if (legacyField && legacyFields[legacyField] == null) {
        legacyFields[legacyField] = legacyField === 'tags'
          ? legacyPngList(decoded!.text, ',')
          : legacyField === 'alternate_greetings'
            ? legacyPngList(decoded!.text, '|')
            : decoded!.text
      }
    }
    offset = dataEnd + 4
    if (type === 'IEND') {
      sawImageEnd = true
      break
    }
  }
  if (!sawImageEnd) throw new Error('PNG 数据块损坏：缺少完整的 IEND。')
  if (v3Payload) return { value: decodeEmbeddedCharacterCard(v3Payload), legacyFlatV1: false }
  if (v2Payload) return { value: decodeEmbeddedCharacterCard(v2Payload), legacyFlatV1: false }
  if (stringValue(legacyFields.name) && stringValue(legacyFields.first_mes)) {
    return { value: legacyFields, legacyFlatV1: true }
  }
  throw new Error('PNG/APNG 中未找到角色卡元数据（ccv3 或 chara）。')
}

export async function extractCharacterCardJsonFromPng(file: File): Promise<unknown> {
  return (await extractCharacterCardFromPng(file)).value
}

function normalizeArchivePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function isSafeArchivePath(path: string): boolean {
  if (!path || path.startsWith('/') || path.startsWith('\\') || path.includes('\0')) return false
  if (path.includes('\\')) return false
  const segments = path.split('/')
  return segments.every((segment, index) => {
    if (!segment) return index === segments.length - 1
    return segment !== '.' && segment !== '..'
  })
}

function declaredZipEntrySize(entry: JSZip.JSZipObject): number | null {
  const internal = entry as unknown as { _data?: { uncompressedSize?: unknown } }
  const value = internal._data?.uncompressedSize
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}

const SUPPORTED_V3_IMAGE_EXTENSIONS = new Set([
  'png', 'apng', 'jpg', 'jpeg', 'webp', 'gif', 'avif',
])

const SUPPORTED_V3_IMAGE_MIMES = new Set([
  'image/png', 'image/apng', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
])

function imageMimeFromExtension(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'apng') return 'image/apng'
  return `image/${ext}`
}

function detectedRasterImageExtension(bytes: Uint8Array): string | null {
  if (bytes.length >= PNG_SIGNATURE.length
    && PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return 'png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg'
  }
  if (bytes.length >= 6) {
    const signature = bytesToAscii(bytes.slice(0, 6))
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'gif'
  }
  if (bytes.length >= 12
    && bytesToAscii(bytes.slice(0, 4)) === 'RIFF'
    && bytesToAscii(bytes.slice(8, 12)) === 'WEBP') {
    return 'webp'
  }
  if (bytes.length >= 12 && bytesToAscii(bytes.slice(4, 8)) === 'ftyp') {
    const brand = bytesToAscii(bytes.slice(8, 12))
    if (brand === 'avif' || brand === 'avis') return 'avif'
  }
  return null
}

function effectiveRasterImageExtension(bytes: Uint8Array, declaredExt: string): string | null {
  const detected = detectedRasterImageExtension(bytes)
  if (detected === 'png' && declaredExt === 'apng') return 'apng'
  return detected
}

async function dataUrlAsset(asset: CharacterCardAsset): Promise<File | null> {
  if (!SUPPORTED_V3_IMAGE_EXTENSIONS.has(asset.ext)) return null
  const match = asset.uri.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=_-]+)$/i)
  if (!match) return null
  if (!SUPPORTED_V3_IMAGE_MIMES.has(match[1]!.toLowerCase())) return null
  const encoded = match[2]!
  if (encoded.length > Math.ceil(MAX_CHARX_ASSET_BYTES * 4 / 3) + 8) return null
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    return null
  }
  if (binary.length > MAX_CHARX_ASSET_BYTES) return null
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  const effectiveExt = effectiveRasterImageExtension(bytes, asset.ext)
  if (!effectiveExt) return null
  return new File([bytes], `asset.${effectiveExt}`, {
    type: imageMimeFromExtension(effectiveExt),
  })
}

async function importCharacterCardFromCharx(
  file: File,
): Promise<{ parsed: ParsedCharacterCard; context: CharacterCardImportContext }> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error('CHARX 不是有效的 ZIP 压缩包。')
  }

  const entries = Object.values(zip.files)
  if (entries.length > MAX_CHARX_ENTRIES) {
    throw new Error(`CHARX 文件条目超过 ${MAX_CHARX_ENTRIES} 个，已拒绝读取。`)
  }
  let declaredTotal = 0
  for (const entry of entries) {
    if (entry.dir) continue
    const originalName = (entry as JSZip.JSZipObject & { unsafeOriginalName?: string }).unsafeOriginalName
      ?? entry.name
    if (!isSafeArchivePath(originalName)
      || normalizeArchivePath(originalName) !== normalizeArchivePath(entry.name)) {
      throw new Error('CHARX 中存在不安全的文件路径。')
    }
    const size = declaredZipEntrySize(entry)
    if (size == null) throw new Error('CHARX 缺少可验证的解压尺寸信息。')
    declaredTotal += size
    if (declaredTotal > MAX_CHARX_UNCOMPRESSED_BYTES) {
      throw new Error('CHARX 解压后超过 100 MB，已拒绝读取。')
    }
  }

  const cardEntry = zip.file('card.json')
  if (!cardEntry || cardEntry.dir) throw new Error('CHARX 根目录缺少 card.json。')
  const cardSize = declaredZipEntrySize(cardEntry)
  if (cardSize == null || cardSize > MAX_EMBEDDED_METADATA_BYTES) {
    throw new Error('CHARX 的 card.json 过大。')
  }
  const cardBytes = await cardEntry.async('uint8array')
  if (cardBytes.byteLength > MAX_EMBEDDED_METADATA_BYTES) {
    throw new Error('CHARX 的 card.json 过大。')
  }
  let value: unknown
  try {
    value = JSON.parse(new TextDecoder().decode(cardBytes)) as unknown
  } catch {
    throw new Error('CHARX 的 card.json 不是有效 JSON。')
  }
  const parsed = parseCharacterCardJson(value)
  if (parsed.version !== 3) throw new Error('CHARX 的 card.json 不是 Character Card V3。')

  const resolveAsset: CharacterCardAssetResolver = async (asset) => {
    const fromDataUrl = await dataUrlAsset(asset)
    if (fromDataUrl) return fromDataUrl
    const lowerUri = asset.uri.toLowerCase()
    const prefix = lowerUri.startsWith('embeded://')
      ? 'embeded://'
      : lowerUri.startsWith('embedded://')
        ? 'embedded://'
        : ''
    if (!prefix || !SUPPORTED_V3_IMAGE_EXTENSIONS.has(asset.ext)) return null
    const rawPath = asset.uri.slice(prefix.length)
    if (!isSafeArchivePath(rawPath)) return null
    const entry = zip.file(rawPath)
    if (!entry || entry.dir) return null
    const declaredSize = declaredZipEntrySize(entry)
    if (declaredSize == null || declaredSize > MAX_CHARX_ASSET_BYTES) return null
    const bytes = await entry.async('uint8array')
    if (bytes.byteLength > MAX_CHARX_ASSET_BYTES) return null
    const effectiveExt = effectiveRasterImageExtension(bytes, asset.ext)
    if (!effectiveExt) return null
    const rawName = rawPath.split('/').pop() || 'asset'
    const sourceStem = rawName.replace(/\.[^.]+$/, '') || 'asset'
    return new File([bytes as BlobPart], `${sourceStem}.${effectiveExt}`, {
      type: imageMimeFromExtension(effectiveExt),
    })
  }

  return { parsed, context: { container: 'charx', resolveAsset } }
}

function normalizeRoleId(name: string): string {
  const ascii = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
  return ascii || 'imported_character'
}

function normalizeCardMacros(text: string, roleName: string): string {
  return text
    .replace(/\{\{\s*char\s*\}\}/gi, roleName)
    .replace(/<(?:char|bot)>/gi, roleName)
    .replace(/\{\{\s*user\s*\}\}/gi, '用户')
    .replace(/<user>/gi, '用户')
}

function cardMacroName(data: CharacterCardData): string {
  return data.nickname || data.name
}

function validSemverOrDefault(value: string): string {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)
    ? value
    : '1.0.0'
}

function truncateChars(value: string, max: number): string {
  return Array.from(value).slice(0, max).join('')
}

function buildCorePersonality(data: CharacterCardData): string {
  const sections: string[] = [`【角色身份】\n你是${data.name}。`]
  if (data.nickname && data.nickname !== data.name) {
    sections.push(`【角色昵称】\n${data.nickname}`)
  }
  if (data.description) sections.push(`【角色描述】\n${data.description}`)
  if (data.personality) sections.push(`【性格与行为】\n${data.personality}`)
  if (data.mes_example) sections.push(`【原角色卡对话示例】\n${data.mes_example}`)
  return normalizeCardMacros(sections.join('\n\n'), cardMacroName(data)).trim() + '\n'
}

function buildKnowledgeFiles(data: CharacterCardData) {
  const entries = data.character_book?.entries ?? []
  return entries.flatMap((entry, index) => {
    if (!isRecord(entry) || entry.enabled === false) return []
    const body = normalizeCardMacros(stringValue(entry.content), cardMacroName(data))
    if (!body) return []
    const id = `imported_lore_${String(index + 1).padStart(3, '0')}`
    const keys = stringArray(entry.keys).slice(0, 12)
    const eventHints = entry.use_regex === true ? [] : keys
    const label = stringValue(entry.name) || stringValue(entry.comment)
    const content = buildKnowledgeMarkdown(
      {
        id,
        tags: ['角色卡知识', ...keys],
        scenes: [],
        eventHints,
        weight: 1,
      },
      label ? `# ${label}\n\n${body}` : body,
    )
    return [{ path: `knowledge/${id}.md`, content }]
  })
}

function hasAdvancedLorebookSemantics(data: CharacterCardData): boolean {
  return (data.character_book?.entries ?? []).some((entry) =>
    isRecord(entry)
    && (
      entry.use_regex === true
      || entry.constant === true
      || entry.selective === true
      || Array.isArray(entry.secondary_keys)
      || typeof entry.position === 'string'
    ),
  )
}

function buildExternalPromptReference(data: CharacterCardData): string {
  const sections = [
    data.system_prompt ? `## system_prompt\n\n${data.system_prompt}` : '',
    data.post_history_instructions
      ? `## post_history_instructions\n\n${data.post_history_instructions}`
      : '',
  ].filter(Boolean)
  if (!sections.length) return ''
  return `# 外部角色卡 Prompt 参考\n\n> 仅供创作者检查，不会替代 OCLive 的核心人设、回复优化或内核约束。\n\n${normalizeCardMacros(sections.join('\n\n'), cardMacroName(data))}\n`
}

function buildAuthorJson(data: CharacterCardData, sourceFormat: CharacterCardSourceFormat): string {
  const details: string[] = []
  if (data.creator_notes) details.push(`## 原创作者说明\n\n${data.creator_notes}`)
  if (Object.keys(data.creator_notes_multilingual).length) {
    details.push(
      `## 多语言作者说明\n\n${Object.entries(data.creator_notes_multilingual)
        .map(([language, value]) => `### ${language}\n\n${value}`)
        .join('\n\n')}`,
    )
  }
  if (data.tags.length) details.push(`## 原角色卡标签\n\n${data.tags.join('、')}`)
  if (data.character_version) details.push(`## 原角色卡版本\n\n${data.character_version}`)
  if (data.source.length) details.push(`## 原角色卡来源\n\n${data.source.join('\n')}`)
  if (data.group_only_greetings.length) {
    details.push(
      `## V3 群聊专用开场（仅保留参考，未激活）\n\n${data.group_only_greetings
        .map((value, index) => `${index + 1}. ${value}`)
        .join('\n')}`,
    )
  }
  if (data.creation_date != null || data.modification_date != null) {
    details.push(
      `## V3 时间元数据\n\n创建：${data.creation_date ?? '未知'}\n\n修改：${data.modification_date ?? '未知'}`,
    )
  }
  const sourceVersion = sourceFormat.startsWith('v3')
    ? 'V3'
    : sourceFormat.startsWith('v2')
      ? 'V2'
      : 'V1'
  return `${JSON.stringify({
    schema_version: 1,
    summary: `从 Character Card ${sourceVersion} 转换`,
    detail_markdown: details.join('\n\n'),
    recommended_plugins: [],
  }, null, 2)}\n`
}

const SLOT_ID_BY_TAG = Object.fromEntries(
  Object.entries(PORTRAIT_SLOT_TAG).map(([id, tag]) => [tag, id as PortraitSlotId]),
) as Record<string, PortraitSlotId>

function safeAssetStem(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  return normalized || fallback
}

function uniqueAssetFileName(stem: string, ext: string, used: Set<string>): string {
  const normalizedExt = SUPPORTED_V3_IMAGE_EXTENSIONS.has(ext) ? ext : 'png'
  const base = safeAssetStem(stem, 'ccv3_asset')
  let candidate = `${base}.${normalizedExt}`
  let index = 2
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}_${index++}.${normalizedExt}`
  }
  used.add(candidate.toLowerCase())
  return candidate
}

function imageExtensionFromFile(file: File, fallback: string): string {
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? ''
  return SUPPORTED_V3_IMAGE_EXTENSIONS.has(fromName) ? fromName : fallback
}

function emotionAssetKey(asset: CharacterCardAsset, data: CharacterCardData, index: number): string {
  let key = safeAssetStem(asset.name, `emotion_${index + 1}`)
  const prefixes = [data.name, data.nickname]
    .map((item) => safeAssetStem(item, ''))
    .filter(Boolean)
  for (const prefix of prefixes) {
    if (key.startsWith(`${prefix}_`)) {
      key = key.slice(prefix.length + 1)
      break
    }
  }
  if (key === 'default' || key === 'normal') return 'neutral'
  return key.replace(/_default$/, '') || 'neutral'
}

type ConvertedPortraitAssets = {
  slotFiles: PortraitSlotFileMap
  extraEntries: PortraitCatalogEntry[]
  files: File[]
  skipped: boolean
}

async function convertPortraitAssets(
  parsed: ParsedCharacterCard,
  file: File,
  context: CharacterCardImportContext,
): Promise<ConvertedPortraitAssets> {
  const slotFiles: PortraitSlotFileMap = {}
  const extraEntries: PortraitCatalogEntry[] = []
  const files: File[] = []
  const usedNames = new Set<string>()

  if (parsed.version !== 3) {
    if (context.container === 'png' || context.container === 'apng') {
      const portrait = new File([file], 'neutral.png', { type: 'image/png' })
      slotFiles.neutral_default = portrait
      files.push(portrait)
    }
    return { slotFiles, extraEntries, files, skipped: false }
  }

  const data = parsed.data
  const declaredAssets = data.assetsDefined
    ? data.assets
    : [{ type: 'icon', uri: 'ccdefault:', name: 'main', ext: 'png' }]
  const mainIcon = declaredAssets.find((asset) => asset.type === 'icon' && asset.name === 'main')
    ?? declaredAssets.find((asset) => asset.type === 'icon')
  const emotionAssets = declaredAssets.filter((asset) =>
    asset.type === 'emotion' || asset.type === 'x-risu-asset')
  const selectedAssets = [
    ...emotionAssets.slice(0, 63),
    ...(mainIcon ? [mainIcon] : []),
  ].slice(0, 64)
  const selectedSet = new Set(selectedAssets)
  let skipped = data.assetsHadUnsupportedEntries
    || declaredAssets.some((asset) => asset.type === 'x-risu-asset')
    || declaredAssets.some((asset) => !selectedSet.has(asset))
    || emotionAssets.length > 63
  const resolvedCache = new Map<string, Promise<File | null>>()

  const resolve = (asset: CharacterCardAsset): Promise<File | null> => {
    const key = `${asset.uri}\0${asset.ext}`
    const cached = resolvedCache.get(key)
    if (cached) return cached
    const pending = asset.uri === 'ccdefault:'
      ? Promise.resolve(context.defaultImage ?? null)
      : context.resolveAsset
        ? context.resolveAsset(asset)
        : dataUrlAsset(asset)
    resolvedCache.set(key, pending)
    return pending
  }

  const addOutputFile = (
    source: File,
    stem: string,
    ext: string,
  ): File => {
    const outputExt = SUPPORTED_V3_IMAGE_EXTENSIONS.has(ext) ? ext : 'png'
    const outputName = uniqueAssetFileName(stem, outputExt, usedNames)
    const output = new File([source], outputName, {
      type: source.type || imageMimeFromExtension(outputExt),
    })
    files.push(output)
    return output
  }

  if (mainIcon) {
    const source = await resolve(mainIcon)
    if (source) {
      const sourceExt = mainIcon.uri === 'ccdefault:'
        ? mainIcon.ext
        : imageExtensionFromFile(source, mainIcon.ext)
      slotFiles.neutral_default = addOutputFile(source, 'neutral', sourceExt)
    } else {
      skipped = true
    }
  }

  for (let index = 0; index < emotionAssets.slice(0, 63).length; index++) {
    const asset = emotionAssets[index]!
    const source = await resolve(asset)
    if (!source) {
      skipped = true
      continue
    }
    const emotionKey = emotionAssetKey(asset, data, index)
    const slotId = SLOT_ID_BY_TAG[emotionKey]
    const sourceExt = imageExtensionFromFile(source, asset.ext)
    if (slotId && !slotFiles[slotId]) {
      slotFiles[slotId] = addOutputFile(source, PORTRAIT_SLOT_TAG[slotId], sourceExt)
      continue
    }
    const output = addOutputFile(source, `ccv3_${emotionKey}`, sourceExt)
    let entryId = `ccv3_${emotionKey}`
    let duplicate = 2
    while (extraEntries.some((entry) => entry.id === entryId)) {
      entryId = `ccv3_${emotionKey}_${duplicate++}`
    }
    extraEntries.push({
      id: entryId,
      path: `assets/images/${output.name}`,
      desc: `Character Card V3 情绪资源：${asset.name}`,
      tags: [emotionKey],
      kind: 'image',
      cluster: emotionKey,
      file: output,
    })
  }

  return { slotFiles, extraEntries, files, skipped }
}

async function conversionFromParsed(
  parsed: ParsedCharacterCard,
  file: File,
  context: CharacterCardImportContext,
): Promise<CharacterCardConversion> {
  const data = parsed.data
  const roleId = normalizeRoleId(data.name)
  const knowledgeMarkdownFiles = buildKnowledgeFiles(data)
  const manifestForm = defaultSimpleManifestForm()
  manifestForm.id = roleId
  manifestForm.name = data.name
  manifestForm.version = validSemverOrDefault(data.character_version)
  manifestForm.author = data.creator
  manifestForm.description = data.description.split('\n').find((line) => line.trim())?.trim() || `${data.name}（由角色卡转换）`
  manifestForm.scenesCsv = 'default'
  manifestForm.knowledgeEnabled = knowledgeMarkdownFiles.length > 0
  manifestForm.creatorMessageToDownloader = data.creator_notes
    ? truncateChars(data.creator_notes.replace(/\s+/g, ' ').trim(), 160)
    : ''
  const manifestJson = applySimpleManifestToJson(DEFAULT_MANIFEST_JSON, manifestForm)

  const settingsForm = defaultSimpleSettingsForm()
  const settingsJson = applySimpleSettingsToJson('{}', settingsForm, {
    enabled: knowledgeMarkdownFiles.length > 0,
    glob: 'knowledge/**/*.md',
  })

  const macroName = cardMacroName(data)
  const normalizedScenario = normalizeCardMacros(data.scenario, macroName)
  const normalizedFirstMessage = normalizeCardMacros(data.first_mes, macroName)
  const normalizedAlternates = data.alternate_greetings.map((item) => normalizeCardMacros(item, macroName))
  const systemPromptMarkdown = buildExternalPromptReference(data)
  const sourceJson = new File(
    [`${JSON.stringify(parsed.original, null, 2)}\n`],
    'original_character_card.json',
    { type: 'application/json' },
  )
  const portraits = await convertPortraitAssets(parsed, file, context)
  const portraitCatalogJson = portraits.files.length
    ? buildPortraitCatalogJson(portraits.slotFiles, portraits.extraEntries)
    : ''

  const sourceFormat: CharacterCardSourceFormat = parsed.version === 3
    ? context.container === 'charx'
      ? 'v3-charx'
      : context.container === 'apng'
        ? 'v3-apng'
        : context.container === 'png'
          ? 'v3-png'
          : 'v3-json'
    : `${parsed.version === 2 ? 'v2' : 'v1'}-${context.container === 'json' ? 'json' : 'png'}` as CharacterCardSourceFormat

  const converted: CharacterCardReportCode[] = ['identity', 'persona']
  if (normalizedScenario) converted.push('scene')
  if (normalizedFirstMessage || normalizedAlternates.length) converted.push('greetings')
  if (data.mes_example) converted.push('dialogueExamples')
  if (knowledgeMarkdownFiles.length) converted.push('lorebook')
  if (portraits.files.length) converted.push('portrait')
  if (
    data.creator
    || data.creator_notes
    || Object.keys(data.creator_notes_multilingual).length
    || data.tags.length
    || data.character_version
    || data.source.length
    || data.creation_date != null
    || data.modification_date != null
  ) {
    converted.push('creatorMetadata')
  }
  const review: CharacterCardReportCode[] = ['languageAndAdultDeferred']
  if (systemPromptMarkdown) review.push('externalPromptsReference')
  if (Object.keys(data.extensions).length) review.push('privateExtensionsReference')
  if (portraits.skipped) review.push('v3AssetsReference')
  if (data.group_only_greetings.length) review.push('groupGreetingsReference')
  if (hasAdvancedLorebookSemantics(data)) review.push('advancedLorebookReference')
  if (parsed.version === 3 && Number.parseFloat(parsed.specVersion) > 3) {
    review.push('futureVersionReference')
  }

  const preservedFiles = [{
    relPath: 'imports/original_character_card.json',
    file: sourceJson,
  }]
  if (parsed.version === 3 && context.container !== 'json') {
    const extension = context.container === 'charx'
      ? 'charx'
      : context.container === 'apng'
        ? 'apng'
        : 'png'
    preservedFiles.push({
      relPath: `imports/original_character_card.${extension}`,
      file,
    })
  }

  return {
    input: {
      roleId,
      manifestJson,
      settingsJson,
      corePersonality: buildCorePersonality(data),
      worldviewMarkdown: '',
      knowledgeMarkdownFiles,
      emotionImageFiles: portraits.files,
      portraitCatalogJson,
      configJson: buildSimpleConfigJson(portraits.files.length > 0, { enabled: false, backend: 'image' }),
      adultExtensionJson: '',
      creatorMessage: '',
      authorJson: buildAuthorJson(data, sourceFormat),
      systemPromptMarkdown,
      preservedFiles,
      sceneEditorEntries: [{
        sceneId: 'default',
        displayName: '默认场景',
        activitySetting: '',
        scenePrompt: normalizedScenario,
        welcomeMessage: normalizedFirstMessage,
        monologues: normalizedAlternates,
      }],
    },
    report: {
      sourceFileName: file.name,
      sourceFormat,
      roleId,
      converted,
      review,
    },
  }
}

export async function importCharacterCard(file: File): Promise<CharacterCardConversion> {
  if (file.size > MAX_CHARACTER_CARD_BYTES) {
    throw new Error('角色卡文件超过 50 MB，已拒绝读取。')
  }
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.charx')) {
    const { parsed, context } = await importCharacterCardFromCharx(file)
    return conversionFromParsed(parsed, file, context)
  }

  const isApng = lower.endsWith('.apng') || file.type === 'image/apng'
  const isPng = isApng || lower.endsWith('.png') || file.type === 'image/png'
  if (isPng) {
    const extracted = await extractCharacterCardFromPng(file)
    const detected = parseCharacterCardJson(extracted.value)
    const parsed: ParsedCharacterCard = extracted.legacyFlatV1
      ? { ...detected, version: 1, specVersion: '1.0' }
      : detected
    return conversionFromParsed(parsed, file, {
      container: isApng ? 'apng' : 'png',
      defaultImage: file,
      resolveAsset: dataUrlAsset,
    })
  }

  let value: unknown
  try {
    value = JSON.parse(await file.text()) as unknown
  } catch {
    throw new Error('角色卡 JSON 无法解析。')
  }
  return conversionFromParsed(parseCharacterCardJson(value), file, {
    container: 'json',
    resolveAsset: dataUrlAsset,
  })
}
