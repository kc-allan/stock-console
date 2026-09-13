import { describe, expect, it } from 'vitest';
import { MAX_DELAY_MS, parseDelay } from './simulatedDelay';

describe('parseDelay', () => {
  it('reads a whole number of milliseconds', () => {
    expect(parseDelay('2000')).toBe(2000);
  });

  it('caps values above what the API accepts', () => {
    // DummyJSON rejects these with a 400 instead of capping them. Forwarding the raw value would
    // turn "slow" into every request failing.
    expect(parseDelay('9000')).toBe(MAX_DELAY_MS);
  });

  it.each([null, '', '0', '-500', '2.5', 'slow'])('treats %s as no delay', (raw) => {
    expect(parseDelay(raw)).toBe(0);
  });
});
