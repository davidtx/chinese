# 汉字描红练习

纯前端网页应用，用手指或 Apple Pencil 在手机/平板上描红练习写汉字。无需后端、无需构建工具，可直接部署为静态网站（例如 GitHub Pages）。

## 功能

- 输入一行汉字，逐字进入全屏描红模式
- 使用 [hanzi-writer](https://hanziwriter.org/)（通过 CDN 加载）提供笔顺数据，quiz 模式实时判断笔画顺序/方向是否正确
- 田字格背景辅助定位
- 支持触摸屏、Apple Pencil、鼠标（Pointer Events 统一处理）
- 写完一行后汇总展示本次所有字的书写结果与对错标注
- 所有练习记录保存在浏览器 IndexedDB 中，刷新/关闭页面后依然存在
- 历史记录页可回顾以往练习

## 目录结构

```
chinese-writing-app/
├── index.html      入口页面，包含四个屏幕（输入/练习/汇总/历史）
├── styles.css       样式（田字格、按钮、布局）
├── js/
│   ├── db.js        IndexedDB 封装（保存/读取练习记录）
│   └── app.js        主逻辑（屏幕切换、HanziWriter 集成、笔迹快照、历史渲染）
└── README.md
```

## 本地预览

由于用到了浏览器原生 `fetch`/`indexedDB` 等 API，建议用本地静态服务器打开（不要直接双击用 `file://` 打开）：

```bash
cd chinese-writing-app
python3 -m http.server 8080
# 然后手机/平板浏览器访问 http://<你电脑的局域网IP>:8080
```

或者用 VS Code 的 Live Server 插件、`npx serve` 等任何静态文件服务器都可以。

## 部署到 GitHub Pages（推送到你的 `chinese` 仓库）

这个环境本身没有网络权限，无法帮你直接 `git push`，请在你自己的电脑上执行以下步骤：

```bash
# 1. 把这些文件复制进你已有的 chinese 仓库目录
# 2. 在仓库根目录执行：
git add .
git commit -m "feat: 汉字描红练习网站初版"
git push origin main

# 3. 在 GitHub 仓库 Settings → Pages 中，
#    Source 选择你推送的分支（如 main）+ 根目录 (/)
#    保存后几分钟内即可通过 https://<你的用户名>.github.io/chinese/ 访问
```

## 已知限制 / 后续可优化方向

- 描红笔迹快照目前保存为 SVG dataURL（体积小、清晰度高），如需转成 PNG 缩略图可在 `captureSnapshot()` 里补充 canvas 转换逻辑
- 当前笔画对错判定完全依赖 hanzi-writer 内置的 quiz 校验逻辑
- 如果想支持生僻字，需确认 hanzi-writer 的字符数据是否覆盖（默认覆盖常用汉字，生僻字可能需要额外配置数据源）
- 目前是单页应用，未做路由（不影响使用，只是浏览器地址栏不会随页面变化）
