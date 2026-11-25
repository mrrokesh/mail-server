import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { tokens } from './index';

test('CSS custom properties include the locked light and dark brand colours', () => {
  const cssPath = new URL('./tokens.css', import.meta.url);
  const css = readFileSync(cssPath, 'utf8').toLowerCase();
  for (const hex of [tokens.color.light.brand, tokens.color.dark.brand, tokens.color.light.bg]) {
    assert.ok(css.includes(hex.toLowerCase()), `tokens.css missing ${hex}`);
  }
  assert.match(css, /--font-heading:\s*'satoshi'/);
  assert.match(css, /--font-body:\s*'inter'/);
  assert.match(css, /--space-1:\s*4px/);
  assert.match(css, /--radius-card:\s*20px/);
});

test('spacing scale is the 4pt sequence from the brief', () => {
  assert.deepEqual(Object.values(tokens.space), [4, 8, 12, 16, 24, 32, 48, 64, 96, 128]);
});
