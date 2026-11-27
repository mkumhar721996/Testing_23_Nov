import { describe, expect, it } from 'vitest';
import { donutSegments, formatAxisAmount, linePoints } from './chart-geometry';

describe('donutSegments', () => {
  it('produces cumulative offsets that fill the circle', () => {
    const segs = donutSegments([{ percent: 35 }, { percent: 28 }, { percent: 22 }, { percent: 15 }]);
    expect(segs[0]).toEqual({ dash: 87.96, offset: 0 });
    expect(segs[1].offset).toBeCloseTo(-87.96, 1);
    expect(segs[2].offset).toBeCloseTo(-158.33, 1);
    expect(segs.reduce((s, x) => s + x.dash, 0)).toBeCloseTo(251.33, 1);
  });
});

describe('linePoints', () => {
  it('keeps every point inside the plot area and rounds the scale up', () => {
    const { points, max } = linePoints(
      [{ amountMinor: 32000 }, { amountMinor: 63500 }, { amountMinor: 45000 }],
      380,
      160,
    );
    expect(max).toBe(80000);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(40);
      expect(p.x).toBeLessThanOrEqual(350);
      expect(p.y).toBeGreaterThanOrEqual(10);
      expect(p.y).toBeLessThanOrEqual(130);
    }
    expect(points[0].x).toBe(40);
    expect(points[2].x).toBe(350);
    expect(points[1].y).toBeLessThan(points[0].y);
  });

  it('handles a single point and all-zero values', () => {
    expect(linePoints([{ amountMinor: 0 }], 380, 160).points[0]).toEqual({ x: 40, y: 130 });
  });
});

describe('formatAxisAmount', () => {
  it('abbreviates thousands', () => {
    expect(formatAxisAmount(63500)).toBe('$635');
    expect(formatAxisAmount(1690000)).toBe('$16.9k');
    expect(formatAxisAmount(15800000)).toBe('$158k');
    expect(formatAxisAmount(0)).toBe('$0');
  });
});
