// Dev helper: build a real { template, resolved } inputProps file for a quick
// Lambda render test, using the mock resolver (no DB needed).
import { writeFileSync } from 'node:fs';
import { STAT_DROP } from '../src/templates/examples';
import { mockResolver } from '../src/templates/engine/resolver';

(async () => {
  const resolved = await mockResolver.resolve(STAT_DROP, {});
  const props = { template: STAT_DROP, resolved, creatorHandle: '@you' };
  writeFileSync(new URL('./props.json', import.meta.url), JSON.stringify(props));
  console.log('wrote props.json');
})();
