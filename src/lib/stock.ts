// "Running low" is derived, not stored -- a stored flag could drift out of
// sync with the two numbers it's supposed to summarise. This is the one
// place that comparison happens, so admin and client views agree on it.
export function isRunningLow(level: { onHandQty: number; parQty: number }): boolean {
  return level.onHandQty < level.parQty;
}
