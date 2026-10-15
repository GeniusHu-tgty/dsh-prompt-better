# dsh-prompt-better

**DSH（DeepSeek Harness）插件：增强提示词** —— 输入框右侧 ✨ 一键把你的草稿交给 LLM 改写成更清晰、更具体的提示词。

## 效果示例

输入一个简单的想法，点击 ✨ 增强后即可得到更清晰、具体、可直接使用的提示词：

**增强前**

![增强前：在输入框中输入 GitHub 项目链接并询问项目用途](docs/images/prompt-before.png)

**增强后**

![增强后：提示词补充了项目分析要求、核心功能和使用方法](docs/images/prompt-after.png)

## 功能

- ✨ **增强**：草稿文本 → 一次性 LLM 改写 → 原地替换
- ↺ **恢复**：一键恢复增强前的原文
- ⏳ **取消**：增强中随时取消（Host 侧 agent 同步回收）
- 🌐 **语言保真**：中文输入 → 中文输出；混合语言保持混合；不输出"检测到中文"之类的元注释
- 🛡 **CAS 防覆盖**：增强期间你继续打字 → 放弃覆盖，草稿分毫不动
- 📎 **失败降级**：任何失败（超时/模型错误/网络）草稿原样保留，只弹提示
- 🔗 **引用 chip 保护**：草稿含文件引用时按区间写入，附件不丢

## 原理

Host 面创建一个 **one-shot scoped agent**（无工具、独立 system prompt、单轮跑完即弃），
通过 Typert Remote 暴露给浏览器；Client 面在 `conversation.input.right` 插槽
（发送键左侧，DSH 官方零占用位）渲染三态按钮。

改写 prompt 由双 prompt 资产驱动：
system prompt 管改写策略（分析→原则→负面约束→few-shot），
user 模板管格式纪律（语言一致性 CRITICAL PRIORITY + BAD/GOOD 输出对比）。

## 安装

### 前置

- 一个可用的 dsh 安装与 profile（本插件按 profile bundles 模式挂载）

### 方式一：profile 手动挂载

1. 构建本包（零配置，依赖全部来自 npm）：

   ```bash
   pnpm install
   pnpm build   # 产物 lib/index.js (host) + lib/client.js (browser)
   ```

   > 类型依赖锁定 `0.2.0-rc.2`（npm `next` tag，与当前 DSH 安装同版线）。
   > npm 用户可用 `npm install` + `npm run build`（client 面依赖需 `--legacy-peer-deps`，推荐 pnpm）。

2. 在 profile 的 `package.json` 中加入依赖与 bundle：

   ```json
   {
     "dependencies": {
       "dsh-prompt-better": "link:<本包绝对路径>"
     },
     "dsh": {
       "profile": {
         "bundles": [ "...", "dsh-prompt-better" ]
       }
     }
   }
   ```

3. 重启 dsh。输入框工具行（发送键左侧）出现 ✨ 按钮即成功。

### 配置（可选）

在 profile 的 `cordis.patch.yml`（`config` 直接作为第二参数传入插件的 `apply`）：

```yaml
- id: enhance-prompt
  name: dsh-prompt-better
  config:
    followSessionModel: true   # 默认：跟随右侧模型选择器的当前选择
    timeoutMs: 120000          # 单次增强超时（毫秒）
    # 以下两项仅在需要“钉死”模型时才配（配置后不再跟随会话座位）
    # provider: deepseek-account
    # model: deepseek-flash
```

### 模型解析（默认跟随右侧座位）

增强调用哪个模型，按以下优先级解析：

1. **插件配置显式钉住**（`provider` / `model`）—— 仅当部署方主动配置时生效；
2. **当前会话在模型选择器里选中的模型** —— 默认行为（`followSessionModel: true`）；
3. **Host 默认模型**（`agentDefaultModel.currentSelection()`）—— 兜底。

第 2 项由 client 半在点击瞬间从 `ctx.modelDirectories.directoryFor(sessionId).store.getSnapshot().current` 读取（即右侧座位显示的那个 provider/model/reasoningEffort），随请求体 `{ text, selection }` 传给 Host。它来自 Host 的 `modelSelection` 会话投影，因此与界面显示严格一致 —— 切换即时生效，无需重启。

> 为什么不直接用 `agentDefaultModel.currentSelection()`：它读的是 profile 里 `agent-default-model` 条目的**静态配置**（`config.provider.get()` / `config.model.get()`），与用户在右侧选了什么无关 —— 这正是"模型被写死"的来源。

> 实现说明：本插件**刻意不导出 `Config`**。cordis 的 fiber 会对 `plugin.Config` 调用
> `Config["~standard"].validate(config)`，只有 schemastery schema 才有该字段；导出普通对象会
> 直接抛 `TypeError: Cannot read properties of undefined (reading 'validate')` 并让 fiber 无法激活。

## 位置与形态

- `conversation.input.right` 插槽（官方零占用），28px 图标钮，空草稿不渲染（零占位）
- `order: 20` 与其他插件按序共存，不重叠不挤压
- 三态一按钮：✨ 增强 → 转圈（点击=取消）→ ↺ 恢复原文

## 目录

```
src/prompts.ts          # 双 prompt 资产（系统策略 + 用户模板）
src/index.ts            # Host：EnhancePromptService（one-shot scoped agent）
src/client/index.tsx    # Client：slot 注册 + 状态机 + CAS 写回 + Revert
src/client/store.ts     # 会话级状态机
src/client/service.ts   # Typert Remote 贡献（手写 InvocationDescriptor）
src/client/spans.ts     # 草稿区间计算（引用 chip 保护）
src/client/styles.ts    # 样式注入（按钮 + 加载转圈）
scripts/build.mjs       # 两段式构建（tsc emit → esbuild bundle）
```

## 开发

```bash
pnpm install
pnpm build       # 构建
pnpm typecheck   # 类型检查
```

## 致谢

- [morluto/rea](https://github.com/morluto/rea)（REA）—— 本项目的逆向分析工具

## License

[MIT](./LICENSE)
