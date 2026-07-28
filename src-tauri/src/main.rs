#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use oclive_validation::blueprint_migrate::build_blueprint_v2_from_legacy_dir;
use oclive_validation::blueprint_v2::{
    slot_registry_to_plugin_backends, validate_blueprint_v2_json_with_context,
    BlueprintV2ValidateContext, SlotRegistryEntry, PIPELINE_BLUEPRINT_FILENAME,
};
use oclive_validation::disk_role_settings::DiskRoleSettings;
use oclive_validation::manifest::DiskRoleManifest;
use oclive_validation::{merge_role_pack_scene_ids, validate_role_pack_blueprint_directory};
use serde::Deserialize;
use serde::Serialize;

#[derive(Deserialize)]
struct PackFileEntry {
    path: String,
    content: String,
}

#[derive(Deserialize, Serialize)]
struct BinaryFileEntry {
    path: String,
    base64: String,
}

/// Writes `{roles_root}/{path}` for each entry (same layout as `buildRolePackFiles` in the frontend).
#[tauri::command]
fn write_role_pack_files(roles_root: String, files: Vec<PackFileEntry>) -> Result<(), String> {
    use std::fs;
    use std::path::PathBuf;

    let root = PathBuf::from(&roles_root);
    if !root.is_dir() {
        return Err("所选路径不是目录".to_string());
    }

    for f in files {
        let rel = f.path.replace('\\', "/");
        let rel = rel.trim_start_matches('/');
        if rel.is_empty() {
            return Err("空相对路径".to_string());
        }
        for part in rel.split('/') {
            if part.is_empty() || part == "." || part == ".." {
                return Err(format!("非法相对路径：{}", f.path));
            }
        }
        let dest = root.join(rel);
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&dest, f.content.as_bytes()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 写入二进制文件（如 `assets/images/*.png`），`base64` 为标准编码内容。
#[tauri::command]
fn write_role_pack_binaries(roles_root: String, files: Vec<BinaryFileEntry>) -> Result<(), String> {
    use base64::Engine;
    use std::fs;
    use std::path::PathBuf;

    let root = PathBuf::from(&roles_root);
    if !root.is_dir() {
        return Err("所选路径不是目录".to_string());
    }

    for f in files {
        let rel = f.path.replace('\\', "/");
        let rel = rel.trim_start_matches('/');
        if rel.is_empty() {
            return Err("空相对路径".to_string());
        }
        for part in rel.split('/') {
            if part.is_empty() || part == "." || part == ".." {
                return Err(format!("非法相对路径：{}", f.path));
            }
        }
        let dest = root.join(rel);
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(f.base64.trim())
            .map_err(|e| format!("base64 解码失败：{}", e))?;
        fs::write(&dest, bytes).map_err(|e| e.to_string())?;
    }
    Ok(())
}

const REPLY_QUALITY_ANCHOR_REL: &str = "prompts/reply_quality_anchor.md";
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RolePackListEntry {
    role_id: String,
    display_name: String,
    abs_path: String,
    needs_migration: bool,
}

fn read_display_name_from_blueprint(path: &std::path::Path) -> Option<String> {
    use std::fs;
    let text = fs::read_to_string(path).ok()?;
    let bp: serde_json::Value = serde_json::from_str(&text).ok()?;
    bp.get("meta")?.get("name")?.as_str().map(str::to_string)
}

/// 扫描 roles 根下一级子目录，纳入含 v2 蓝图的角色包；legacy manifest 标记需迁移。
#[tauri::command]
fn list_role_packs_under_roles_root(roles_root: String) -> Result<Vec<RolePackListEntry>, String> {
    use std::fs;
    use std::path::PathBuf;

    let root = PathBuf::from(roles_root.trim());
    if !root.is_dir() {
        return Err("所选路径不是目录".into());
    }

    let mut out = Vec::new();
    for entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let role_id = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        if role_id.is_empty() || role_id.starts_with('.') {
            continue;
        }

        let blueprint_path = path.join(PIPELINE_BLUEPRINT_FILENAME);
        let manifest_path = path.join("manifest.json");

        if blueprint_path.is_file() {
            let display_name = read_display_name_from_blueprint(&blueprint_path)
                .unwrap_or_else(|| role_id.clone());
            out.push(RolePackListEntry {
                role_id,
                display_name,
                abs_path: path.to_string_lossy().to_string(),
                needs_migration: false,
            });
        } else if manifest_path.is_file() {
            out.push(RolePackListEntry {
                role_id: role_id.clone(),
                display_name: format!("{role_id} (需迁移)"),
                abs_path: path.to_string_lossy().to_string(),
                needs_migration: true,
            });
        }
    }
    out.sort_by(|a, b| a.role_id.cmp(&b.role_id));
    Ok(out)
}

/// 首次启动时猜测默认 roles 根（显式 OCLIVE_ROLES_DIR 优先）。
#[tauri::command]
fn guess_default_roles_root() -> Option<String> {
    use std::path::PathBuf;

    if let Ok(roles_root) = std::env::var("OCLIVE_ROLES_DIR") {
        let roles = PathBuf::from(roles_root.trim());
        if roles.is_dir() {
            return roles
                .canonicalize()
                .ok()
                .map(|p| p.to_string_lossy().to_string());
        }
    }
    if let Ok(monorepo) = std::env::var("OCLIVE_MONOREPO") {
        let roles = PathBuf::from(monorepo.trim())
            .join("distros")
            .join("chat-pro")
            .join("roles");
        if roles.is_dir() {
            return roles
                .canonicalize()
                .ok()
                .map(|p| p.to_string_lossy().to_string());
        }
    }
    let sibling = PathBuf::from("..")
        .join("oclivenewnew")
        .join("distros")
        .join("chat-pro")
        .join("roles");
    if sibling.is_dir() {
        return sibling
            .canonicalize()
            .ok()
            .map(|p| p.to_string_lossy().to_string());
    }
    None
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RolePackCatalogAsset {
    file_name: String,
    base64: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RolePackTextFile {
    path: String,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RolePackSceneFile {
    scene_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    scene_json_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description_text: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RolePackEditorLoad {
    blueprint_text: String,
    manifest_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    settings_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    config_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    adult_extension_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    portrait_catalog_text: Option<String>,
    catalog_assets: Vec<RolePackCatalogAsset>,
    preserved_files: Vec<BinaryFileEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    user_identities_index_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    memory_seed_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    core_personality_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    creator_message_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    ui_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    author_text: Option<String>,
    user_identity_files: Vec<RolePackTextFile>,
    merged_scene_ids: Vec<String>,
    scene_files: Vec<RolePackSceneFile>,
}

fn is_safe_role_relative_path(rel: &str) -> bool {
    let p = rel.trim().replace('\\', "/");
    if p.is_empty() || p.starts_with('/') {
        return false;
    }
    if p.contains("..") {
        return false;
    }
    for part in p.split('/') {
        if part.is_empty() || part == "." || part == ".." {
            return false;
        }
    }
    true
}

fn read_blueprint_referenced_files(
    root: &std::path::Path,
    blueprint: &serde_json::Value,
) -> Vec<BinaryFileEntry> {
    use base64::Engine;
    use std::collections::BTreeSet;

    let mut paths = BTreeSet::new();
    if let Some(includes) = blueprint.get("includes").and_then(|value| value.as_array()) {
        for include in includes {
            if let Some(path) = include.get("path").and_then(|value| value.as_str()) {
                paths.insert(path.to_string());
            }
        }
    }
    if let Some(extensions) = blueprint
        .get("extensions")
        .and_then(|value| value.as_object())
    {
        for declaration in extensions.values() {
            if let Some(path) = declaration
                .get("config_ref")
                .and_then(|value| value.as_str())
            {
                paths.insert(path.to_string());
            }
        }
    }

    let canonical_root = match root.canonicalize() {
        Ok(path) => path,
        Err(_) => return Vec::new(),
    };
    paths
        .into_iter()
        .filter(|path| is_safe_role_relative_path(path))
        .filter_map(|path| {
            let absolute = root.join(&path);
            if !absolute.is_file() {
                return None;
            }
            let canonical = absolute.canonicalize().ok()?;
            if !canonical.starts_with(&canonical_root) {
                return None;
            }
            let bytes = std::fs::read(canonical).ok()?;
            Some(BinaryFileEntry {
                path,
                base64: base64::engine::general_purpose::STANDARD.encode(bytes),
            })
        })
        .collect()
}

fn read_portrait_catalog_assets(
    root: &std::path::Path,
) -> (Option<String>, Vec<RolePackCatalogAsset>) {
    use base64::Engine;
    use std::collections::HashSet;
    use std::fs;

    let catalog_path = root.join("portrait_catalog.json");
    let catalog_text = catalog_path
        .is_file()
        .then(|| fs::read_to_string(&catalog_path).ok())
        .flatten();

    let mut rel_paths: Vec<String> = Vec::new();
    if let Some(ref text) = catalog_text {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(text) {
            if let Some(arr) = v.get("assets").and_then(|a| a.as_array()) {
                for item in arr {
                    if let Some(p) = item.get("path").and_then(|x| x.as_str()) {
                        let t = p.trim().to_string();
                        if is_safe_role_relative_path(&t) {
                            rel_paths.push(t);
                        }
                    }
                }
            }
        }
    } else {
        let images_dir = root.join("assets/images");
        if images_dir.is_dir() {
            if let Ok(entries) = fs::read_dir(&images_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_file() {
                        if let Some(name) = entry.file_name().to_str() {
                            rel_paths.push(format!("assets/images/{name}"));
                        }
                    }
                }
            }
        }
    }

    let mut seen = HashSet::new();
    let mut assets = Vec::new();
    for rel in rel_paths {
        if !seen.insert(rel.clone()) {
            continue;
        }
        let abs = root.join(&rel);
        if !abs.is_file() {
            continue;
        }
        let bytes = match fs::read(&abs) {
            Ok(b) => b,
            Err(_) => continue,
        };
        let file_name = rel.split('/').next_back().unwrap_or("asset").to_string();
        assets.push(RolePackCatalogAsset {
            file_name,
            base64: base64::engine::general_purpose::STANDARD.encode(bytes),
        });
    }

    (catalog_text, assets)
}

fn read_user_identity_files(root: &std::path::Path) -> Result<Vec<RolePackTextFile>, String> {
    let dir = root.join("user_identities");
    if !dir.is_dir() {
        return Ok(Vec::new());
    }
    let mut files = Vec::new();
    fn visit(
        base: &std::path::Path,
        current: &std::path::Path,
        files: &mut Vec<RolePackTextFile>,
    ) -> Result<(), String> {
        use std::fs;
        for entry in fs::read_dir(current).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let metadata = fs::symlink_metadata(&path).map_err(|e| e.to_string())?;
            if metadata.file_type().is_symlink() {
                continue;
            }
            if metadata.is_dir() {
                visit(base, &path, files)?;
                continue;
            }
            if !metadata.is_file() || path.extension().and_then(|x| x.to_str()) != Some("md") {
                continue;
            }
            let rel = path
                .strip_prefix(base)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .replace('\\', "/");
            files.push(RolePackTextFile {
                path: format!("user_identities/{rel}"),
                content: fs::read_to_string(&path).map_err(|e| e.to_string())?,
            });
        }
        Ok(())
    }
    visit(&dir, &dir, &mut files)?;
    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(files)
}

fn blueprint_to_legacy_parts(bp: &serde_json::Value) -> Result<(String, String), String> {
    let meta = bp
        .get("meta")
        .ok_or_else(|| "pipeline.ocblueprint 缺少 meta".to_string())?;
    let mut manifest = serde_json::json!({
        "id": meta.get("id"),
        "name": meta.get("name"),
        "version": meta.get("version"),
        "author": meta.get("author"),
        "description": meta.get("description"),
        "default_personality": meta.get("personality"),
        "user_relations": meta.get("relations"),
        "default_relation": meta.get("default_relation"),
        "scenes": meta.get("scenes"),
        "evolution": meta.get("evolution"),
        "memory_config": meta.get("memory_config"),
        "identity_binding": meta.get("identity_binding"),
        "dev_only": meta.get("dev_only"),
        "knowledge": meta.get("knowledge"),
        "life_trajectory": meta.get("life_trajectory"),
        "life_schedule": meta.get("life_schedule"),
        "min_runtime_version": meta.get("min_runtime_version"),
        "creator_message_to_downloader": meta.get("creator_message_to_downloader"),
    });
    if let Some(m) = meta.get("ollama_model") {
        manifest["ollama_model"] = m.clone();
    }

    let slot_registry = bp
        .get("slot_registry")
        .ok_or_else(|| "pipeline.ocblueprint 缺少 slot_registry".to_string())?;
    let slot_registry: std::collections::BTreeMap<String, SlotRegistryEntry> =
        serde_json::from_value(slot_registry.clone())
            .map_err(|e| format!("slot_registry 解析失败: {}", e))?;
    let pb = serde_json::to_value(slot_registry_to_plugin_backends(&slot_registry))
        .map_err(|e| e.to_string())?;
    let mut settings = serde_json::json!({
        "schema_version": 1,
        "model": meta.get("ollama_model").unwrap_or(&serde_json::json!("qwen2.5:7b")),
        "identity_binding": meta.get("identity_binding").unwrap_or(&serde_json::json!("per_scene")),
        "interaction_mode": meta.get("interaction_mode").unwrap_or(&serde_json::json!("immersive")),
        "evolution": meta.get("evolution"),
        "memory_config": meta.get("memory_config"),
        "remote_presence": meta.get("remote_presence"),
        "autonomous_scene": meta.get("autonomous_scene"),
        "plugin_backends": pb,
    });
    if let Some(rc) = bp.get("runtime_config") {
        if let Some(obj) = rc.as_object() {
            for (k, v) in obj {
                settings[k] = v.clone();
            }
        }
    }
    if let Some(anchor) = meta.get("reply_quality_anchor").and_then(|x| x.as_str()) {
        if !anchor.trim().is_empty() {
            settings["reply_quality_anchor"] = serde_json::json!(anchor);
        }
    }

    let manifest_text = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    let settings_text = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    Ok((
        format!("{}\n", manifest_text),
        format!("{}\n", settings_text),
    ))
}

/// 读取角色包根目录下的 v2 / Stable v4 `pipeline.ocblueprint`，拆为编辑器 manifest/settings 视图。
#[tauri::command]
fn load_role_pack_for_editor(role_dir: String) -> Result<RolePackEditorLoad, String> {
    use std::fs;
    use std::path::PathBuf;

    let root = PathBuf::from(role_dir.trim());
    if !root.is_dir() {
        return Err("所选路径不是目录".into());
    }
    let blueprint_path = root.join(PIPELINE_BLUEPRINT_FILENAME);
    if blueprint_path.is_file() {
        let blueprint_text = fs::read_to_string(&blueprint_path).map_err(|e| e.to_string())?;
        let bp: serde_json::Value =
            serde_json::from_str(&blueprint_text).map_err(|e| e.to_string())?;
        let preserved_files = read_blueprint_referenced_files(&root, &bp);
        let (manifest_text, settings_text) = blueprint_to_legacy_parts(&bp)?;
        let anchor_path = root.join(REPLY_QUALITY_ANCHOR_REL);
        let mut settings_text = settings_text;
        if anchor_path.is_file() {
            let anchor = fs::read_to_string(&anchor_path).map_err(|e| e.to_string())?;
            if !anchor.trim().is_empty() {
                let mut s: serde_json::Value =
                    serde_json::from_str(settings_text.trim()).map_err(|e| e.to_string())?;
                s["reply_quality_anchor"] = serde_json::json!(anchor.trim());
                settings_text = format!(
                    "{}\n",
                    serde_json::to_string_pretty(&s).map_err(|e| e.to_string())?
                );
            }
        }
        let scenes_for_merge: Vec<String> = bp
            .get("meta")
            .and_then(|m| m.get("scenes"))
            .and_then(|s| s.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|x| x.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default();
        let merged_scene_ids =
            merge_role_pack_scene_ids(&root, &scenes_for_merge).map_err(|e| e.to_string())?;
        let scene_files = merged_scene_ids
            .iter()
            .map(|scene_id| {
                let dir = root.join("scenes").join(scene_id);
                let scene_json_path = dir.join("scene.json");
                let description_path = dir.join("description.txt");
                Ok(RolePackSceneFile {
                    scene_id: scene_id.clone(),
                    scene_json_text: scene_json_path
                        .is_file()
                        .then(|| fs::read_to_string(&scene_json_path).map_err(|e| e.to_string()))
                        .transpose()?,
                    description_text: description_path
                        .is_file()
                        .then(|| fs::read_to_string(&description_path).map_err(|e| e.to_string()))
                        .transpose()?,
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let config_path = root.join("config.json");
        let config_text = config_path
            .is_file()
            .then(|| fs::read_to_string(&config_path).map_err(|e| e.to_string()))
            .transpose()?;
        let adult_extension_path = root.join("adult_extension.json");
        let adult_extension_text = adult_extension_path
            .is_file()
            .then(|| fs::read_to_string(&adult_extension_path).map_err(|e| e.to_string()))
            .transpose()?;
        let ui_path = root.join("user_identities").join("index.json");
        let user_identities_index_text = ui_path
            .is_file()
            .then(|| fs::read_to_string(&ui_path).map_err(|e| e.to_string()))
            .transpose()?;
        let memory_seed_path = root.join("memory_seed.json");
        let memory_seed_text = memory_seed_path
            .is_file()
            .then(|| fs::read_to_string(&memory_seed_path).map_err(|e| e.to_string()))
            .transpose()?;
        let read_optional_root_text = |name: &str| -> Result<Option<String>, String> {
            let path = root.join(name);
            path.is_file()
                .then(|| fs::read_to_string(&path).map_err(|e| e.to_string()))
                .transpose()
        };
        let core_personality_text = read_optional_root_text("core_personality.txt")?;
        let creator_message_text = read_optional_root_text("creator_message.txt")?;
        let ui_text = read_optional_root_text("ui.json")?;
        let author_text = read_optional_root_text("author.json")?;
        let user_identity_files = read_user_identity_files(&root)?;
        let (portrait_catalog_text, catalog_assets) = read_portrait_catalog_assets(&root);
        return Ok(RolePackEditorLoad {
            blueprint_text,
            manifest_text,
            settings_text: Some(settings_text),
            config_text,
            adult_extension_text,
            portrait_catalog_text,
            catalog_assets,
            preserved_files,
            user_identities_index_text,
            memory_seed_text,
            core_personality_text,
            creator_message_text,
            ui_text,
            author_text,
            user_identity_files,
            merged_scene_ids,
            scene_files,
        });
    }

    let manifest_path = root.join("manifest.json");
    if manifest_path.is_file() {
        return Err(
            "检测到 legacy manifest.json 格式。请先用 `oclive pack migrate-to-blueprint` 迁移后再编辑。"
                .into(),
        );
    }
    Err(format!(
        "未找到 {}：{}",
        PIPELINE_BLUEPRINT_FILENAME,
        blueprint_path.display()
    ))
}

#[derive(Debug, Deserialize)]
struct RolePackExportFile {
    path: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ValidateRolePackExportRequest {
    role_id: String,
    files: Vec<RolePackExportFile>,
    host_runtime_version: String,
}

/// Write export-shaped files to a temp role dir and run full version-dispatched `pack validate`.
#[tauri::command]
fn validate_role_pack_export(
    role_id: String,
    files: Vec<RolePackExportFile>,
    host_runtime_version: String,
) -> Result<(), String> {
    let req = ValidateRolePackExportRequest {
        role_id,
        files,
        host_runtime_version,
    };
    let role_id = req.role_id.trim();
    if role_id.is_empty() {
        return Err("role_id 不能为空".into());
    }
    let root = std::env::temp_dir().join(format!(
        "oclive-pack-editor-export-validate-{}-{}",
        std::process::id(),
        role_id
    ));
    let role_dir = root.join(role_id);
    if role_dir.exists() {
        let _ = std::fs::remove_dir_all(&role_dir);
    }
    std::fs::create_dir_all(&role_dir).map_err(|e| e.to_string())?;

    for f in &req.files {
        let rel = f.path.replace('\\', "/").trim().to_string();
        if !rel.starts_with(&format!("{role_id}/")) {
            return Err(format!("导出校验路径须以 {role_id}/ 开头：{rel}"));
        }
        let under = rel.strip_prefix(&format!("{role_id}/")).unwrap_or("");
        if under.is_empty() || under.contains("..") {
            return Err(format!("非法导出路径：{rel}"));
        }
        let dest = role_dir.join(under);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&dest, &f.content).map_err(|e| e.to_string())?;
    }

    let host = req.host_runtime_version.trim();
    let host_version = if host.is_empty() { "0.3.0" } else { host };
    let result = validate_role_pack_blueprint_directory(&role_dir, host_version);
    let _ = std::fs::remove_dir_all(&root);
    result.map_err(|e| e.join("\n"))
}

/// Whether `{roles_root}/{role_id}` already exists (re-export / overwrite hint).
#[tauri::command]
fn role_pack_dir_exists(roles_root: String, role_id: String) -> Result<bool, String> {
    use std::path::PathBuf;
    let root = roles_root.trim();
    let id = role_id.trim();
    if root.is_empty() || id.is_empty() {
        return Ok(false);
    }
    Ok(PathBuf::from(root).join(id).is_dir())
}

#[tauri::command]
fn validate_blueprint_v2_json(
    manifest_text: String,
    settings_text: String,
    merged_scene_ids: Vec<String>,
    host_runtime_version: String,
    role_id: String,
) -> Result<(), String> {
    let mut disk: DiskRoleManifest =
        serde_json::from_str(&manifest_text).map_err(|e| format!("manifest 解析失败: {}", e))?;
    let settings: DiskRoleSettings =
        serde_json::from_str(&settings_text).map_err(|e| format!("settings 解析失败: {}", e))?;
    settings.apply_to_manifest(&mut disk);
    let _ = merged_scene_ids;

    let dir = std::env::temp_dir().join(format!(
        "oclive-pack-editor-validate-{}",
        std::process::id()
    ));
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("manifest.json"), manifest_text.as_bytes())
        .map_err(|e| e.to_string())?;
    std::fs::write(dir.join("settings.json"), settings_text.as_bytes())
        .map_err(|e| e.to_string())?;
    let bp = build_blueprint_v2_from_legacy_dir(&dir).map_err(|e| e.join("\n"))?;
    let _ = std::fs::remove_dir_all(&dir);

    let blueprint_text = serde_json::to_string_pretty(&bp).map_err(|e| e.to_string())?;
    let folder = role_id.trim();
    let folder_opt = if folder.is_empty() {
        None
    } else {
        Some(folder)
    };
    validate_blueprint_v2_json_with_context(
        &blueprint_text,
        BlueprintV2ValidateContext {
            folder_name: folder_opt,
            host_version: if host_runtime_version.trim().is_empty() {
                None
            } else {
                Some(host_runtime_version.trim())
            },
            ..Default::default()
        },
    )
    .map_err(|e| e.join("\n"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            write_role_pack_files,
            write_role_pack_binaries,
            list_role_packs_under_roles_root,
            guess_default_roles_root,
            load_role_pack_for_editor,
            validate_blueprint_v2_json,
            validate_role_pack_export,
            role_pack_dir_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running oclive-pack-editor");
}

#[cfg(test)]
mod role_pack_command_tests {
    #[test]
    fn list_role_packs_finds_blueprint_and_legacy() {
        use super::{list_role_packs_under_roles_root, PIPELINE_BLUEPRINT_FILENAME};
        use std::fs;
        let root = std::env::temp_dir().join(format!("oclive-pe-list-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();

        let v2 = root.join("demo");
        fs::create_dir_all(&v2).unwrap();
        fs::write(
            v2.join(PIPELINE_BLUEPRINT_FILENAME),
            r#"{"schema_version":2,"meta":{"id":"demo","name":"Demo Role"},"slot_registry":{"llm":{"type":"llm","label":"L","backend":"ollama","position":0}}}"#,
        )
        .unwrap();

        let legacy = root.join("old");
        fs::create_dir_all(&legacy).unwrap();
        fs::write(legacy.join("manifest.json"), r#"{"id":"old"}"#).unwrap();

        let list = list_role_packs_under_roles_root(root.to_string_lossy().to_string()).unwrap();
        assert_eq!(list.len(), 2);
        assert!(list
            .iter()
            .any(|e| e.role_id == "demo" && !e.needs_migration));
        assert!(list.iter().any(|e| e.role_id == "old" && e.needs_migration));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn load_role_pack_returns_only_known_role_files() {
        use super::{load_role_pack_for_editor, PIPELINE_BLUEPRINT_FILENAME};
        use std::fs;

        let root = std::env::temp_dir().join(format!("oclive-pe-load-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("scenes/home")).unwrap();
        fs::write(
            root.join(PIPELINE_BLUEPRINT_FILENAME),
            r#"{"schema_version":2,"meta":{"id":"demo","name":"Demo","scenes":["home"]},"slot_registry":{"llm":{"type":"llm","label":"LLM","backend":"ollama","position":0}}}"#,
        )
        .unwrap();
        fs::write(root.join("core_personality.txt"), "core").unwrap();
        fs::write(root.join("ui.json"), "{}").unwrap();
        fs::write(root.join("author.json"), "{}").unwrap();
        fs::write(root.join("scenes/home/scene.json"), r#"{"name":"Home"}"#).unwrap();
        fs::write(root.join("scenes/home/description.txt"), "desc").unwrap();

        let loaded = load_role_pack_for_editor(root.to_string_lossy().to_string()).unwrap();
        assert!(loaded.blueprint_text.contains("\"schema_version\":2"));
        assert_eq!(loaded.core_personality_text.as_deref(), Some("core"));
        assert_eq!(loaded.ui_text.as_deref(), Some("{}"));
        assert_eq!(loaded.author_text.as_deref(), Some("{}"));
        assert_eq!(loaded.scene_files.len(), 1);
        assert_eq!(loaded.scene_files[0].scene_id, "home");
        assert_eq!(
            loaded.scene_files[0].description_text.as_deref(),
            Some("desc")
        );
        let _ = fs::remove_dir_all(&root);
    }
}
