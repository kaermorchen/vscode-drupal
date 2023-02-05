import { FirstParam } from "../types";

type MixinBase = new (...args: any[]) => any;

type GetProps<TBase> = TBase extends new (props: infer P) => any ? P : never;
type GetInstance<TBase> = TBase extends new (...args: any[]) => infer I
  ? I
  : never;
type MergeCtor<A, B> = new (
  props: GetProps<A> & GetProps<B>
) => GetInstance<A> & GetInstance<B>;

class A {
  a: string;

  constructor(arg: { a: string }) {
    this.a = arg.a;
  }
}

function B<TBase extends MixinBase>(Base: TBase) {
  const Cls = class B extends Base {
    b: string;

    constructor(arg: { b: string }) {
      super(arg);

      this.b = arg.b;
    }
  };

  return Cls;
}

const Mix = B(A);

class C extends Mix {
  c: number;

  constructor(arg: FirstParam<typeof Mix> & { c: number }) {
    super(arg);

    this.c = arg.c;
  }
}

new C({ a: 'hello', b: 'wewr', c: 32 });
