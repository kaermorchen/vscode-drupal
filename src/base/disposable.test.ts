import assert from "assert/strict";
import { describe, it } from "mocha";
import { Disposable as IDisposable } from "vscode";
import { Disposable } from "./disposable";

class MockDisposable implements IDisposable {
  disposed = false;
  dispose(): void {
    this.disposed = true;
  }
}

describe("src/base/disposable", () => {
  it("should initialize with empty disposables", () => {
    const disposable = new Disposable();
    assert.deepEqual(disposable.disposables, []);
  });

  it("should add disposables to the list", () => {
    const disposable = new Disposable();
    const mock = new MockDisposable();
    disposable.disposables.push(mock);
    assert.equal(disposable.disposables.length, 1);
    assert.equal(disposable.disposables[0], mock);
  });

  it("should dispose all disposables when dispose is called", () => {
    const disposable = new Disposable();
    const mock1 = new MockDisposable();
    const mock2 = new MockDisposable();
    disposable.disposables.push(mock1, mock2);

    assert.equal(mock1.disposed, false);
    assert.equal(mock2.disposed, false);

    disposable.dispose();

    assert.equal(mock1.disposed, true);
    assert.equal(mock2.disposed, true);
  });

  it("should not throw when disposables is empty", () => {
    const disposable = new Disposable();
    assert.doesNotThrow(() => disposable.dispose());
  });
});
