/**
 * Deterministic content rotation helpers.
 * Content reshuffles on a fixed cadence (default every 3 hours) so every user
 * sees the same rotation within a window, and it changes predictably over time.
 */

export const ROTATION_HOURS = 3;

/** Current rotation slot — increments every ROTATION_HOURS hours. */
export function rotationSeed(hours: number = ROTATION_HOURS): number {
  return Math.floor(Date.now() / (hours * 60 * 60 * 1000));
}

/** Milliseconds until the next rotation window begins. */
export function msUntilNextRotation(hours: number = ROTATION_HOURS): number {
  const window = hours * 60 * 60 * 1000;
  return window - (Date.now() % window);
}

/** Human readable countdown, e.g. "2h 14m". */
export function nextRotationLabel(hours: number = ROTATION_HOURS): string {
  const ms = msUntilNextRotation(hours);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates shuffle — stable for a given seed. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Shuffle using the current rotation window as the seed. */
export function rotate<T>(items: T[] | null | undefined, offset = 0, hours: number = ROTATION_HOURS): T[] {
  if (!items || items.length === 0) return [];
  return seededShuffle(items, rotationSeed(hours) + offset);
}
