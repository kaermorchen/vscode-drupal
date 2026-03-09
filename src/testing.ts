type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

interface Spy<TArgs extends any[], TReturn> {
  calls: TArgs[];
  results: TReturn[];
  restore: () => void;
}

export function spyOn<T, K extends MethodNames<T>>(
  obj: T,
  methodName: K,
): Spy<
  T[K] extends (...args: infer A) => any ? A : never,
  T[K] extends (...args: any[]) => infer R ? R : never
> {
  const originalMethod = obj[methodName] as unknown as (...args: any[]) => any;
  const calls: any[] = [];
  const results: any[] = [];

  const spyMethod = function (this: any, ...args: any[]) {
    calls.push(args);
    const result = originalMethod.apply(this, args);
    results.push(result);
    return result;
  };

  obj[methodName] = spyMethod as any;

  return {
    calls,
    results,
    restore: () => {
      obj[methodName] = originalMethod as any;
    },
  };
}
