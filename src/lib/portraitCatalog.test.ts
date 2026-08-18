import { describe, expect, it } from 'vitest'

import {

  applyExportProfile,

  buildPortraitCatalogJson,

  buildSimpleConfigJson,

  collectCatalogBinaryAssets,

  mergeManagedConfigJson,

  parseConfigJson,

  parsePortraitCatalogJson,

  PORTRAIT_SLOT_TAG,

  SIMPLE_PORTRAIT_SLOT_IDS,

  validatePortraitCatalogState,

} from './portraitCatalog'



describe('portraitCatalog', () => {

  it('builds B1 catalog with seven slot ids', () => {

    const slotFiles = Object.fromEntries(

      SIMPLE_PORTRAIT_SLOT_IDS.map((id) => [

        id,

        new File(['x'], `${PORTRAIT_SLOT_TAG[id]}.webp`, { type: 'image/webp' }),

      ]),

    )

    const raw = buildPortraitCatalogJson(slotFiles)

    const parsed = JSON.parse(raw) as { assets: Array<{ id: string }> }

    expect(parsed.assets).toHaveLength(7)

    for (const id of SIMPLE_PORTRAIT_SLOT_IDS) {

      expect(parsed.assets.some((a) => a.id === id)).toBe(true)

    }

  })



  it('includes extra entries beyond seven slots', () => {

    const slotFiles = {

      happy_default: new File(['x'], 'happy.webp', { type: 'image/webp' }),

    }

    const extras = [

      {

        id: 'happy_alt',

        path: 'assets/images/happy_alt.webp',

        desc: 'alt happy',

        tags: ['happy'],

        kind: 'image' as const,

        cluster: 'happy',

      },

    ]

    const parsed = JSON.parse(buildPortraitCatalogJson(slotFiles, extras)) as {

      assets: Array<{ id: string; cluster?: string }>

    }

    expect(parsed.assets).toHaveLength(2)

    expect(parsed.assets.find((a) => a.id === 'happy_alt')?.cluster).toBe('happy')

  })



  it('config enables portrait_catalog when exporting catalog', () => {

    const cfg = JSON.parse(buildSimpleConfigJson(true)) as {

      portrait_catalog: { enabled: boolean }

    }

    expect(cfg.portrait_catalog.enabled).toBe(true)

  })



  it('config includes live2d resources when provided', () => {

    const cfg = JSON.parse(

      buildSimpleConfigJson(true, {

        enabled: true,

        backend: 'live2d',

        live2dModel: 'assets/live2d/model.model3.json',

      }),

    ) as { visual_presentation: { resources: { live2d_model: string } } }

    expect(cfg.visual_presentation.resources.live2d_model).toContain('model3')

  })



  it('parsePortraitCatalogJson roundtrips slots and extras', () => {

    const raw = buildPortraitCatalogJson(

      { happy_default: new File([], 'happy.png') },

      [

        {

          id: 'wink',

          path: 'assets/images/wink.png',

          desc: 'wink',

          tags: ['happy'],

          kind: 'image',

        },

      ],

    )

    const parsed = parsePortraitCatalogJson(raw)

    expect(parsed.slotFiles.happy_default?.name).toBe('happy.png')

    expect(parsed.extraEntries).toHaveLength(1)

    expect(parsed.extraEntries[0]?.id).toBe('wink')

  })



  it('parseConfigJson reads visual_presentation', () => {

    const cfg = parseConfigJson(

      JSON.stringify({

        portrait_catalog: { enabled: true },

        visual_presentation: {

          enabled: true,

          backend: 'live2d',

          resources: { live2d_model: 'm.model3.json' },

        },

      }),

    )

    expect(cfg.portraitEnabled).toBe(true)

    expect(cfg.visual.backend).toBe('live2d')

    expect(cfg.visual.live2dModel).toBe('m.model3.json')

  })

  it('mergeManagedConfigJson preserves unknown facilities', () => {
    const merged = JSON.parse(mergeManagedConfigJson(JSON.stringify({
      chat_storage: { backend: 'hybrid', future: true },
      portrait_catalog: { future_portrait: 'keep' },
      future_facility: { enabled: true },
    }), true, { enabled: false, backend: 'image' }))
    expect(merged.chat_storage).toEqual({ backend: 'hybrid', future: true })
    expect(merged.portrait_catalog).toEqual({ future_portrait: 'keep', enabled: true })
    expect(merged.future_facility).toEqual({ enabled: true })
  })



  it('collectCatalogBinaryAssets uses catalog path for live2d', () => {
    const assets = collectCatalogBinaryAssets(
      {},
      [
        {
          id: 'l2d',
          path: 'assets/live2d/m.model3.json',
          desc: '',
          tags: [],
          kind: 'live2d',
          file: new File(['{}'], 'm.model3.json', { type: 'application/json' }),
        },
      ],
    )
    expect(assets[0]?.relPath).toBe('assets/live2d/m.model3.json')
  })

  it('validatePortraitCatalogState flags duplicate ids', () => {

    const issues = validatePortraitCatalogState(

      {},

      [

        { id: 'a', path: 'assets/images/a.png', desc: '', tags: [], kind: 'image' },

        { id: 'a', path: 'assets/images/b.png', desc: '', tags: [], kind: 'image' },

      ],

      false,

    )

    expect(issues.some((i) => i.level === 'error' && i.message.includes('重复'))).toBe(true)

  })



  it('validatePortraitCatalogState ignores extra entries without path (draft)', () => {
    const issues = validatePortraitCatalogState(
      {},
      [{ id: 'neutral_mild', path: '', desc: '平静，轻微程度', tags: ['neutral'], kind: 'image' }],
      true,
    )
    expect(issues.some((i) => i.message.includes('缺少 path'))).toBe(false)
  })



  it('applyExportProfile vscode-lite strips extras and disables VP', () => {

    const out = applyExportProfile(

      'vscode-lite',

      true,

      { enabled: true, backend: 'live2d' },

      { happy_default: new File([], 'happy.png') },

      [{ id: 'x', path: 'assets/images/x.png', desc: '', tags: [], kind: 'image' }],

    )

    expect(out.visual.enabled).toBe(false)

    expect(out.extraEntries).toHaveLength(0)

  })

})

