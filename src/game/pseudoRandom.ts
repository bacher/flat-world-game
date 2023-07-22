const INITIAL_OFFSET = 286583;

const RANDOM_96 = [
  70, 46, 54, 62, 14, 23, 72, 75, 55, 10, 13, 81, 91, 68, 94, 33, 4, 86, 42, 0,
  28, 32, 35, 40, 8, 66, 26, 50, 53, 44, 43, 93, 79, 25, 95, 60, 41, 21, 15, 11,
  51, 31, 27, 48, 47, 87, 64, 78, 84, 37, 17, 24, 20, 74, 9, 34, 82, 69, 65, 63,
  49, 73, 89, 52, 77, 2, 18, 61, 58, 85, 29, 16, 90, 57, 45, 5, 3, 83, 6, 92,
  56, 80, 59, 71, 38, 1, 7, 19, 88, 36, 30, 12, 67, 39, 22, 76,
];

const RANDOM_16 = [
  2.4954167976824393, 5.155124020423152, 4.169564054547106, 5.3938238477300064,
  7.516490373622229, 9.52669706943034, 2.219857030325787, 3.2585496844963124,
  5.448347184670379, 2.029162551685817, 2.845363544167563, 9.886150984981635,
  3.8919244258609065, 3.3339140374767195, 1.5768791672071392, 7.508110688977919,
];

const CHUNK_SIZE = RANDOM_96.length / RANDOM_16.length;
const INVERTED_CHUNK_SIZE = 1 / CHUNK_SIZE;

export function shuffledTraversal<T>(seed: number, items: T[]): T[] {
  const length = items.length;

  if (length > RANDOM_96.length) {
    // TODO:
    throw new Error();
  }

  const s = seed + INITIAL_OFFSET;
  const chunksOrder: number[] = [];

  const chunksCount = Math.ceil(items.length / CHUNK_SIZE);
  for (let i = 0; i < chunksCount; i += 1) {
    chunksOrder.push(i);
  }

  const random96offset = Math.floor(s * 764.32131) % 96;

  for (let i = 0; i < chunksOrder.length; i += 1) {
    const swapIndex = Math.floor(s * RANDOM_16[i]) % chunksOrder.length;

    if (i !== swapIndex) {
      const tmp = chunksOrder[i];
      chunksOrder[i] = chunksOrder[swapIndex];
      chunksOrder[swapIndex] = tmp;
    }
  }

  const results = [...items];

  for (let i = 0; i < length; i += 1) {
    const offset =
      chunksOrder[Math.floor(i * INVERTED_CHUNK_SIZE)] * CHUNK_SIZE;
    const index2 = getRandom96(random96offset + offset + i) % length;

    swap(results, i, index2);
  }

  return results;
}

function swap<T>(items: T[], index1: number, index2: number): void {
  const tmp = items[index1];
  items[index1] = items[index2];
  items[index2] = tmp;
}

function getRandom96(offset: number): number {
  if (offset >= 96) {
    offset = offset % 96;
  }
  return RANDOM_96[offset];
}
