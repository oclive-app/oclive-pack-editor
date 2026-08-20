/**
 * 简单创作 / 检查 / 试聊：与高级创作同结构的「常见问题」条目（改进前 / 改进后对照）
 */
import type { AdvFaqItem } from './advancedEditorFaq'

export const SIMPLE_BASE_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'sb-core',
    question: '核心性格档案一定要写得很长吗？',
    plainExplain: '不用。写清楚「怎么说话、怕什么、对谁亲」就行，长短随你；后面随时能改。',
    beforeCode: `（空着）`,
    afterCode: `性格：表面冷淡，熟悉后会多吐槽两句。
口癖：句尾爱加「…行吧」。`,
    highlightAfter: ['性格', '口癖'],
  },
  {
    id: 'sb-emotion',
    question: '情绪图文件名要和我心里想的一样吗？',
    plainExplain: '要和游戏或映射里用的名字一致；编写器只帮你打包，不会偷偷替你改名。',
    beforeCode: `my_happy_pic.png`,
    afterCode: `happy.png（与 oclive 情绪资源命名一致）`,
    highlightAfter: ['happy.png', '一致'],
  },
  {
    id: 'sb-msg-mode',
    question: '「整包一句」和「按行多条」差在哪？',
    plainExplain: '整包一句：只导出第一条有效行；按行多条：每一行是一条独立寄语，启动器会分开展示。',
    beforeCode: `模式：整包一句
第一行：谢谢游玩
第二行：这行可能不导出`,
    afterCode: `模式：按行多条
谢谢游玩
欢迎回来`,
    highlightAfter: ['按行多条', '欢迎回来'],
  },
]

export const SIMPLE_MANIFEST_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'sm-id',
    question: '角色 ID 和显示名称，我容易搞混，咋记？',
    plainExplain: 'ID 是文件夹名、英文为主；显示名称是玩家看到的称呼。ID 别随便改，容易和已导出路径对不上。',
    beforeCode: `角色 ID：old_id
显示名称：旧名字`,
    afterCode: `角色 ID：my_hero
显示名称：新展示名`,
    highlightAfter: ['my_hero', '新展示名'],
  },
  {
    id: 'sm-scenes',
    question: '场景那一栏怎么填？',
    plainExplain: '多个场景用英文逗号隔开，不要有空格也行。和高级模式里的 scenes 列表一个意思。',
    beforeCode: `home`,
    afterCode: `home, school, cafe`,
    highlightAfter: ['cafe'],
  },
  {
    id: 'sm-traits',
    question: '七维数字我瞎填行不行？',
    plainExplain:
      '都在 0～1 之间。可以先 0.5 一排，再按性格微调。若包内选「档案」人格来源，七维在运行时多为视图，仍会写入包作默认。',
    beforeCode: `0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5`,
    afterCode: `0.4, 0.6, 0.5, 0.3, 0.7, 0.5, 0.6`,
    highlightAfter: ['0.4', '0.6'],
  },
  {
    id: 'sm-world',
    question: '世界观写在这儿会到哪去？',
    plainExplain: '有内容时会生成 knowledge/world.md；和高级创作里的知识库会同步，别两处各写一套矛盾设定。',
    beforeCode: `（空）`,
    afterCode: `# 世界观摘要\n角色住在一座多雨的小城。`,
    highlightAfter: ['world', '多雨'],
  },
]

export const SIMPLE_SETTINGS_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'ss-brain',
    question: '本机模型和 GGUF 在哪里选？',
    plainExplain: '在 Chat Pro 设置页统一选择。角色包编写器只写可移植的理想配置，不复制当前电脑的模型、路径或运行参数。',
    beforeCode: `角色包：写入本机模型路径`,
    afterCode: `角色包：理想推理配置\nChat Pro：实际模型与 GGUF`,
    highlightAfter: ['Chat Pro'],
  },
  {
    id: 'ss-eif',
    question: '「事件影响系数」是干嘛的？',
    plainExplain:
      '数字大，剧情事件对好感等影响更明显。档案人格来源下，七维直接增量会弱化，变化更多走「可变性格档案」。先小步改。',
    beforeCode: `事件影响系数：1.0`,
    afterCode: `事件影响系数：1.2`,
    highlightAfter: ['1.2'],
  },
  {
    id: 'ss-profile',
    question: '「人格来源」经典和档案有什么区别？',
    plainExplain:
      '经典以七维增量等为主。档案以包内核心性格档案为锁定基底，运行时可变档案由模型写；你调 max_change_per_event 等，不能手写可变正文。',
    beforeCode: `人格来源：经典（vector）`,
    afterCode: `人格来源：档案（profile）`,
    highlightAfter: ['profile'],
  },
  {
    id: 'ss-plugins',
    question: 'memory、emotion 那些下拉框一般选啥？',
    plainExplain: '多数包用 builtin 就够用；除非你明确要接远程插件，再考虑 remote。',
    beforeCode: `memory：builtin`,
    afterCode: `memory：builtin\nemotion：builtin`,
    highlightAfter: ['builtin'],
  },
]

export const CHECKS_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'ck-fail',
    question: '检查报错了我还能导出吗？',
    plainExplain: '可以关掉「导出前校验」直接导出，方便半成品测试；但发给别人前尽量先修红字。',
    beforeCode: `导出前校验包内容：已勾选`,
    afterCode: `导出前校验包内容：未勾选（仍可点导出）`,
    highlightAfter: ['未勾选'],
  },
  {
    id: 'ck-wasm',
    question: 'Rust wasm 和 TypeScript 检查差很多吗？',
    plainExplain: '有 wasm 时更贴近主仓库契约；没有也能用 TS 兜底。能跑 wasm 更好，跑不了也别慌。',
    beforeCode: `最近一次检查：TypeScript`,
    afterCode: `最近一次检查：Rust wasm`,
    highlightAfter: ['Rust wasm'],
  },
]

export const CHAT_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'ch-ping',
    question: '「检测连接」失败，最常见是啥原因？',
    plainExplain: '多半是 oclive 没开试聊服务，或端口和上面填的地址不一致。先在终端用带 API 的参数启动。',
    beforeCode: `连接地址：http://127.0.0.1:8420\n状态：失败`,
    afterCode: `连接地址：http://127.0.0.1:8420\n状态：成功`,
    highlightAfter: ['成功'],
  },
  {
    id: 'ch-path',
    question: '角色文件夹要指到哪一层？',
    plainExplain: '这一层里直接能看到 pipeline.ocblueprint；通常是 roles 根下面的「角色 id」文件夹。',
    beforeCode: `C:\\…\\roles\\`,
    afterCode: `C:\\…\\roles\\my_role_id\\`,
    highlightAfter: ['my_role_id'],
  },
]
