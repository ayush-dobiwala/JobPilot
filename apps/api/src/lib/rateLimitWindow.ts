export function consumeRateLimit(
  timestamps: readonly number[],
  now: number,
  windowMs: number,
  max: number,
): { allowed: boolean; next: number[] } {
  const cutoff = now - windowMs;
  const recent = timestamps.filter((stamp) => stamp > cutoff);
  if (recent.length >= max) {
    return { allowed: false, next: recent };
  }
  return { allowed: true, next: [...recent, now] };
}
