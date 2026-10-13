export function createAuditClock(startedAt, deadline, timeoutMs) {
  let lastObserved = startedAt;
  return now => {
    const gap = now - lastObserved;
    lastObserved = now;
    if (now >= deadline) return { deadline: true };
    // A suspended or starved parent cannot establish that its worker was running during the gap.
    if (gap > 5000 || gap < 0) return { interrupted: true, gapMs: gap };
    if (now - startedAt >= timeoutMs) return { error: 'Game time limit exceeded' };
    return null;
  };
}
