export function shuffledTraversalMulberry<T>(
  random: () => number,
  items: T[],
): T[] {
  const { length } = items;
  const results = [...items];

  for (let i = 0; i < length; i++) {
    swap(results, i, Math.floor(random() * length));
  }
  return results;
}

function swap<T>(items: T[], index1: number, index2: number): void {
  const tmp = items[index1];
  items[index1] = items[index2];
  items[index2] = tmp;
}

// Based on https://stackoverflow.com/a/47593316
export function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
