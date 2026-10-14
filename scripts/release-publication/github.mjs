import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { repository } from './candidate.mjs';
export function github(route, { binary = false, accept } = {}) {
  return execFileSync(
    process.env.SDK_GH_EXECUTABLE ?? 'gh',
    [
      'api',
      `repos/${repository}${route ? '/' + route : ''}`,
      ...(accept ? ['-H', 'Accept: ' + accept] : []),
    ],
    { encoding: binary ? undefined : 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
}
export function githubJson(route) {
  return JSON.parse(github(route));
}
export function assertEnvironment(environment, policies) {
  const approval = environment.protection_rules?.find(
    (r) => r.type === 'required_reviewers',
  );
  assert(
    approval?.reviewers?.some(
      (r) => r.type === 'User' && r.reviewer?.login === 'Sleinity',
    ),
    'Sleinity must approve release deployment',
  );
  assert.equal(
    approval.prevent_self_review,
    false,
    'Release owner must be able to approve their own authored release',
  );
  assert.equal(
    environment.deployment_branch_policy?.custom_branch_policies,
    true,
  );
  const rules = policies.branch_policies ?? [];
  assert(rules.some((r) => r.name === 'sdk-v1.0.0' && r.type === 'tag'));
  assert(rules.some((r) => r.name === 'main' && r.type === 'branch'));
  assert.equal(rules.length, 2, 'Unexpected release deployment ref');
}
export function preflightGithub() {
  const repo = githubJson('');
  assert.equal(repo.visibility, 'public');
  assertEnvironment(
    githubJson('environments/private-sdk-release'),
    githubJson('environments/private-sdk-release/deployment-branch-policies'),
  );
  return {
    repository,
    visibility: repo.visibility,
    environment: 'private-sdk-release',
    humanApprovalRequired: true,
    automaticApproval: false,
  };
}
