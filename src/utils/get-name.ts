import { Identifier } from 'php-parser';

export function getName(val: string | Identifier) {
  return typeof val === 'string' ? val : val.name;
}
