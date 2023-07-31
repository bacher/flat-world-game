export function removeArrayItem<T>(array: T[], item: T): void {
  const index = array.indexOf(item);

  if (index === -1) {
    console.warn('Trying to remove absent item');
    return;
  }

  array.splice(index, 1);
}

export function addToMapArray<K, V>(
  map: Map<K, V[]>,
  key: K,
  items: V[],
): void {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(...items);
}

export function addToMapSet<K, V>(
  map: Map<K, Set<V>>,
  key: K,
  items: V[],
): void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }

  for (const item of items) {
    set.add(item);
  }
}

export function areSetsIntersect<A>(set1: Set<A>, set2: Set<A>): boolean {
  for (const key of set1.values()) {
    if (set2.has(key)) {
      return true;
    }
  }
  return false;
}
