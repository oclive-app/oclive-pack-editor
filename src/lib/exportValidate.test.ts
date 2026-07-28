import { describe, expect, it } from 'vitest'
import { appendAssetPlaceholdersForValidate } from './exportValidate'
import { validateExportPackDirectory } from './exportValidate'
import { buildRolePackFiles } from './exportPack'
import { DEFAULT_MANIFEST_JSON, DEFAULT_SETTINGS_JSON } from '../defaults'

describe('exportValidate', () => {
  it('appendAssetPlaceholdersForValidate writes catalog and live2d paths', () => {
    const manifest = JSON.parse(DEFAULT_MANIFEST_JSON) as Record<string, unknown>
    const settings = JSON.parse(DEFAULT_SETTINGS_JSON) as Record<string, unknown>
    const catalog = JSON.stringify({
      schema_version: 1,
      assets: [
        { id: 'happy_default', path: 'assets/images/happy.webp', tags: ['happy'], kind: 'image' },
        { id: 'l2d', path: 'assets/live2d/m.model3.json', tags: [], kind: 'live2d' },
      ],
    })
    const config = JSON.stringify({
      portrait_catalog: { enabled: true },
      visual_presentation: {
        enabled: true,
        backend: 'live2d',
        resources: { live2d_model: 'assets/live2d/stage.model3.json' },
      },
    })
    const base = buildRolePackFiles('demo', manifest, settings, {
      portraitCatalogJson: catalog,
      configJson: config,
      emotionImages: [new File(['x'], 'happy.webp')],
      catalogAssets: [
        { relPath: 'assets/images/happy.webp', file: new File(['x'], 'happy.webp') },
        {
          relPath: 'assets/live2d/m.model3.json',
          file: new File(['{}'], 'm.model3.json', { type: 'application/json' }),
        },
      ],
    })
    const out = appendAssetPlaceholdersForValidate(base, 'demo', {
      portraitCatalogJson: catalog,
      configJson: config,
      catalogAssets: [
        { relPath: 'assets/images/happy.webp', file: new File(['x'], 'happy.webp') },
      ],
    })
    expect(out.has('demo/assets/images/happy.webp')).toBe(true)
    expect(out.has('demo/assets/live2d/m.model3.json')).toBe(true)
    expect(out.has('demo/assets/live2d/stage.model3.json')).toBe(true)
  })

  it('browser fallback rejects an include whose satellite file is absent', async () => {
    const manifest = JSON.parse(DEFAULT_MANIFEST_JSON) as Record<string, unknown>
    const settings = JSON.parse(DEFAULT_SETTINGS_JSON) as Record<string, unknown>
    const result = await validateExportPackDirectory('demo', manifest, settings, {
      preservedBlueprintFields: {
        includes: [
          {
            path: 'blueprint/includes/personality.json',
            target: 'meta.personality',
            mode: 'replace',
          },
        ],
      },
    })
    expect(result.ok).toBe(false)
    expect(result.errors.some((error) => error.includes('未包含在导出结果中'))).toBe(true)
  })

  it('browser fallback rejects malformed and contract-invalid merged includes', async () => {
    const manifest = JSON.parse(DEFAULT_MANIFEST_JSON) as Record<string, unknown>
    const settings = JSON.parse(DEFAULT_SETTINGS_JSON) as Record<string, unknown>
    const include = {
      path: 'blueprint/includes/backend.json',
      target: 'slot_registry.llm.backend',
      mode: 'replace' as const,
    }

    const malformed = await validateExportPackDirectory('demo', manifest, settings, {
      preservedBlueprintFields: { includes: [include] },
      preservedFiles: [
        {
          relPath: include.path,
          file: new File(['{'], 'backend.json', { type: 'application/json' }),
        },
      ],
    })
    expect(malformed.ok).toBe(false)
    expect(malformed.errors.some((error) => error.includes('JSON 解析失败'))).toBe(true)

    const invalidMerged = await validateExportPackDirectory('demo', manifest, settings, {
      preservedBlueprintFields: { includes: [include] },
      preservedFiles: [
        {
          relPath: include.path,
          file: new File(['"openai_compatible"'], 'backend.json', { type: 'application/json' }),
        },
      ],
    })
    expect(invalidMerged.ok).toBe(false)
    expect(invalidMerged.errors.some((error) => error.includes('openai_compatible'))).toBe(true)
  })

  it('browser fallback validates v4 extension payload presence and JSON', async () => {
    const manifest = JSON.parse(DEFAULT_MANIFEST_JSON) as Record<string, unknown>
    const settings = JSON.parse(DEFAULT_SETTINGS_JSON) as Record<string, unknown>
    const extensionId = 'com.example.live2d'
    const configRef = `blueprint/extensions/${extensionId}/config.json`
    const preservedBlueprintFields = {
      schema_version: 4,
      extensions: {
        [extensionId]: {
          capability: extensionId,
          config_schema_version: 1,
          config_ref: configRef,
        },
      },
    }

    const missing = await validateExportPackDirectory('demo', manifest, settings, {
      preservedBlueprintFields,
    })
    expect(missing.ok).toBe(false)
    expect(missing.errors.some((error) => error.includes('config_ref'))).toBe(true)

    const malformed = await validateExportPackDirectory('demo', manifest, settings, {
      preservedBlueprintFields,
      preservedFiles: [
        {
          relPath: configRef,
          file: new File(['{'], 'config.json', { type: 'application/json' }),
        },
      ],
    })
    expect(malformed.ok).toBe(false)
    expect(malformed.errors.some((error) => error.includes('JSON 解析失败'))).toBe(true)

    const valid = await validateExportPackDirectory('demo', manifest, settings, {
      preservedBlueprintFields,
      preservedFiles: [
        {
          relPath: configRef,
          file: new File(['{"opaque":true}'], 'config.json', {
            type: 'application/json',
          }),
        },
      ],
    })
    expect(valid.ok).toBe(true)
  })
})
