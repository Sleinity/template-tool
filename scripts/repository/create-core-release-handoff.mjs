/** Compatibility CLI wrapper; no independent Core documentation inventory. */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { generateDeliveryBundle, archivePackageManifest } from '../release-delivery/bundle.mjs';
const [archive, output] = process.argv.slice(2);
if (!archive || !output) throw new Error('Usage: create-core-release-handoff.mjs ARCHIVE OUTPUT_DIRECTORY');
const actual = archivePackageManifest(await readFile(archive));
if (actual.name !== '@sleinity/template-core') throw new Error('Expected a Core archive');
const mode = process.env.TEMPLATE_HANDOFF_MODE ?? 'local';
const manifest = await generateDeliveryBundle({ scope: 'core', archivesDirectory: path.dirname(path.resolve(archive)), outputDirectory: path.resolve(output), version: process.env.TEMPLATE_CORE_RELEASE_VERSION ?? actual.version, mode, provenance: process.env.TEMPLATE_HANDOFF_PROVENANCE ?? (mode === 'local' ? 'local-pack' : 'registry-download') });
console.log(`Created shared Core/runtime handoff for SDK ${manifest.version}.`);
