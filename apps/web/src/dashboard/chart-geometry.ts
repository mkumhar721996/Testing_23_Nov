const PLOT = { left: 40, right: 30, top: 10, bottom: 30 };
const NICE_STEPS = [1, 2, 4, 8, 10];
const DONUT_RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Smallest "nice" value (1, 2, 4, 8 x a power of ten) at or above the peak, in minor units.
export function niceMax(peakMinor: number): number {
  if (peakMinor <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(peakMinor));
  const step = NICE_STEPS.find((s) => s * magnitude >= peakMinor) ?? 10;
  return step * magnitude;
}

export type PlotPoint = { x: number; y: number };

// Plots amounts into the SVG plot area; y grows downward, so the largest value sits at the top.
export function linePoints(
  points: { amountMinor: number }[],
  width: number,
  height: number,
): { points: PlotPoint[]; max: number } {
  const max = niceMax(Math.max(0, ...points.map((p) => p.amountMinor)));
  const plotWidth = width - PLOT.left - PLOT.right;
  const plotHeight = height - PLOT.top - PLOT.bottom;
  return {
    max,
    points: points.map((p, i) => ({
      x: round2(PLOT.left + (points.length > 1 ? (plotWidth * i) / (points.length - 1) : 0)),
      y: round2(PLOT.top + plotHeight * (1 - p.amountMinor / max)),
    })),
  };
}

export const PLOT_AREA = PLOT;

export function formatAxisAmount(amountMinor: number): string {
  const dollars = amountMinor / 100;
  if (dollars < 1000) return `$${Math.round(dollars)}`;
  return `$${Number((dollars / 1000).toFixed(1))}k`;
}

export type DonutSegment = { dash: number; offset: number };

export function donutSegments(shares: { percent: number }[]): DonutSegment[] {
  let used = 0;
  return shares.map(({ percent }) => {
    const dash = round2((CIRCUMFERENCE * percent) / 100);
    const segment = { dash, offset: used === 0 ? 0 : -used };
    used = round2(used + dash);
    return segment;
  });
}

export const DONUT = { radius: DONUT_RADIUS, circumference: round2(CIRCUMFERENCE) };
