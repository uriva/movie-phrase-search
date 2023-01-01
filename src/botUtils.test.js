import { parseParams } from "./botUtils";

test("parseParams", () => {
  for (const [inp, out] of [
    [
      "\"i'll make him an offer he can't refuse...dad\" - the godfather\ncontext:0,0,15",
      {
        searchParams: {
          name: "the godfather",
          phraseStart: "i'll make him an offer he can't refuse",
          phraseEnd: "dad",
        },
        downloadParams: { bufferLeft: 0, bufferRight: 0, offset: 15 },
      },
    ],
    [
      '"i\'m going to enjoy watching you die"\nthe matrix 1999',
      {
        searchParams: {
          name: "the matrix 1999",
          phraseStart: "i'm going to enjoy watching you die",
          phraseEnd: null,
        },
        downloadParams: { bufferLeft: 0, bufferRight: 0, offset: 0 },
      },
    ],
    [
      "i can't believe it...you said it. - some movie",
      {
        searchParams: {
          name: "some movie",
          phraseStart: "i can't believe it",
          phraseEnd: "you said it.",
        },
        downloadParams: { bufferLeft: 0, bufferRight: 0, offset: 0 },
      },
    ],
  ]) {
    expect(parseParams(inp)).toEqual(out);
  }
});
