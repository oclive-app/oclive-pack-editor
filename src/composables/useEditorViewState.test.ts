import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useEditorViewState } from './useEditorViewState'

describe('useEditorViewState (T07 settings tier / view routing)', () => {
  it('starts on start view', () => {
    const { editorView } = useEditorViewState()
    expect(editorView.value).toBe('start')
  })

  it('lazy-mounts views after first visit', async () => {
    const { editorView, shouldMountView } = useEditorViewState()
    expect(shouldMountView('advanced')).toBe(false)
    editorView.value = 'advanced'
    await nextTick()
    expect(shouldMountView('advanced')).toBe(true)
    expect(shouldMountView('simple')).toBe(false)
    expect(shouldMountView('adult')).toBe(false)
    editorView.value = 'adult'
    await nextTick()
    expect(shouldMountView('adult')).toBe(true)
  })

  it('calls beforeSwitch hook when view changes', async () => {
    const seen: string[] = []
    const { editorView } = useEditorViewState((id) => {
      seen.push(id)
    })
    editorView.value = 'simple'
    await nextTick()
    editorView.value = 'advanced'
    await nextTick()
    expect(seen).toEqual(['simple', 'advanced'])
  })
})
