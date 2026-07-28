import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { minimalBlueprintJsonForRole } from './blueprintV2'
import { PIPELINE_BLUEPRINT_FILENAME } from './blueprintV2'
import { importedPackBrainHint, importRolePackFromZip, isSafePathUnderRole } from './importPack'

async function zipToFile(zip: JSZip, name: string): Promise<File> {
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], name, { type: 'application/zip' })
}

describe('isSafePathUnderRole', () => {
  it('accepts normal files under role', () => {
    expect(isSafePathUnderRole(`myrole/${PIPELINE_BLUEPRINT_FILENAME}`, 'myrole')).toBe(true)
    expect(isSafePathUnderRole('myrole/assets/images/a.png', 'myrole')).toBe(true)
  })

  it('rejects parent segments', () => {
    expect(isSafePathUnderRole('myrole/assets/images/../../../x.png', 'myrole')).toBe(false)
    expect(isSafePathUnderRole('myrole/../manifest.json', 'myrole')).toBe(false)
  })

  it('rejects escape from role prefix', () => {
    expect(isSafePathUnderRole('otherrole/manifest.json', 'myrole')).toBe(false)
  })
})

describe('importedPackBrainHint', () => {
  it('mentions launcher when llm is remote', () => {
    const j = JSON.stringify({ plugin_backends: { llm: 'remote' } })
    expect(importedPackBrainHint(j)).toContain('oclive-launcher')
  })

  it('suggests simple creation when not remote', () => {
    const j = JSON.stringify({ plugin_backends: { llm: 'ollama' } })
    expect(importedPackBrainHint(j)).toContain('简单创作')
  })
})

