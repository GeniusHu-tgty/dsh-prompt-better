# DSH Prompt Better

**Make your prompts clearer with one click.** DSH Prompt Better adds an ✨ button beside the chat input. It rewrites your draft into a clearer, more specific prompt—then lets you restore the original whenever you want.

[English](README.md) · [简体中文](README.zh-CN.md)

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
