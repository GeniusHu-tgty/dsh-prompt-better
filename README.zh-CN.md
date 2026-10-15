<div align="center">

# DSH Prompt Better

### ✨ 一键把提示词说清楚

在输入框旁把简单想法扩写成清晰、具体的提示词。增强、取消或恢复原文，都不必离开当前对话。

[![Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-4f7cff?style=flat-square)](LICENSE)
![适用于 DSH](https://img.shields.io/badge/works%20with-DSH-111827?style=flat-square)

[English](README.md) · **简体中文**

</div>

## 从简单想法到清晰提示词

先写下一句简单的问题，再一键补充成更明确、可直接使用的请求。

<table>
<tr>
<td align="center"><strong>增强前</strong></td>
<td align="center"><strong>增强后</strong></td>
</tr>
<tr>
<td><img src="docs/images/prompt-before.png" alt="简单询问 GitHub 项目的用途" width="480"></td>
<td><img src="docs/images/prompt-after.png" alt="具体要求分析项目并提供使用说明" width="480"></td>
</tr>
</table>

## 一个按钮，三种状态

| ✨ 增强 | <img src="docs/images/enhancing-spinner.gif" alt="动态加载动画" width="20"> 增强中 · 点击取消 | ↺ 恢复 |
|:--|:--|:--|
| 在原输入框中改写草稿。 | 动态转圈表示请求正在进行，点击即可取消。 | 增强完成后可随时恢复原文。 |

改写会保留草稿原有的语言。请求失败，或增强过程中你继续编辑时，插件不会覆盖你的草稿；文件引用 chip 也会保留。

## 自动使用当前 DSH 模型

默认使用点击 ✨ 时当前对话选中的模型，并沿用 DSH 已配置的服务商和 API。**无需另配 API Key 或模型。** 如果当前对话没有模型选择，则使用 DSH Host 的默认模型。

## 快速开始

你需要先有可正常运行的 DSH 安装和 profile。

1. 构建插件：

   ```bash
   pnpm install
   pnpm build
   ```

2. 在 profile 的 `package.json` 中添加依赖和 bundle：

   ```json
   {
     "dependencies": {
       "dsh-prompt-better": "link:<本插件的绝对路径>"
     },
     "dsh": {
       "profile": {
         "bundles": ["...", "dsh-prompt-better"]
       }
     }
   }
   ```

3. 重启 DSH，在输入框写下草稿并点击旁边的 ✨。

<details>
<summary>可选：调整超时或固定模型</summary>

在 profile 的 `cordis.patch.yml` 中添加以下配置即可；通常无需额外配置。

```yaml
- id: enhance-prompt
  name: dsh-prompt-better
  config:
    timeoutMs: 120000
    # 可选：固定模型，不再跟随当前对话的模型选择。
    # provider: deepseek-account
    # model: deepseek-flash
```

</details>

<details>
<summary>开发</summary>

```bash
pnpm install
pnpm build
pnpm typecheck
```

</details>

---

<div align="center">

[Apache-2.0 许可证](LICENSE) · [English](README.md)

</div>
