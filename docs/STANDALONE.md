# 编写器：独立软件与仓库边界

## 仓库名与位置

- **本编写器产品**使用仓库 / 文件夹 **`oclive-pack-editor`**（可与 `oclivenewnew` 同级放在 D 盘等任意路径）。
- **运行时（玩家端）**在另一仓库 **`oclivenewnew`**；两仓 **不** 互相作为子模块、**不** 共享 `package.json`。
- **唯一对接面**：本地磁盘上的角色包目录（或 zip），结构与 oclivenewnew 的 `creator-docs/`、`roles/README_MANIFEST.md` 一致；**性格档案**轴心见 oclivenewnew **`docs/personality-archive-notes.md`**。

在 Cursor / VS Code 中可用多根工作区同时打开两项目；编写器仓内 **不要** 复制或依赖 oclivenewnew 源码，README 链到契约文档即可。

## 「本地独立运行」的几种形态

| 形态 | 说明 | 前后端 |
|------|------|--------|
| **A. Tauri 桌面（当前主路径）** | **Tauri 2.x** 包一层 WebView，加载本仓库 `npm run build` 产出的 `dist/`；选 **roles 根** 与写盘走 **Tauri 对话框 + IPC**（`invoke`），与浏览器 File System Access 无关 | 仍是一套 Vue 前端 + `src-tauri` Rust 壳 |
| **B. 纯浏览器** | `npm run dev` / 静态托管；zip 下载到本机**任意目录**，再手动将 `{roleId}/` 复制进 oclive 的 **roles 根**；在支持 **File System Access** 的 Chromium 中可 **直接写入文件夹** 作为 roles 根 | 无独立后端 |
| **C. 本机前后端（可选未来）** | `client/` + `server/`（Node）仅在本仓库内演进 | **不要** 把 server 放进 oclivenewnew |

与 oclivenewnew **仍不搅在一起**：无论 A/B/C，代码与 CI 都在 **`oclive-pack-editor` 本仓库** 内完成。

## 离线能力（编写器）

- **不依赖外网**：编辑、JSON **运行全部检查**、打 zip、桌面版写入用户选定的 **roles 根** 目录树；可选 **导出前校验**（可关闭以便半成品或插件包到 oclive 实测）。  
- **外部角色卡转换也离线**：V1 / V2 / V3 JSON、PNG/APNG 与 CHARX 只在本机读取，转换后可选择进入简单创造或高级创作，两者使用同一份草稿；不上传卡面或角色内容。CHARX 只解出明确引用且受尺寸限制的本地图片，远程、代码、模型、音视频与平台私有扩展仅保留在原始来源中，不联网获取、不执行、不自动启用。
- **首发边界**：基础编辑、角色卡转换与 `.ocpak` 导出先发布；成人扩展和角色语音侧车的配置入口保留，但内容效果、设备兼容与长时间体验只在内测推进，不阻塞基础版本。
- **不包含**：云端 API、内嵌 LLM、oclivenewnew 运行时进程。

## `OCLIVE_ROLES_DIR` 与写入语义

- 用户通过 **「写入文件夹（自选 roles 根目录）」** 选择的是 **roles 根**：其下应直接出现 `{roleId}/pipeline.ocblueprint`（与 `.ocpak` / zip 解压后结构一致）。
- 将该目录路径配置为运行时的 **`OCLIVE_ROLES_DIR`** 后，oclivenewnew 从该根下发现各角色包。  
- 若仅下载 zip，解压后把 **`{roleId}` 文件夹** 放进上述 roles 根即可（不要多套一层）。

## 环境依赖（桌面）

- **Rust**（stable）与 **Node.js**：开发与 `tauri build` 必备。  
- **Windows**：WebView2；C++ 构建工具链（MSVC）用于 `tauri build`。  
- **Linux**：WebKitGTK 4.1 等（CI 与 [Tauri 2 前置说明](https://v2.tauri.app/start/prerequisites/) 一致）。
- 详细命令见根目录 **README.md**。

## 若采用「前后端」时的建议目录（仅约定，未强制迁移）

在 **本仓库内** 演进即可，例如：

```
oclive-pack-editor/
  client/          # 现有 Vue 可逐步迁入，或保留根目录为 client
  server/          # Node：端口、CORS 仅 localhost
  docs/
```

根 `package.json` 可用 `npm-run-all` 或 pnpm workspace 同时起 `dev:client` / `dev:server`。

## 小结

- **项目文件夹就是 `oclive-pack-editor`**，便于只改编写器、不动运行时。  
- **桌面主路径**为 **Tauri**；浏览器为辅助或静态部署。  
- 与 oclivenewnew 的联调步骤见根 **README.md**。

## 测试与「启动器」（桌面壳）备忘

- **浏览器**：`npm run dev:browser`（自动打开页签）或 `npm run dev` 后手动打开 `http://localhost:5173/`；Windows 也可用 **`scripts/start.bat`** 选「仅浏览器」或 `scripts/start.bat web`。
- **Tauri 窗口（本机启动器形态）**：`npm run tauri:dev`，或 Windows **`scripts/start.bat`**（默认即 Tauri）；正式安装包用 `npm run tauri:build`，产物在 `src-tauri/target/release/bundle/`（依平台而异）。
- **自动化**：`npm test`（单测）、`npm run test:e2e`（需先 `npm run build` 且已 `npx playwright install`）与 CI 一致；日常手测不必强依赖 E2E。  
- **启动体验（近期优化）**：简单与高级创作面板按需异步加载，开始页保持轻量。
- **无障碍（简要）**：高级创作下 Tab 列表可聚焦后，用 **← / →**、**Home** / **End** 切换分区（与 Fluent 类桌面习惯一致）。  
- 编写器与 oclive **仍通过磁盘角色包对接**：测试链路以「导出 → 放入 roles 根 → 运行时 `load_role`」为准。
