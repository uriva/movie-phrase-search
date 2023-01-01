import { parseParams } from "./botUtils";

test("parseParams", () => {
  for (const [inp, out] of [
    [
      "\"i'll make him an offer he can't refuse...dad\" - the godfather\ncontext:0,0,15",
      {
        movie: "the godfather",
        startQuote: "i'll make him an offer he can't refuse",
        endQuote: "dad",
        bufferLeft: 0,
        bufferRight: 0,
        offset: 15,
      },
    ],
    [
      "i can't believe it...you said it. - some movie",
      {
        movie: "some movie",
        startQuote: "i can't believe it",
        endQuote: "you said it.",
        bufferLeft: 0,
        bufferRight: 0,
        offset: 0,
      },
    ],
  ]) {
    expect(parseParams(inp)).toEqual(out);
  }
});
