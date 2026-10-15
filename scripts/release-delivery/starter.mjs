/** Build a deterministic standalone host archive; never include private inputs. */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
export const starterName = 'SDK-HOST-STARTER.zip';
const hash = b => createHash('sha256').update(b).digest('hex');
export async function createStarter(root, archives, version) {
  const sourceRoot = path.join(root, 'examples/template-editor-integration');
  const files = {}, sources = [];
  // ZIP stores local clock digits without a time zone; fix those digits, not a UTC instant.
  const add = (name, bytes) => { files[name] = [new Uint8Array(bytes), { mtime: new Date(2020, 0, 1) }]; };
  async function copy(relative) {
    const bytes = await readFile(path.join(sourceRoot, relative)); add(relative, bytes);
    sources.push({ source: 'examples/template-editor-integration/' + relative, file: relative, sha256: hash(bytes) });
  }
  for (const name of ['index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts']) await copy(name);
  for (const entry of (await readdir(path.join(sourceRoot, 'src'))).sort()) {
    if (!/\.(tsx?|css)$/.test(entry) || /\.test\./.test(entry)) throw new Error('Unexpected starter source: ' + entry);
    await copy('src/' + entry);
  }
  const sdk = Object.fromEntries(archives.map(a => [a.name, `file:vendor/${a.file}`]));
  const installed = async name => JSON.parse(await readFile(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
  const deps = { ...sdk, react: await installed('react'), 'react-dom': await installed('react-dom') };
  const dev = {};
  for (const name of ['@types/react', '@types/react-dom', '@vitejs/plugin-react', 'typescript', 'vite']) dev[name] = await installed(name);
  add('package.json', strToU8(JSON.stringify({ name: 'template-sdk-host-starter', version, private: true, type: 'module', scripts: { dev: 'vite --host 127.0.0.1', build: 'tsc -b && vite build', preview: 'vite preview --host 127.0.0.1' }, dependencies: deps, devDependencies: dev }, null, 2) + '\n'));
  add('pnpm-workspace.yaml', strToU8(`packages:\n  - .\nallowBuilds:\n  esbuild: true\noverrides:\n${Object.entries(sdk).map(([k,v]) => `  "${k}": "${v}"`).join('\n')}\n`));
  add('.gitignore', strToU8('node_modules/\ndist/\n*.tsbuildinfo\n'));
  add('vendor/.gitkeep', new Uint8Array());
  add('README.md', strToU8(`# Template SDK ${version} host starter\n\nFor Sleinity-owned applications. This is host-owned example code, not an SDK UI package.\n\n1. Verify the delivery checksums. Copy its three SDK tarballs into vendor/.\n2. Choose npm install or pnpm install, then npm run dev or pnpm dev.\n3. Import one exporter 0.6.1 ZIP, or several for a Family. Bring authorized exact fonts when requested.\n4. Edit and Reset fields, select Family designs, Save template, then reopen Fresh or Resume.\n5. Recovery autosave is this host's 650 ms policy. Correct incomplete inputs before changing work/exporting.\n6. PNG requires current renderer readiness; a cleanup failure offers cleanup-only Retry.\n\nRun npm run build (or pnpm build) before integration. Read SDK-QUICKSTART.md, SDK-HOST-IMPLEMENTATION.md, SDK-FEATURES.md and SDK-HOST-LIFECYCLE.md from the parent delivery. No private ZIP/font inputs, registry credential, Studio import or source alias is required. Keep a single manager lockfile in your application.\n`));
  const bytes = Buffer.from(zipSync(files, { level: 9 }));
  return { bytes, record: { file: starterName, classification: 'starter', bytes: bytes.length, sha256: hash(bytes), sources } };
}
