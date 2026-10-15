#!/usr/bin/env node
/**
 * 两段式构建（零工作区依赖，纯 npm/pnpm 包）：
 *  1) tsc -p tsconfig.build.json → tsc-out/（standard decorators 由 tsc 转换）
 *  2) esbuild bundle：
 *     - host:  tsc-out/index.js        → lib/index.js  (ESM, node24)
 *     - client: tsc-out/client/index.js → lib/client.js (factory-form CJS, chrome130)
 *
 * 所有 @deepseek-ai/* 与 react 系依赖保持 external —— 运行时由 DSH 安装供给。
 */
import { execSync } from 'node:child_process'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(root, '..')
const CLIENT_ID = 'dsh-prompt-better'

const tscBin = join(pkgRoot, 'node_modules/typescript/bin/tsc')
console.log('[1/3] tsc emit…')
execSync(JSON.stringify(process.execPath) + ' ' + JSON.stringify(tscBin) + ' -p tsconfig.build.json', { cwd: pkgRoot, stdio: 'inherit' })

const external = [
  '@deepseek-ai/*', 'cordis', '@cordis*',
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'zod',
]

mkdirSync(join(pkgRoot, 'lib'), { recursive: true })

console.log('[2/3] esbuild host…')
await build({
  entryPoints: [join(pkgRoot, 'tsc-out/index.js')],
  outfile: join(pkgRoot, 'lib/index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external,
  sourcemap: false,
  logLevel: 'info',
})

console.log('[3/3] esbuild client…')
const clientOut = join(pkgRoot, '.client-tmp')
await build({
  entryPoints: [join(pkgRoot, 'tsc-out/client/index.js')],
  outdir: clientOut,
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'chrome130',
  external,
  sourcemap: 'external',
  logLevel: 'info',
})
const js = readFileSync(join(clientOut, 'index.js'), 'utf8')
const mapPath = join(clientOut, 'index.js.map')
const map = existsSync(mapPath) ? readFileSync(mapPath, 'utf8') : undefined
// 注：map 为字符串（readFileSync），非 esbuild OutputFile 对象

const banner = 'window.__ModuleLoader__.load({\n' +
  '\tid: ' + JSON.stringify(CLIENT_ID) + ',\n' +
  '\tfactory: (require) => {\n' +
  '\t\tvar module = { exports: {} };\n' +
  '\t\tvar exports = module.exports;\n' +
  '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n'
const footer = '\t\treturn module.exports;\n\t},\n});\n//# sourceMappingURL=client.js.map'

writeFileSync(join(pkgRoot, 'lib/client.js'), banner + js + '\n' + footer)
if (map !== undefined) writeFileSync(join(pkgRoot, 'lib/client.js.map'), map)
rmSync(clientOut, { recursive: true, force: true })
rmSync(join(pkgRoot, 'tsc-out'), { recursive: true, force: true })
console.log('build done: lib/index.js + lib/client.js')