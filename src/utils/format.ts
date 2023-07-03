export function humanFormat(value: number): string {
  let formated: string;
  let suffix: string;

  if (value > 700_000) {
    formated = (value / 1_000_000).toFixed(1);
    suffix = 'M';
  } else if (value > 700) {
    formated = (value / 1_000).toFixed(1);
    suffix = 'K';
  } else {
    formated = value.toFixed(1);
    suffix = '';
  }

  const len = formated.length;

  if (formated[len - 1] === '0' && formated[len - 2] === '.') {
    formated = formated.substring(0, len - 2);
  }

  return `${formated}${suffix}`;
}
