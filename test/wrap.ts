//
// Usage: import { testing } from './wrap.ts';
// const { test, expect } = await testing;
//
type TestFn = () => void | Promise<void>;
type ExpectFn = (actual: any) => { toBe: (expected: any) => void };

const isBun = typeof Bun !== 'undefined';
const isDeno = typeof Deno !== 'undefined';

// Promise to resolve test and expect functions
let testFn: (name: string, fn: TestFn) => void = () => {};
let expectFn: ExpectFn;

// Initialize the wrapper asynchronously
const init = async (): Promise<{ test: typeof testFn; expect: typeof expectFn }> => {
  if (isBun) {
    const { test: bunTest, expect: bunExpect } = await import('bun:test');
    testFn = bunTest;
    expectFn = bunExpect;
  } else if (isDeno) {
      const { expect: denoExpect } = await import('jsr:@std/expect');
      expectFn = denoExpect;
      testFn = Deno.test;
  } else {
    throw new Error('Unsupported runtime: Neither Bun nor Deno detected.');
  }
  return { test: testFn, expect: expectFn };
};

// Export a promise that resolves to the test and expect functions
export const testing = init();
