//
// Usage: import { testing } from './wrap.ts';
// const { test, expect } = await testing;
//

const isBun = typeof Bun !== 'undefined';
const isDeno = typeof Deno !== 'undefined';

// Initialize the wrapper asynchronously
const init = async (): Promise<any> => {
  if (isBun) {
    const BunTest = await import('bun:test');
    const test = BunTest.test;
    const expect = BunTest.expect;
    const describe = BunTest.describe;
    const beforeAll = BunTest.beforeAll;
    const afterAll = BunTest.afterAll;
    // const beforeEach = BunTest.beforeEach;
    // const afterEach = BunTest.afterEach;
    return { test, expect, describe, beforeAll, afterAll };
  } else if (isDeno) {
    const test = Deno.test;
    const bdd = await import('jsr:@std/testing/bdd');
    const DenoTest = await import('jsr:@std/expect');
    const expect = DenoTest.expect;
    const describe = bdd.describe;
    const beforeAll = bdd.beforeAll;
    const afterAll = bdd.afterAll;
    // const beforeEach = bdd.beforeEach;
    // const afterEach = bdd.afterEach;
    return { test, expect, describe, beforeAll, afterAll };
  } else {
    throw new Error('Unsupported runtime: Neither Bun nor Deno detected.');
  }
};

// Export a promise that resolves to the test and expect functions
export const testing = init();
