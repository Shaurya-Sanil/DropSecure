import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Canonical Domain Constants (Single source of truth across all frontend pages)
export const CONFIG = {
  STALE_THRESHOLD_HOURS: 24,
  EXPIRY_WINDOW_HOURS: 48,
  APP_VERSION: 'v1.4.0',
  BUILD_SHA: 'b373ae1',
  IS_DEMO_MODE: true, // Controlled via environment / configuration
};
