// src/lib/concurrency.js
//
// Simple dependency-free concurrency limiter.
// Runs `items` through `worker` with at most `limit` running in parallel,
// instead of firing everything at once with Promise.all (which can exhaust
// memory / hit provider rate limits / blow serverless timeouts on large inputs).

export async function runWithConcurrencyLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    const currentIndex = nextIndex++;
    if (currentIndex >= items.length) return;
    results[currentIndex] = await worker(items[currentIndex], currentIndex);
    await runNext();
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => runNext()
  );
  await Promise.all(workers);

  return results;
}
