# 交接文档 · 企鹅娘桌宠插件 `dsh-penguin-pet`

> 目的：让**新开对话窗口的 agent** 无需翻聊天记录即可接手。读完本文档 + 看一眼 `desktop-pet/README.md` 即可继续。
> 最后更新：本会话结束时刻。所有路径为 Windows 绝对路径。

---

## 0. TL;DR 当前状态

- 交付物：**`dsh-penguin-pet`** —— 一个给 DeepSeek Harness Desktop 窗口用的轻量桌宠插件（企鹅娘）。
- **已完成并装上运行**：已安装进 `desktop` profile，用户确认在 Harness 窗口里能看到企鹅（说明 `webserver/index-inject` 机制在其 Desktop 环境成立）。
- 形态：**host-only bundle 插件**，纯 JS、零客户端构建。靠往网页 index 注入 `<style>`+`<script>` 渲染桌宠。
- 最近一轮改动（工具栏可用性）**已同步但尚未被用户确认**——host 插件代码在进程内缓存，**必须重启 DSH Desktop** 才生效（见 §6）。

---

## 1. 目标与演变

用户上传一张**三视图**（正/侧/背）的企鹅娘插画 → 要求做成"桌宠小插件"。
经过两轮澄清后的最终诉求：

- 不要太重（否决了 Electron 独立应用方案）。
- **跑在这个 Harness 窗口内部**（即 DSH Desktop 的 web 客户端页面里），不是独立窗口。

## 2. 当前行为规格（用户最后确认的版本）

- 位置：页面**左下角**（`position:fixed; left:22px; bottom:48px`），`z-index:2147483000`，带 drop-shadow。（`bottom` 从 22px 提到 48px，给下方工具栏留空间。）
- 默认尺寸 120px，可调区间 70–260px、每档 ±20px，记忆在 `localStorage.dshPetSize`。
- 单击企鹅 → 随机台词：
  - 「咕咕嘎嘎」
  - 「我是香企鹅，你是凑企鹅」
  - （从 `['\u5495\u5495\u560e\u560e','\u6211\u662f\u9999\u4f01\u9e45\uff0c\u4f60\u662f\u51d1\u4f01\u9e45']` 随机取）
- 拖动：按住**企鹅图形本体**或**折叠后的圆钮**拖动；移动 <6px 视为点击触发台词。
- 悬停企鹅 → **脚下**弹出工具栏（`.dsh-pet-bar`）：
  - `−` 缩小 / `＋` 放大 / `▢` 折叠（**`✕` 隐藏已移除**：用户反馈关闭后无恢复入口；工具栏从"头顶"改到"脚下"，避免挡台词）。
- 折叠：收成 48px 的**白色简约圆钮**（`.dsh-pet-mini`，内含小展开箭头 SVG，不带 🐧 emoji），点击圆钮展开。
- 工具栏可见性机制（修"秒消失"bug 后）：
  - 锚定 `top:calc(100% + 4px)`（位于企鹅脚下方 4px，不覆盖头顶台词气泡）；
  - 用 `opacity`+`pointer-events`（不用 `display:none`），root 上加 `.show` class 控制；
  - `pointerenter` 显示、`pointerleave` 后 **400ms** 宽限期再隐藏（`.dsh-pet.show .dsh-pet-bar{opacity:1;pointer-events:auto}`）。
- 精灵图：240×404 正面透明 PNG，内嵌 base64 data URL（~145KB）。

## 3. 位置与文件清单

工作区根：`C:\Users\liuzhanhong\Desktop\OH-WorkSpace`

