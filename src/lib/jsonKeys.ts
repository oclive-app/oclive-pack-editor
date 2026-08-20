/**
 * 与 `oclivenewnew/kernel/crates/oclive_validation/src/json_keys.rs` 顶层键白名单保持一致。
 */

const MANIFEST_KEYS = new Set([
  'id',
  'name',
  'version',
  'author',
  'description',
  'ollama_model',
  'model',
  'default_personality',
  'evolution',
  'scenes',
  'user_relations',
  'default_relation',
  'memory_config',
  'identity_binding',
  'life_trajectory',
  'life_schedule',
  'dev_only',
  'knowledge',
  'min_runtime_version',
  'creator_message_to_downloader',
])

const SETTINGS_KEYS = new Set([
  'schema_version',
  'identity_binding',
  'evolution',
  'memory_config',
  'ollama_model',
  'model',
  'remote_presence',
  'autonomous_scene',
  'interaction_mode',
  'plugin_backends',
  'knowledge',
  'reply_quality_anchor',
])

function msg(label: string, key: string): string {
  return `${label}：存在未识别的顶层键「${key}」。仅允许契约中的字段名，或以「_」开头的说明键（见 oclivenewnew roles/README_MANIFEST.md）。`
}

export function validateManifestTopLevelKeys(manifest: Record<string, unknown>): string[] {
  const errors: string[] = []
  for (const key of Object.keys(manifest)) {
    if (key.startsWith('_')) continue
    if (!MANIFEST_KEYS.has(key)) errors.push(msg('manifest.json', key))
  }
  return errors
}

export function validateSettingsTopLevelKeys(settings: Record<string, unknown>): string[] {
  const errors: string[] = []
  for (const key of Object.keys(settings)) {
    if (key.startsWith('_')) continue
    // 编写器内部把 Stable v4 runtime_config 拆成 settings 形状编辑；该键
    // 导出时回到 pipeline.ocblueprint，不属于 legacy settings.json 白名单。
    if (key === 'inference_profile') continue
    if (!SETTINGS_KEYS.has(key)) errors.push(msg('settings.json', key))
  }
  return errors
}
