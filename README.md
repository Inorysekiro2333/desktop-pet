# 企鹅娘桌宠（Harness 窗口内）

按你给的三视图抠图做成的小桌宠，运行在 **DeepSeek Harness 的 Web 窗口内部**（浮在页面左下角，可拖动、会眨眼/呼吸、点击有台词）。轻量：只有一个 Host 插件，往 `webserver/index-inject` 注入 `<style>` + `<script>` 行，**不需要构建客户端**。

## 目录

```
desktop-pet/
  assets/              原始素材与抠图结果
    penguin-girl.png   原始三视图
    front|side|back.png  抠好的透明三视图（正面/侧面/背面）
    spirit-240.txt      缩小的正面精灵（base64，供插件内嵌）
  plugin/             DSH bundle 插件包（可 `dsh plugin add`）
    package.json      声明 `dsh.bundle.patch`
    index.mjs         桌宠 Host 插件（纯 JS，零构建）
    cordis.patch.yml  bundle 补丁：insert 插件行
    spirit-240.txt     内嵌精灵数据
  index.html           备选：纯浏览器版桌宠（无需 DSH 插件）
  启动-浏览器.bat       双击用默认浏览器打开 index.html
  tools/               抠图/缩放脚本（pngjs）
```

## 启用（在 Desktop 的 Harness 窗口里看到企鹅）

用 Desktop 自带的 `dsh` CLI 把插件装进 `desktop` profile（你当前的镜像，本机已装好）：

```sh
"C:\Users\liuzhanhong\AppData\Roaming\DSH Desktop\host-commands\desktop\bin\dsh.cmd" plugin --profile desktop add "file:C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/plugin"
```

该命令会把它追加到 `dsh.profile.bundles`、写入依赖，并放进 `profiles/desktop/node_modules`。因为 profile 是 `patchReload: "live"`，刷新窗口后企鹅娘会出现在**左下角**；如果没出现，重启一次 DSH Desktop 应用即可。

- **悬浮在左下角**；点住可拖走，单击跟她互动（台词「咕咕嘎嘎」「我是香企鹅，你是凑企鹅」）。
- **悬停出现工具栏**：`−` 缩小 / `＋` 放大 / `▢` 折叠成小圆钮（再点圆钮展开），**没有"隐藏/关闭"按钮**（删掉了：关闭后无恢复入口）。折叠圆钮为白色简约样式、带小展开箭头，不再是 🐧 emoji。
- 大小（70–260px、每档 ±20px）会记忆。
- 若想从任意 profile 安装：`dsh plugin --profile <name> add file:...`（本机也可用 `pnpm` 路径的 `dsh`）。

## 原理

- **Host 插件**（`plugin/index.mjs`）监听 `webserver/index-inject`，每次页面渲染时把一条 `<style>` 和一条 `<body><script>` 注入行 push 进 table。
- 注入行里的脚本用内嵌 base64 精灵图，在浏览器里 `document.body.appendChild` 一只固定的 `.dsh-pet`；样式含重力/呼吸/点击回弹动画。
- 事件订阅由 Cordis 生命周期管理，插件卸载自动清掉，无残留。

## 备选方案

- **纯浏览器版**：双击 `启动-浏览器.bat` 或打开 `index.html`（可拖动、方向键/WASD 走路、空格收放面板；不依赖 DSH 插件）。

## 不足

- 内嵌 145KB base64 精灵图会让页面 HTML 稍大一点；如需更小可把 `plugin/spirit-240.txt` 换成更小缩图（用 `tools/resize.js` 重新生成并拷贝）。
- 只注入 Host（Node）插件，不改客户端构建；想深度定制 UI 需走仓库的 `packages/client/*` 槽位体系（较重）。