```
desktop-pet/
├── HANDOFF.md            ← 本文档
├── README.md             ← 使用/安装说明（最新）
├── plugin/               ← ★插件源（source of truth）
│   ├── index.mjs         ← host 插件本体（要改就改这里）
│   ├── package.json      ← name=dsh-penguin-pet, main=index.mjs, dsh.bundle.patch=./cordis.patch.yml
│   ├── cordis.patch.yml  ← bundle 补丁：insert id=penguin-pet name=dsh-penguin-pet
│   └── spirit-240.txt    ← 精灵 base64（运行时由 index.mjs 读取）
├── assets/               ← 抠图素材
│   ├── penguin-girl.png  ← 原始三视图（纯白底 1611x873）
│   ├── front.png / side.png / back.png  ← 抠好的透明三视图（正面/侧/背）
│   └── spirit-240.*      ← 240px 缩图与 base64/dataURL
├── index.html            ← 备选：纯浏览器版桌宠（不依赖插件）
├── 启动-浏览器.bat
└── tools/                ← pngjs 工具脚本（node）
    ├── analyze.js        ← 分析三视图包围盒
    ├── process.js        ← 裁切+泛洪抠背景→透明图
    ├── resize.js         ← 缩到 240px + 输出 base64
    └── validate.mjs      ← ★模拟 ctx 拿注入行→语法/</script>校验
```

