import { expect, test } from 'bun:test';

test('speed of char find vs regex find #1', () => {
  const LOWER_LETTERS = /^[a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω]/;

  const isLowerLetter = (char: string) => {
    const code = char.charCodeAt(0);
    return (
      (code >= 97 && code <= 122) || // a-z
      (code >= 224 && code <= 255) || // à-ÿ
      (code >= 940 && code <= 974) // ά-ω
    );
  };

//   const text = 'thequickbrownfoxjumpsoverthelazydoòóôõög';
//   let t0 = performance.now();
//   for (let i = 0; i < 100; i++) {
//     for (const char of text) {
//       expect(LOWER_LETTERS.test(char)).toBeTrue();
//     }
//   }
//   let t1 = performance.now();
//   console.log('Regex test took', t1 - t0, 'milliseconds');

//   t0 = performance.now();
//   for (let i = 0; i < 100; i++) {
//     for (const char of text) {
//       expect(isLowerLetter(char)).toBeTrue();
//     }
//   }
//   t1 = performance.now();
//   console.log('Char test took', t1 - t0, 'milliseconds');
});
