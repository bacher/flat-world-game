export function removeArrayItem<T>(array: T[], item: T): void {
  const index = array.indexOf(item);

  if (index === -1) {
    console.warn('Trying to remove absent item');
    return;
  }

  array.splice(index, 1);
}
