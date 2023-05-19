export function neverCall(x: never) {
  throw new Error('Invariant');
}

declare const brand: unique symbol;

export type Branded<T, Brand> = T & { [brand]: Brand };
