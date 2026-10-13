# Prompt Painter · 提示词绘画工作台

纯前端单页应用：接 OpenAI 兼容画图 API 出图，左侧词库把常用提示词分组收藏，
**点一下 = 追加到对话框（不替换）**，像搭积木一样组合出图。

## ✨ 功能

| 功能 | 说明 |
|---|---|
| 🧩 追加式调用 | 点击词卡插入光标处，自动补逗号，可去重、可撤销（Ctrl+Shift+Z） |
| 🗂 分组词库 | 分组增删改名换色、卡片拖拽排序、搜索、按使用次数/时间排序 |
| 🎨 画图 API | OpenAI 兼容 `/images/generations`，可配 baseURL/Key/模型/尺寸/质量/负向词/自定义 JSON |
| 🛡 参数自动降级 | 接口 400 报错点名某参数（如 aspect_ratio）时，自动摘掉该参数重试一次 |
| 📋 模型列表 | 一键从 `/models` 拉取可用模型，搜索过滤、点击选用 |
| ☁️ GitHub 云同步 | 词库存进你自己的仓库（一个 JSON），换设备登录即同步，localStorage 离线兜底 |
| 📤 导入导出 | 一键导出/导入 JSON 备份 |
| 📱 响应式 | 桌面三栏 / 移动端抽屉式 |

## 🚀 部署到 GitHub Pages

1. 新建一个 GitHub 仓库（如 `prompt-painter`），把 `index.html`、`styles.css`、`app.js` 传上去。
2. 仓库 **Settings → Pages** → Source 选 `main` 分支 `/ (root)` → Save。
3. 一两分钟后访问 `https://<你的用户名>.github.io/prompt-painter/` 即可。

本地直接双击 `index.html` 也能用（API Key 建议在 https 环境下使用）。

## ☁️ 配置云同步（可选但强烈推荐）

1. GitHub → Settings → Developer settings → **Personal access tokens → Fine-grained tokens** → Generate。
2. Repository access 选你存词库的仓库（可以就是 Pages 这个仓库），权限勾选 **Contents: Read and write**。
3. 打开网站 → 右上角 ⚙ 设置 → **云同步 · GitHub**：
   - 填 Owner（用户名）、Repo（仓库名）、分支（一般 `main`）、路径（默认 `prompts.json`）、Token。
4. 点 **「上传到云端」** 完成首次同步；之后改动会自动延迟上传（可在设置里关掉）。
5. 换设备打开同一网址，填好同样的信息，点 **「从云端拉取」** 即可。

> Token 只存在你本机浏览器的 localStorage，请求由浏览器直连 GitHub，不经过任何第三方。
> 公开仓库也可以不填 Token 只读拉取（勾选「公开仓库」）。

## 🔑 接入画图 API

设置 → 接口配置：

- **Base URL**：填到 `/v1` 为止，如 `https://api.openai.com/v1`（会自动拼 `/images/generations`）
- **API Key**：`sk-…`
- **模型**：`gpt-image-1` / `dall-e-3` / 硅基流动 `Kwai-Kolors/Kolors` / 智谱 `cogview-4` 等
- 不同厂商参数名不一致时，用「高级 · 自定义请求参数」里的字段映射和额外 JSON 兜底

内置「快填预设」：OpenAI / 硅基流动 / 智谱 / 通义 / 本地自建。

## ⌨️ 快捷键

| 按键 | 作用 |
|---|---|
| `Ctrl + Enter` | 开始绘制 |
| `Ctrl + Shift + Z` | 撤销上次追加 |
| `Ctrl + K` | 聚焦词库搜索 |
| `Esc` | 关闭弹窗/灯箱/抽屉 |

## 📁 文件

```
index.html   结构
styles.css   主题（浅/深）
app.js       全部逻辑（无依赖、无构建）
```
