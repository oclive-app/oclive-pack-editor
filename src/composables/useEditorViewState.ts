import { ref, watch } from 'vue'

export type EditorViewId = 'start' | 'simple' | 'advanced' | 'adult'

export function useEditorViewState(onBeforeSwitch?: (id: EditorViewId) => void) {
  const editorView = ref<EditorViewId>('start')
  const mountedViews = ref<EditorViewId[]>(['start'])

  watch(editorView, (view) => {
    if (!mountedViews.value.includes(view)) {
      mountedViews.value = [...mountedViews.value, view]
    }
    onBeforeSwitch?.(view)
  })

  function shouldMountView(id: EditorViewId): boolean {
    return mountedViews.value.includes(id)
  }

  return {
    editorView,
    shouldMountView,
  }
}
