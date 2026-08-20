/**
 * On disk, `OCLIVE_ROLES_DIR` points at the **roles root** (the folder whose children are `role_id/`).
 * Blueprint layout: `{roleId}/pipeline.ocblueprint` (v2 or Stable v4), …
 */

import { PIPELINE_BLUEPRINT_FILENAME } from './blueprintV2'

export function mergedSceneIds(manifestScenes: string[] | undefined, extraFromDirs: string[]): string[] {
  const set = new Set<string>()
  for (const s of manifestScenes ?? []) {
    if (s.trim()) set.add(s.trim())
  }
  for (const s of extraFromDirs) {
    if (s.trim()) set.add(s.trim())
  }
  return [...set]
}

/** Paths relative to the roles root (what `OCLIVE_ROLES_DIR` should point to). */
export function rolePackRelativePaths(roleId: string, sceneIds: string[]): string[] {
  const base = roleId.trim()
  const paths: string[] = [
    `${base}/${PIPELINE_BLUEPRINT_FILENAME}`,
    `${base}/knowledge/.oclive_placeholder.txt`,
  ]
  for (const sid of sceneIds) {
    paths.push(`${base}/scenes/${sid}/scene.json`, `${base}/scenes/${sid}/description.txt`)
  }
  return paths
}
