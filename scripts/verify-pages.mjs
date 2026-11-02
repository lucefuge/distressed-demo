import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = '/distressed-demo/';
const html = await fs.readFile('dist/index.html', 'utf8');
const entries = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
assert.ok(entries.length >= 2, 'Production JS and CSS must exist');
for (const entry of entries) {
  assert.ok(entry.startsWith(base), `Wrong Pages base: ${entry}`);
  await fs.access(path.join('dist', entry.slice(base.length)));
}
const assets = await fs.readdir('dist/assets');
for (const name of assets.filter(file => file.endsWith('.js'))) {
  const text = await fs.readFile(path.join('dist/assets', name), 'utf8');
  assert.doesNotMatch(text, /localhost|127\.0\.0\.1|distressedone/, 'No local backend or real seller link in public bundle');
  assert.ok(text.includes('Неофициальный демонстрационный концепт'));
}
await fs.access('dist/.nojekyll');
const photos = (await fs.readdir('dist/products')).map(name => `products/${name}`);
// .nojekyll is a build marker, not a public resource. Pages artifact upload
// may intentionally omit dotfiles; an Actions deployment does not run Jekyll.
const resources = ['', ...entries.map(entry => entry.slice(base.length)), 'distressed-logo.png', 'distressed-wordmark.png', ...photos];
if (process.argv[2]) {
  const origin = new URL(process.argv[2]);
  for (const resource of resources) {
    const response = await fetch(new URL(base + resource, origin), {signal: AbortSignal.timeout(10000)});
    assert.equal(response.status, 200, resource || base);
    await response.arrayBuffer();
  }
}
console.log(`Pages verified: base ${base}, ${entries.length} entry assets, ${photos.length} photos${process.argv[2] ? `; ${resources.length} HTTP checks passed` : ''}.`);
