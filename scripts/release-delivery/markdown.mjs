/** Delivery-only Markdown inspection. Never imported by runtime SDK bundles. */
import path from 'node:path';
import { readFile, realpath, stat } from 'node:fs/promises';

function prose(source) {
  // Preserve offsets while excluding fenced/indented code and inline code.
  let fence = null, offset = 0; const chars = source.split('');
  for (const match of source.matchAll(/<!--[\s\S]*?-->/g)) for (let i=match.index;i<match.index+match[0].length;i++) if(source[i]!=='\n') chars[i]=' ';
  for (const line of source.split(/(?<=\n)/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    const code = Boolean(fence) || Boolean(marker) || /^(?: {4}|\t)/.test(line);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
    }
    if (code) for (let i = offset; i < offset + line.length; i++) if (source[i] !== '\n') chars[i] = ' ';
    offset += line.length;
  }
  return chars.join('');
}
function labelKey(value) { return value.replace(/\\([\[\]\\])/g, '$1').trim().replace(/\s+/g, ' ').toLowerCase(); }
function destination(source, start, definition = false) {
  let p = start; while (/\s/.test(source[p] ?? '') && p < source.length) p++;
  if (source[p] === '<') {
    const end = source.indexOf('>', p + 1); if (end < 0) throw new Error('Unclosed Markdown link destination');
    return { start: p + 1, end, target: source.slice(p + 1, end) };
  }
  const first = p; let depth = 0;
  while (p < source.length) {
    const c = source[p];
    if (c === '\\' && p + 1 < source.length) { p += 2; continue; }
    if (c === '(') depth++;
    if (c === ')') { if (depth === 0) break; depth--; }
    if (/\s/.test(c) && depth === 0) break;
    p++;
  }
  if (p === first && !definition) return { start: first, end: first, target: '' };
  return { start: first, end: p, target: source.slice(first, p).replace(/\\([()\\])/g, '$1') };
}
function closingBracket(source, start) {
  let depth = 1;
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '[') depth++;
    if (source[i] === ']' && --depth === 0) return i;
  }
  return -1;
}
export function markdownLinks(source) {
  const text = prose(source), definitions = new Map(), links = [], occupied = [];
  for (const match of text.matchAll(/^ {0,3}\[([^\]\n]+)\]:[ \t]*/gm)) {
    const item = destination(text, match.index + match[0].length, true);
    const key = labelKey(match[1]); if (!definitions.has(key)) { definitions.set(key, item); links.push({ ...item, kind: 'reference-definition' }); }
    occupied.push([match.index, text.indexOf('\n', match.index) < 0 ? text.length : text.indexOf('\n', match.index)]);
  }
  for (let p = 0; p < text.length; p++) {
    if (occupied.some(([a, b]) => p >= a && p < b)) continue;
    if (text[p] === '\\') { p++; continue; }
    if (text[p] === '`') { const run = text.slice(p).match(/^`+/)[0]; const end = text.indexOf(run, p + run.length); if (end >= 0) p = end + run.length - 1; continue; }
    if (text[p] !== '[') continue;
    const end = closingBracket(text, p); if (end < 0) continue;
    const label = text.slice(p + 1, end), next = text[end + 1];
    if (next === '(') { links.push({ ...destination(text, end + 2), kind: text[p - 1] === '!' ? 'image' : 'inline' }); p = end; }
    else if (next === '[') {
      const refEnd = closingBracket(text, end + 1); if (refEnd < 0) throw new Error('Unclosed Markdown reference');
      const key = labelKey(text.slice(end + 2, refEnd) || label);
      if (!definitions.has(key)) throw new Error(`Undefined Markdown reference: ${key}`);
      p = refEnd;
    } else p = end;
  }
  const html = text.replace(/(`+)([\s\S]*?)\1/g, match=>' '.repeat(match.length));
  for (const tag of html.matchAll(/<[a-z][^>]*>/gi)) for (const attribute of tag[0].matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)) {
    const start=tag.index+attribute.index+attribute[0].indexOf(attribute[1])+1;
    links.push({start,end:start+attribute[2].length,target:attribute[2],kind:'html'});
  }
  return links;
}
function headingText(value) {
  return value.replace(/(`+)(.*?)\1/g, (_m,_ticks,code)=>code.replace(/[<>]/g,'' )).replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/`+/g, '').replace(/\*+/g, '').replace(/(^|\s)_([^_]+)_(?=$|\s)/g, '$1$2');
}
export function githubHeadingSlug(value) {
  return headingText(value).toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '').replace(/[\uFE00-\uFE0F]/g, '').replace(/ /g, '-');
}
export function markdownAnchors(source) {
  const text = prose(source), anchors = new Set(), slugs = new Set();
  const html = text.replace(/(`+)([\s\S]*?)\1/g, m=>' '.repeat(m.length));
  for (const match of html.matchAll(/<[a-z][^>]*\b(?:id|name)\s*=\s*["']([^"']+)["'][^>]*>/gi)) anchors.add(match[1]);
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const atx = lines[i].match(/^ {0,3}#{1,6}(?:\s+|$)(.*?)(?:\s+#+\s*)?$/);
    const setext = i + 1 < lines.length && /^ {0,3}(?:=+|-+)\s*$/.test(lines[i + 1]) && lines[i].trim() && !/^[>#*\-]/.test(lines[i]);
    if (!atx && !setext) continue;
    const base = githubHeadingSlug(atx ? atx[1] : lines[i].trim()); let slug = base, n = 0;
    while (slugs.has(slug)) slug = `${base}-${++n}`;
    slugs.add(slug); anchors.add(slug); if (setext) i++;
  }
  return anchors;
}
export function splitTarget(target) {
  if (/^(?:https?:|mailto:|data:)/i.test(target)) return { external: true, target };
  if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')) throw new Error(`Unsupported link scheme: ${target}`);
  const hash = target.indexOf('#'), file = hash < 0 ? target : target.slice(0, hash), fragment = hash < 0 ? null : target.slice(hash + 1);
  try { return { external: false, file: decodeURIComponent(file), fragment: fragment === null ? null : decodeURIComponent(fragment), rawFragment: hash < 0 ? '' : target.slice(hash) }; }
  catch { throw new Error(`Invalid encoded link: ${target}`); }
}
export function validateInventory(inventory) {
  const sources = new Set(), outputs = new Set();
  for (const item of inventory) {
    if (!item.source || path.posix.isAbsolute(item.source) || item.source.split('/').includes('..')) throw new Error('Unsafe inventory source');
    if (!item.file || path.basename(item.file) !== item.file || /[\r\n\\]/.test(item.file)) throw new Error('Unsafe inventory output');
    if (sources.has(item.source) || outputs.has(item.file.toLowerCase())) throw new Error(`Inventory collision: ${item.source}/${item.file}`);
    sources.add(item.source); outputs.add(item.file.toLowerCase());
  }
}
export function rewriteMarkdown(source, item, inventory) {
  const mapping = new Map(inventory.map(i => [i.source, i.file])); let next = source;
  for (const link of markdownLinks(source).sort((a, b) => b.start - a.start)) {
    const target = splitTarget(link.target); if (target.external || !target.file) continue;
    if (target.file.includes('\\') || path.posix.isAbsolute(target.file)) throw new Error(`Absolute/invalid source link: ${link.target}`);
    const sourceTarget = path.posix.normalize(path.posix.join(path.posix.dirname(item.source), target.file));
    const output = mapping.get(sourceTarget); if (!output) throw new Error(`Unmapped local reference: ${item.source} -> ${link.target}`);
    next = next.slice(0, link.start) + encodeURI(output).replace(/#/g, '%23') + target.rawFragment + next.slice(link.end);
  }
  return next;
}
export async function validateBundleLinks(directory, files) {
  const root = await realpath(directory), rows = [], cache = new Map();
  for (const file of files.filter(f => f.endsWith('.md'))) {
    const source = await readFile(path.join(root, file), 'utf8');
    for (const link of markdownLinks(source)) {
      const target = splitTarget(link.target); if (target.external) { rows.push({ file, target: link.target, kind: 'external-unchecked' }); continue; }
      const resolved = path.resolve(root, path.dirname(file), target.file || path.basename(file));
      if (target.file.includes('\\') || path.isAbsolute(target.file) || !resolved.startsWith(root + path.sep)) throw new Error(`Bundle link escapes directory: ${file} -> ${link.target}`);
      let real; try { real = await realpath(resolved); } catch { throw new Error(`Missing bundle file: ${file} -> ${link.target}`); }
      if (!real.startsWith(root + path.sep) || !(await stat(real)).isFile()) throw new Error(`Unsafe bundle target: ${link.target}`);
      if (target.fragment) {
        if (!cache.has(real)) cache.set(real, markdownAnchors(await readFile(real, 'utf8')));
        if (!cache.get(real).has(target.fragment)) throw new Error(`Missing bundle anchor: ${file} -> ${link.target}`);
      }
      rows.push({ file, target: link.target, kind: 'local-verified' });
    }
  }
  return rows;
}
