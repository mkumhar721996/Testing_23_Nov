import { describe, expect, it } from 'vitest';
import { greetingText, periodFor } from './greeting';

describe('greetingText', () => {
  const nineAm = new Date(2026, 10, 23, 9, 0);
  it('addresses the customer by name', () => {
    expect(greetingText(nineAm, 'Maya')).toBe('Good morning, Maya');
  });
  it('omits the name when null or blank', () => {
    expect(greetingText(nineAm, null)).toBe('Good morning');
    expect(greetingText(nineAm, '  ')).toBe('Good morning');
  });
});

describe('periodFor', () => {
  it.each([
    [5, 0, 'morning'],
    [11, 59, 'morning'],
    [12, 0, 'afternoon'],
    [16, 59, 'afternoon'],
    [17, 0, 'evening'],
    [4, 59, 'evening'],
  ])('%i:%i is %s', (h, m, p) => expect(periodFor(new Date(2026, 10, 23, h, m))).toBe(p));
});
