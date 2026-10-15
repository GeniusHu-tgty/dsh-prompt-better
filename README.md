# DSH Prompt Better

**Make your prompts clearer with one click.** DSH Prompt Better adds an ✨ button beside the chat input. It rewrites your draft into a clearer, more specific prompt—then lets you restore the original whenever you want.

[English](#dsh-prompt-better) · [简体中文](#简体中文)

## See it in action

Start with a short idea; get a more useful prompt ready to send:

**Before**

![Before: a short question about a GitHub project](docs/images/prompt-before.png)

**After**

![After: a clearer request with concrete analysis and usage details](docs/images/prompt-after.png)

## What it does

- **Enhance** a draft in place with one click.
- **Restore** the original draft with one click.
- **Cancel** an enhancement in progress.
- Preserve the language of your draft.
- Keep your draft unchanged if enhancement fails or you edit it while the request is running.
- Preserve file-reference chips in the draft.

## Which model does it use?

By default, enhancement uses the model currently selected for the conversation when you click ✨. Requests use your existing DSH model/provider setup; this plugin does not require a separate API key. If no conversation model is available, it falls back to the DSH host's default model.

## Use it

You need a working DSH installation and profile.

1. Build the package:

   ```bash
   pnpm install
   pnpm build
   ```

2. Add the package to your profile's `package.json` and bundle list:

   ```json
   {
     "dependencies": {
       "dsh-prompt-better": "link:<absolute path to this package>"
     },
     "dsh": {
       "profile": {
         "bundles": ["...", "dsh-prompt-better"]
       }
     }
   }
   ```

3. Restart DSH. Type a draft and click ✨ beside the chat input to enhance it. Click ↺ to restore the original.

## Optional configuration

Add this entry to your profile's `cordis.patch.yml` if you want to change the timeout or pin a specific model. In normal use, no configuration is needed.

```yaml
- id: enhance-prompt
  name: dsh-prompt-better
  config:
    timeoutMs: 120000
    # Optional: pin a model instead of following the conversation selection.
    # provider: deepseek-account
    # model: deepseek-flash
```

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
```

## License

[Apache-2.0](./LICENSE)

## 简体中文

**一键把提示词说清楚。** DSH Prompt Better 会在对话输入框旁添加一个 ✨ 按钮，把你的草稿改写得更清晰、具体；需要时也可以一键恢复原文。

### 效果示例

从一句简单想法开始，得到一段更清晰、可以直接发送的提示词：

**增强前**

![增强前：简单询问一个 GitHub 项目的用途](docs/images/prompt-before.png)

**增强后**

![增强后：补充了具体的项目分析和使用说明要求](docs/images/prompt-after.png)

### 可以做什么

- **增强**：点击一次，在原输入框中改写草稿。
- **恢复**：一键恢复增强前的原文。
- **取消**：增强进行中可以随时取消。
- 保持草稿原有的语言。
- 增强失败，或请求过程中草稿发生变化时，不会用结果覆盖你的内容。
- 保留草稿中的文件引用 chip。

### 使用哪个模型？

默认使用点击 ✨ 时当前对话所选的模型。请求沿用 DSH 已配置的模型和服务商，插件不需要单独配置 API Key。如果当前对话没有可用的模型选择，则使用 DSH Host 的默认模型。

### 如何使用

你需要先有可正常运行的 DSH 安装和 profile。

1. 构建插件：

   ```bash
   pnpm install
   pnpm build
   ```

2. 在 profile 的 `package.json` 中添加本插件依赖及 bundle：

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

3. 重启 DSH。在对话输入框中写下草稿，点击旁边的 ✨ 即可增强；点击 ↺ 可恢复原文。

### 可选配置

日常使用无需配置。如果需要调整超时时间，或指定固定模型，可在 profile 的 `cordis.patch.yml` 中添加：

```yaml
- id: enhance-prompt
  name: dsh-prompt-better
  config:
    timeoutMs: 120000
    # 可选：固定使用某个模型，不再跟随当前对话的模型选择。
    # provider: deepseek-account
    # model: deepseek-flash
```

### 开发

```bash
pnpm install
pnpm build
pnpm typecheck
```

### 许可证

[Apache-2.0](./LICENSE)
