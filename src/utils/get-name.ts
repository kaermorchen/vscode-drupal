import { Identifier } from "php-parser";

export default function getName(val: string | Identifier) {
  return typeof val === 'string' ? val : val.name;
}
