import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

try {
  const result = execSync('npx vitest run --reporter=json', { encoding: 'utf-8' });
  writeFileSync('test-run-result.json', result);
} catch (e) {
  writeFileSync('test-run-result.json', e.stdout);
}