**已安装副本**（≠源文件，改动需同步）：
`C:\Users\liuzhanhong\.dsh\profiles\desktop\node_modules\dsh-penguin-pet\`（普通拷贝，非符号链接）

## 4. 工作原理

- DSH Desktop 用 `desktop` profile（`C:\Users\liuzhanhong\.dsh\profiles\desktop\`）。
- profile 的 `package.json` 里 `dsh.profile.bundles` 按序列出插件 bundle；本插件已追加为最后一项。
- 插件包声明 `dsh.bundle.patch: ./cordis.patch.yml` → 启动时该补丁执行一次 `insert`：Loader 加载 `dsh-penguin-pet`（即 `index.mjs`，导出 `name`/`apply`，无 default export）。
- `apply(ctx)` 里：`ctx.on('webserver/index-inject', table => { table.push({kind:'style',...}); table.push({kind:'script', placement:'body', ...}) })`。
- webserver 每次渲染 index.html 时先 `emit('webserver/index-inject', table)` 收集各行再渲染 → 企鹅进入页面 DOM。
- **约束**：style/script 文本不得含字面 `</style` / `</script`；脚本由注入行内联执行，用 `window.__dshPetInstalled` 防重复。

## 5. 已安装状态（实测核对过）

- `dsh.profile.bundles` 末尾含 `dsh-penguin-pet` ✅
- `dependencies['dsh-penguin-pet'] = file:C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/plugin` ✅
- `node_modules\dsh-penguin-pet\{index.mjs, package.json, cordis.patch.yml, spirit-240.txt}` ✅
- 源 `index.mjs` 与安装副本 SHA-256 **一致** ✅（最后一次同步后）
- 校验脚本输出：`RESULT: ALL OK`（style 括号平衡 / script 可解析 / 无 `</script`）

## 6. 修改 → 部署工作流（★新窗口必读）

host 插件代码改动后的完整链路：

1. 改源：`C:\Users\liuzhanhong\Desktop\OH-WorkSpace\desktop-pet\plugin\index.mjs`（台词/样式/交互全在这一文件）。
2. 语法校验：
   ```
   node C:\Users\liuzhanhong\Desktop\OH-WorkSpace\desktop-pet\tools\validate.mjs
   ```
   应输出 `RESULT: ALL OK`。
3. **同步到安装副本**（因为不是符号链接）：
   ```powershell
   Copy-Item -Force "C:\Users\liuzhanhong\Desktop\OH-WorkSpace\desktop-pet\plugin\index.mjs" "C:\Users\liuzhanhong\.dsh\profiles\desktop\node_modules\dsh-penguin-pet\index.mjs"
   ```
4. **重启 DSH Desktop 应用**（host 插件代码在进程内缓存，仅刷新页面不会换新；初次"装上即生效"得益于 `patchReload:"live"` 对新 bundle 生效，但**编辑已有插件文件后必须重启**）。
5. 让用户在 Harness 窗口确认效果。

安装（若重装/换机器）：
```powershell
& "C:\Users\liuzhanhong\AppData\Roaming\DSH Desktop\host-commands\desktop\bin\dsh.cmd" plugin --profile desktop add "file:C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/plugin"
```

卸载：`dsh plugin --profile desktop remove dsh-penguin-pet`（或手动从 `dsh.profile.bundles` + `dependencies` + node_modules 移除）。

## 7. 关键坑 / 环境事实

1. **写入 `%DSH_HOME%\profiles\...` 会被 DSH 文件沙箱拦**（EPERM）。`dsh plugin add`、Copy-Item 进 node_modules 若被拒：用 `sandbox_permissions: "danger-full-access"` + 一句话 justification 重试一次（本会话已成功过一次，用户会收到授权弹窗）。
2. `dsh` 命令在 PATH 上是 **pnpm shim**；真正的 Desktop CLI 在 `C:\Users\liuzhanhong\AppData\Roaming\DSH Desktop\host-commands\desktop\bin\dsh.cmd`。
3. 用户运行的是 **DSH Desktop 打包版**（Electron，`C:\Program Files\DSH Desktop`），**不是**源码 `pnpm dsh web --patch` 那套——那些 overlay/源码教程对 Desktop 不适用（走 bundle 插件安装才对）。
4. npm/pip 写系统缓存被拦：npm 需 `$env:npm_config_cache=<workspace 内路径>`；pip 用 `--no-cache-dir --target <workspace>`（直连 PyPI 也不通；本项目图处理用 Node `pngjs`，无 pip 依赖）。
5. Electron 的 postinstall 在沙箱下 `spawn` 被拦（EPERM）→ 桌面悬浮版已搁置（代码当时已删），如需可自行 `npm install electron`。
6. ~~`harness-project\deepseek-harness` 是 DSH 源码（仅参考）~~ —— **已于 2026-09-04 应要求删除**（本地源码仓 + 全部 `dsh-web*` 包已清掉，只保留 DSH Desktop 打包版与 `desktop-pet`）。
7. 用户 API：`.dsh\settings.yaml` → provider `deepseek-official`, model `deepseek-v4-flash`；密钥在 `.dsh\.credentials.yaml`（用户自己的 `DEEPSEEK_API_KEY`，勿外泄/勿打印）。

## 8. 尚未完成 / 下一步候选

- [ ] **用户待验证**：重启 DSH Desktop 后，去掉 `✕` 隐藏按钮（只留 −/＋/▢）、折叠圆钮改为白圆+小箭头（无 🐧 emoji）、台词改回「咕咕嘎嘎」是否满意。
- [ ] 动画（用户看过方案，**暂不做**）：候选 = 方案A 纯 CSS 呼吸感（双 wrapper 浮动+呼吸、影子、随机小动作、拖拽倾斜），B 换向/假走路用 side/back 图，C 真帧动画需补素材。做动画前先给用户确认再动工。
- [ ] 可调项：台词、工具栏位置（已于 2026-09-04 从头顶改为**脚下** `top:calc(100%+4px)`，默认 `bottom` 22→48px）、宽限 400ms、默认位置/尺寸、大小上下限。
- [ ] 有趣但未做：走路动画（已有 side/back 透明图，可按方向切换）；多语言；把 sprite 进一步压小。
- [ ] 重方案（用户已否决"重"，仅在必要时提）：客户端 plugin（`packages/client/*` 槽位体系，需 tsc+tsdown 构建）；发布成 npm/github 插件。
- [ ] 备选 `index.html`（纯浏览器版）保持可用，含方向键走路功能（与插件版功能不完全一致，勿混）。

## 9. 一句话给新窗口

> 继续做"企鹅娘桌宠"：改 `desktop-pet\plugin\index.mjs` → 跑 `tools\validate.mjs` → Copy-Item 同步到 `%DSH_HOME%\profiles\desktop\node_modules\dsh-penguin-pet\` → **让用户重启 DSH Desktop** → 等反馈。所有背景、命令、坑都在本文档和 `README.md`。
