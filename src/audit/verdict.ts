export function verdictFor(score: number): string {
  if (score >= 80) return 'Easy for AI to read';
  if (score >= 50) return 'Some things to fix';
  return 'Hard for AI to read';
}

export function formatAgo(from: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - from) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}