describe('importRolePackFromZip', () => {
  it('imports minimal valid Stable v4 pack', async () => {
    const z = new JSZip()
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, minimalBlueprintJsonForRole('hero'))
    z.file('hero/core_personality.txt', 'hello')
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.roleId).toBe('hero')
    expect(r.manifestJson).toContain('hero')
    expect(r.corePersonality).toContain('hello')
    expect(r.emotionImageFiles).toHaveLength(0)
    expect(r.creatorMessage).toBe('')
    expect(r.preservedBlueprintFields?.schema_version).toBe(4)
  })

  it('rejects legacy manifest-only zip', async () => {
    const z = new JSZip()
    z.file('hero/manifest.json', '{"id":"hero","name":"H"}\n')
    z.file('hero/settings.json', '{"schema_version":1}\n')
    const f = await zipToFile(z, 'p.zip')
    await expect(importRolePackFromZip(f)).rejects.toThrow(/legacy/)
  })

  it('reads creator_message.txt preserving content', async () => {
    const z = new JSZip()
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, minimalBlueprintJsonForRole('hero'))
    z.file('hero/core_personality.txt', 'x')
    z.file('hero/creator_message.txt', 'stay brave\n')
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.creatorMessage).toBe('stay brave')
  })

  it('reads creator_message.txt multiple lines', async () => {
    const z = new JSZip()
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, minimalBlueprintJsonForRole('hero'))
    z.file('hero/core_personality.txt', 'x')
    z.file('hero/creator_message.txt', 'a\nb\n')
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.creatorMessage).toBe('a\nb')
  })

  it('imports memory seed and user identity templates without mixing them', async () => {
    const z = new JSZip()
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, minimalBlueprintJsonForRole('hero'))
    z.file('hero/core_personality.txt', 'persona')
    z.file('hero/memory_seed.json', '{"schema_version":1,"memories":[]}\n')
    z.file('hero/user_identities/friend.md', '# Friend\n')
    z.file('hero/user_identities/learner.md', '# Learner\n')
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.corePersonality).toBe('persona')
    expect(r.memorySeedJson).toContain('"memories"')
    expect(r.userIdentityFiles).toEqual([
      { path: 'user_identities/friend.md', content: '# Friend\n' },
      { path: 'user_identities/learner.md', content: '# Learner\n' },
    ])
  })

  it('preserves safe extension files and blueprint fields for re-export', async () => {
    const z = new JSZip()
    const blueprint = JSON.parse(minimalBlueprintJsonForRole('hero'))
    blueprint.includes = [
      {
        path: 'blueprint/includes/personality.json',
        target: 'meta.personality',
        mode: 'replace',
      },
    ]
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, JSON.stringify(blueprint))
    z.file('hero/core_personality.txt', 'persona')
    z.file('hero/voice_profile.json', '{"schema_version":1}')
    z.file('hero/blueprint/includes/personality.json', '{"warmth":0.8}')
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.preservedBlueprintFields?.includes).toEqual(blueprint.includes)
    expect(r.preservedFiles?.map((x) => x.relPath)).toEqual([
      'voice_profile.json',
      'blueprint/includes/personality.json',
    ])
  })

  it('preserves an imported v2 schema version without upgrading it', async () => {
    const z = new JSZip()
    const blueprint = JSON.parse(minimalBlueprintJsonForRole('hero'))
    blueprint.schema_version = 2
    delete blueprint.runtime_config
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, JSON.stringify(blueprint))
    const result = await importRolePackFromZip(await zipToFile(z, 'v2.zip'))
    expect(result.preservedBlueprintFields?.schema_version).toBe(2)
  })

  it('preserves v4 extension declarations and payload files', async () => {
    const z = new JSZip()
    const extensionId = 'com.example.live2d'
    const configRef = `blueprint/extensions/${extensionId}/config.json`
    const blueprint = JSON.parse(minimalBlueprintJsonForRole('hero'))
    blueprint.extensions = {
      [extensionId]: {
        capability: extensionId,
        config_schema_version: 1,
        config_ref: configRef,
      },
    }
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, JSON.stringify(blueprint))
    z.file(`hero/${configRef}`, '{"opaque":true}')
    const result = await importRolePackFromZip(await zipToFile(z, 'v4.zip'))
    expect(
      (result.preservedBlueprintFields?.extensions as Record<string, unknown>)[extensionId],
    ).toBeDefined()
    expect(result.preservedFiles?.map((file) => file.relPath)).toContain(configRef)
  })

  it('loads emotion images under assets/images', async () => {
    const z = new JSZip()
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, minimalBlueprintJsonForRole('hero'))
    z.file('hero/core_personality.txt', 'x')
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    z.file('hero/assets/images/smile.png', png)
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.emotionImageFiles).toHaveLength(1)
    expect(r.emotionImageFiles[0]!.name).toBe('smile.png')
  })

  it('reads knowledge/world.md when present', async () => {
    const z = new JSZip()
    z.file(`r/${PIPELINE_BLUEPRINT_FILENAME}`, minimalBlueprintJsonForRole('r', 'R'))
    z.file('r/core_personality.txt', 'c')
    z.file('r/knowledge/world.md', '---\nid: w\n---\n\nbody')
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.worldviewMarkdown).toContain('body')
  })

  it('throws when blueprint missing', async () => {
    const z = new JSZip()
    z.file('a/readme.txt', 'x')
    const f = await zipToFile(z, 'p.zip')
    await expect(importRolePackFromZip(f)).rejects.toThrow(/未找到/)
  })

  it('throws when blueprint is empty', async () => {
    const z = new JSZip()
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, '   \n')
    z.file('hero/core_personality.txt', 'x')
    const f = await zipToFile(z, 'p.zip')
    await expect(importRolePackFromZip(f)).rejects.toThrow(/为空/)
  })

  it('skips zip-slip entries under assets/images', async () => {
    const z = new JSZip()
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, minimalBlueprintJsonForRole('hero'))
    z.file('hero/core_personality.txt', 'x')
    z.file('hero/assets/images/../../../evil.png', 'bad')
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.emotionImageFiles).toHaveLength(0)
  })

  it('skips nested paths masquerading as filename', async () => {
    const z = new JSZip()
    z.file(`hero/${PIPELINE_BLUEPRINT_FILENAME}`, minimalBlueprintJsonForRole('hero'))
    z.file('hero/core_personality.txt', 'x')
    z.file('hero/assets/images/sub/hack.png', 'bad')
    const f = await zipToFile(z, 'p.zip')
    const r = await importRolePackFromZip(f)
    expect(r.emotionImageFiles).toHaveLength(0)
  })
})
