import { describe, expect, it } from 'vitest'
import {
  buildSceneDescription,
  buildSceneJson,
  mergeSceneEntriesForIds,
  parseSceneFromDisk,
  parseTimeWindowsFromActivity,
} from './scenePackUser'

describe('scenePackUser', () => {
  it('parses time windows from activity text', () => {
    const windows = parseTimeWindowsFromActivity('平日 08:00-17:00 在学校，18:00 到 22:00 在家')
    expect(windows).toEqual([
      { start: '08:00', end: '17:00' },
      { start: '18:00', end: '22:00' },
    ])
  })

  it('exports scene.json with activity_setting and time_windows', () => {
    const json = buildSceneJson({
      sceneId: 'home',
      displayName: '家',
      activitySetting: '傍晚 18:00-23:00 在家休息',
      scenePrompt: '',
    })
    const parsed = JSON.parse(json) as {
      name: string
      activity_setting: string
      time_windows: Array<{ start: string; end: string }>
    }
    expect(parsed.name).toBe('家')
    expect(parsed.activity_setting).toContain('18:00')
    expect(parsed.time_windows[0]).toEqual({ start: '18:00', end: '23:00' })
  })

  it('roundtrips scene files from disk', () => {
    const json = buildSceneJson({
      sceneId: 'school',
      displayName: '学校',
      activitySetting: '08:00-16:00 上课',
      scenePrompt: '',
      welcomeMessage: '早上好。',
      monologues: ['今天也要加油。', '先坐下来吧。'],
    })
    const entry = parseSceneFromDisk('school', json, '在此场景语气更正式。\n')
    expect(entry.displayName).toBe('学校')
    expect(entry.activitySetting).toContain('08:00')
    expect(entry.scenePrompt).toBe('在此场景语气更正式。')
    expect(entry.welcomeMessage).toBe('早上好。')
    expect(entry.monologues).toEqual(['今天也要加油。', '先坐下来吧。'])
  })

  it('builds description from scene prompt only', () => {
    expect(buildSceneDescription({
      sceneId: 'x',
      displayName: 'x',
      activitySetting: '08:00-09:00',
      scenePrompt: '特别说明',
    })).toBe('特别说明\n')
  })

  it('merges entries when manifest scene list changes', () => {
    const merged = mergeSceneEntriesForIds(
      ['home', 'cafe'],
      [{ sceneId: 'home', displayName: '家', activitySetting: 'a', scenePrompt: 'p' }],
    )
    expect(merged).toHaveLength(2)
    expect(merged[0]?.activitySetting).toBe('a')
    expect(merged[1]?.sceneId).toBe('cafe')
  })
})
