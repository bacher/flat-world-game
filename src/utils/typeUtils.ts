export function neverCall(_: never, silence?: boolean) {
  if (!silence) {
    throw new Error('Invariant');
  }
}

declare const brand: unique symbol;

export type Branded<T, Brand> = T & { [brand]: Brand };
