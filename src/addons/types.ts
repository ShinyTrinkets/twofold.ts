export type TwoFoldAddon = {
  name: string;
  preEval?: Function;
  postEval?: Function;
  preChildren?: Function;
};

// Custom error to ignore the next eval
export class IgnoreNext extends Error {
  constructor(message: any) {
    super(message);
    this.name = 'IgnoreNext';
  }
}
