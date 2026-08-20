import JSZip from 'jszip'

export const TEST_PNG_SIGNATURE: Uint8Array<ArrayBuffer> = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10,
])

function u32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]
}

export function pngChunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([
    ...u32(data.length),
    ...Array.from(type, (char) => char.charCodeAt(0)),
    ...data,
    0, 0, 0, 0,
  ])
}

function base64Json(value: unknown): string {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of jsonBytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function embeddedPayload(
  key: 'chara' | 'ccv3',
  value: unknown,
  encoding: 'base64' | 'base64url' | 'json' = 'base64',
): Uint8Array<ArrayBuffer> {
  const encoded = encoding === 'json'
    ? JSON.stringify(value)
    : encoding === 'base64url'
      ? base64Json(value).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
      : base64Json(value)
  return new TextEncoder().encode(`${key}\0${encoded}`)
}

function internationalTextPayload(
  key: 'chara' | 'ccv3',
  value: unknown,
  encoding: 'base64' | 'base64url' | 'json',
): Uint8Array<ArrayBuffer> {
  const payload = embeddedPayload(key, value, encoding)
  const firstNull = payload.indexOf(0)
  return Uint8Array.from([
    ...payload.slice(0, firstNull + 1),
    0, // uncompressed
    0, // compression method
    0, // empty language tag
    0, // empty translated keyword
    ...payload.slice(firstNull + 1),
  ])
}

export function pngCard(
  value: unknown,
  key: 'chara' | 'ccv3' = 'chara',
  options: {
    name?: string
    type?: 'image/png' | 'image/apng'
    encoding?: 'base64' | 'base64url' | 'json'
    chunkType?: 'tEXt' | 'iTXt'
  } = {},
): File {
  const encoding = options.encoding ?? 'base64'
  const chunkType = options.chunkType ?? 'tEXt'
  const payload = chunkType === 'iTXt'
    ? internationalTextPayload(key, value, encoding)
    : embeddedPayload(key, value, encoding)
  return new File([
    TEST_PNG_SIGNATURE,
    pngChunk(chunkType, payload),
    pngChunk('IEND', new Uint8Array()),
  ], options.name ?? 'card.png', { type: options.type ?? 'image/png' })
}

export function legacyFieldPng(
  fields: Record<string, string>,
  name = 'legacy-fields.png',
): File {
  const fieldChunks = Object.entries(fields).map(([key, value]) => pngChunk(
    'tEXt',
    new TextEncoder().encode(`${key}\0${value}`),
  ))
  return new File([
    TEST_PNG_SIGNATURE,
    ...fieldChunks,
    pngChunk('IEND', new Uint8Array()),
  ], name, { type: 'image/png' })
}

export async function zipFile(zip: JSZip, name = 'card.charx'): Promise<File> {
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes as BlobPart], name, { type: 'application/zip' })
}

export async function charxCard(
  value: unknown,
  configure?: (zip: JSZip) => void,
  name = 'card.charx',
): Promise<File> {
  const zip = new JSZip()
  zip.file('card.json', JSON.stringify(value))
  configure?.(zip)
  return zipFile(zip, name)
}

export function jsonCard(value: unknown, name = 'card.json'): File {
  return new File([JSON.stringify(value)], name, { type: 'application/json' })
}

export function v1Card(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Fixture One',
    description: '{{char}} is a neutral test character.',
    personality: 'Calm and precise.',
    scenario: '{{char}} meets {{user}} in a test room.',
    first_mes: 'Hello, {{user}}.',
    mes_example: '{{char}}: This is a fixture.',
    ...overrides,
  }
}

export function v2Card(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      ...v1Card({ name: 'Fixture Two' }),
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: ['Welcome back, {{user}}.'],
      character_book: undefined,
      tags: ['fixture'],
      creator: 'OCLive test suite',
      character_version: '1.0.0',
      extensions: {},
      ...overrides,
    },
  }
}

export function v3Card(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      ...(v2Card().data as Record<string, unknown>),
      name: 'Fixture Three',
      nickname: 'Three',
      creator_notes_multilingual: {},
      source: [],
      group_only_greetings: [],
      assets: [],
      creation_date: 0,
      modification_date: 0,
      ...overrides,
    },
  }
}
