import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const [directory, id, digest] = process.argv.slice(2);
assert(directory && /^\d+$/.test(id) && /^[a-f0-9]{64}$/.test(digest));
assert(process.env.GITHUB_RUN_ID && process.env.GITHUB_SHA);
await mkdir(directory, { recursive: true });
await writeFile(
  path.join(directory, 'retained-artifact.json'),
  JSON.stringify(
    {
      id: Number(id),
      name: 'sdk-1.0.0-certified-delivery',
      runId: Number(process.env.GITHUB_RUN_ID),
      headSha: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      digest: 'sha256:' + digest,
      prefix: '',
      retentionDays: 90,
    },
    null,
    2,
  ) + '\n',
);
