export function setHash(
  hash: string | undefined,
  options?: { replace: boolean },
): void {
  if (options?.replace) {
    window.location.replace(
      window.location.pathname +
        window.location.search +
        (hash ? `#${hash}` : ''),
    );
  } else {
    window.location.hash = `#${hash}`;
  }
}
