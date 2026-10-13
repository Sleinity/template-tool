/** Compatibility CLI wrapper; the shared inventory/generator owns all delivery. */
import path from 'node:path';
import { generateDeliveryBundle } from '../release-delivery/bundle.mjs';
const [archives, output] = process.argv.slice(2);
if (!archives || !output) throw new Error('Usage: create-runtime-release-handoff.mjs ARCHIVES_DIRECTORY OUTPUT_DIRECTORY');
const mode = process.env.TEMPLATE_HANDOFF_MODE ?? 'local';
const manifest = await generateDeliveryBundle({ archivesDirectory: path.resolve(archives), outputDirectory: path.resolve(output), version: process.env.TEMPLATE_RUNTIME_RELEASE_VERSION, mode, provenance: process.env.TEMPLATE_HANDOFF_PROVENANCE ?? (mode === 'local' ? 'local-pack' : 'registry-download') });
console.log(`Created shared ${mode} handoff for SDK ${manifest.version}.`);
