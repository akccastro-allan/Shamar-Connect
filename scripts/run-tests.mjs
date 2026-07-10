import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function collectTests(dir) {
  const entries = readdirSync(dir);
  const tests = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) tests.push(...collectTests(path));
    else if (/\.test\.ts$/.test(entry)) tests.push(path);
  }

  return tests;
}

const filters = process.argv.slice(2);
const allTests = collectTests('lib');
const selectedTests = filters.length
  ? allTests.filter(path => filters.some(filter => path.includes(filter)))
  : allTests;

if (selectedTests.length === 0) {
  console.error(`No tests matched: ${filters.join(', ')}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--test', ...selectedTests],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
