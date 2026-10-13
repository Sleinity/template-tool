import path from 'node:path';
import { generateDeliveryBundle, verifyDeliveryBundle } from './bundle.mjs';
const [command, ...args] = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
if (command === 'generate') {
  const archivesDirectory = option('--archives'), outputDirectory = option('--output');
  if (!archivesDirectory || !outputDirectory) throw new Error('generate requires --archives and --output');
  const manifest = await generateDeliveryBundle({ archivesDirectory: path.resolve(archivesDirectory), outputDirectory: path.resolve(outputDirectory), version: process.env.TEMPLATE_RUNTIME_RELEASE_VERSION, mode: option('--mode', 'local'), provenance: option('--provenance', 'local-pack') });
  console.log(`Generated ${manifest.files.length} delivery files and ${manifest.links.filter(l => l.kind === 'local-verified').length} verified local links for ${manifest.version}.`);
} else if (command === 'verify' || command === 'upload-paths') {
  const directory = args[0]; if (!directory) throw new Error(`${command} requires a bundle directory`);
  const { manifest, links } = await verifyDeliveryBundle(path.resolve(directory), { version: process.env.TEMPLATE_RUNTIME_RELEASE_VERSION });
  if (command === 'upload-paths') process.stdout.write(manifest.uploadFiles.map(f => path.join(directory, f)).join('\n') + '\n');
  else console.log(`Verified ${manifest.version} delivery: ${manifest.files.length} files, ${links.length} links; provenance ${manifest.provenance}.`);
} else throw new Error('Expected generate, verify or upload-paths');
