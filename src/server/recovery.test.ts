// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cameFromRecentRecovery } from './recovery';

const NOW = 1_800_000_000;
describe('cameFromRecentRecovery', () => {
  it('accepts a recovery login from the last ten minutes', () => {
    expect(cameFromRecentRecovery([{ method: 'recovery', timestamp: NOW - 60 }], NOW)).toBe(true);
    expect(cameFromRecentRecovery([{ method: 'recovery', timestamp: NOW - 600 }], NOW)).toBe(true);
  });
  it('refuses an old one, a future one and a different method', () => {
    expect(cameFromRecentRecovery([{ method: 'recovery', timestamp: NOW - 601 }], NOW)).toBe(false);
    expect(cameFromRecentRecovery([{ method: 'recovery', timestamp: NOW + 31 }], NOW)).toBe(false);
    expect(cameFromRecentRecovery([{ method: 'recovery', timestamp: NOW + 5 }], NOW)).toBe(true); // a little clock skew is fine
    expect(cameFromRecentRecovery([{ method: 'password', timestamp: NOW }], NOW)).toBe(false);
  });
  it('refuses anything that is not a list of such entries', () => {
    for (const v of [undefined, null, 'recovery', {}, [null], ['recovery'], [{ method: 'recovery', timestamp: '1800000000' }], [{ method: 'recovery' }]]) expect(cameFromRecentRecovery(v, NOW)).toBe(false);
  });
  it('one good entry among others is enough', () => {
    expect(cameFromRecentRecovery([{ method: 'password', timestamp: 1 }, { method: 'recovery', timestamp: NOW }], NOW)).toBe(true);
  });
});
