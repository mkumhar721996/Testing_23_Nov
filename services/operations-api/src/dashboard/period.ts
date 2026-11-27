import { BadRequestException } from '@nestjs/common';
import type { Period } from './dashboard.types';

const PERIODS: readonly Period[] = ['weekly', 'monthly', 'yearly'];

// No default: a missing or unknown period is a client error, so a label can never show the wrong data.
export function parsePeriod(raw?: string): Period {
  if (PERIODS.includes(raw as Period)) return raw as Period;
  throw new BadRequestException('period must be one of weekly, monthly or yearly');
}
