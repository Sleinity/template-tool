import assert from 'node:assert/strict';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from './candidate.mjs';

export async function runTrain({
  descriptor,
  archives,
  registry,
  journalFile,
  sourceCommit,
  write = false,
}) {
  const identity = {
    version: descriptor.version,
    candidate: descriptor.candidate,
    sourceCommit,
    archives: descriptor.archives,
  };
  let journal = {
    schemaVersion: 'sdk-publication-journal-v1',
    identity,
    packages: [],
    complete: false,
  };
  try {
    journal = JSON.parse(await readFile(journalFile, 'utf8'));
    assert.deepEqual(
      journal.identity,
      identity,
      'Journal belongs to a different release',
    );
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const save = async () => {
    await mkdir(path.dirname(journalFile), { recursive: true });
    await writeFile(
      journalFile + '.tmp',
      JSON.stringify(journal, null, 2) + '\n',
    );
    await rename(journalFile + '.tmp', journalFile);
  };
  assert.equal(journal.schemaVersion, 'sdk-publication-journal-v1');
  assert.equal(
    new Set(journal.packages.map((p) => p.name)).size,
    journal.packages.length,
    'Duplicate journal entry',
  );
  assert(
    journal.packages.every((p) =>
      descriptor.archives.some((a) => a.name === p.name),
    ),
    'Unexpected journal package',
  );
  journal.complete = false;
  await save();
  const verify = async (row, state) => {
    assert.equal(state.state, 'present');
    const bytes = await registry.download(state);
    assert.equal(
      bytes.length,
      row.bytes,
      `Conflicting published length: ${row.name}`,
    );
    assert.equal(
      sha256(bytes),
      row.sha256,
      `Conflicting published bytes: ${row.name}`,
    );
    return 'verified';
  };
  for (const row of descriptor.archives) {
    let record = journal.packages.find((p) => p.name === row.name);
    if (!record) {
      record = { name: row.name, status: 'unchecked' };
      journal.packages.push(record);
    }
    try {
      const state = await registry.inspect(row.name, descriptor.version);
      assert(
        ['present', 'missing'].includes(state.state),
        'Registry outcome unavailable',
      );
      if (state.state === 'present') {
        await verify(row, state);
        record.status = 'already-published';
        delete record.failure;
        await save();
        continue;
      }
      if (
        [
          'publishing',
          'uncertain',
          'verification-pending',
          'published',
          'already-published',
        ].includes(record.status)
      )
        throw Error(
          `Publication outcome unresolved for ${row.name}; retry verification after checking registry state`,
        );
      if (!write) {
        record.status = 'would-publish';
        await save();
        continue;
      }
      assert(
        typeof registry.publish === 'function',
        'Write adapter unavailable',
      );
      record.status = 'publishing';
      await save();
      try {
        await registry.publish(path.join(archives, row.file), row);
      } catch (e) {
        record.status = 'uncertain';
        throw Error(
          `Publication outcome uncertain for ${row.name}; verify before retrying`,
          { cause: e },
        );
      }
      record.status = 'verification-pending';
      await save();
      await verify(row, await registry.inspect(row.name, descriptor.version));
      record.status = 'published';
      await save();
    } catch (e) {
      record.failure = {
        name: e.name,
        message: e.message.startsWith('Publication outcome')
          ? e.message
          : 'Release operation failed; inspect registry access or package identity',
      };
      await save();
      throw e;
    }
  }
  journal.complete = true;
  await save();
  return journal;
}
export async function protectReleaseAssets(expected, existing, readExisting) {
  const actions = [];
  for (const row of expected) {
    const match = existing.filter((a) => a.name === row.file);
    assert(match.length <= 1, 'Duplicate release asset');
    if (!match.length) {
      actions.push({ file: row.file, action: 'upload' });
      continue;
    }
    assert.equal(
      sha256(await readExisting(match[0])),
      row.sha256,
      `Conflicting release asset: ${row.file}`,
    );
    actions.push({ file: row.file, action: 'skip' });
  }
  return actions;
}

/** Failed publication reports must distinguish accepted writes from unresolved attempts. */
export function publicationOutcomes(journal) {
  return {
    confirmed: (journal?.packages ?? [])
      .filter((p) => p.status === 'published')
      .map((p) => ({ package: p.name, operation: 'publish' })),
    uncertain: (journal?.packages ?? [])
      .filter((p) =>
        ['publishing', 'uncertain', 'verification-pending'].includes(p.status),
      )
      .map((p) => ({ package: p.name, status: p.status })),
  };
}
