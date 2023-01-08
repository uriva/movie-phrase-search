import { parseParams } from "./botUtils";

test("parseParams", () => {
  for (const [inp, out] of [
    [
      "Have you ever fucked on cocaine, Nick? It's nice. You like playing games don't you? - basic instinct",
      {
        searchParams: {
          max: 1,
          maxSpan: 300,
          name: "basic instinct",
          phraseStart: "Have you ever fucked on cocaine, Nick",
          phraseEnd: "You like playing games don't you?",
        },
        srt: { language: "en", limit: 1 },
        downloadParams: { bufferLeft: 0, bufferRight: 0, offset: 0 },
      },
    ],
    [
      "\"i'll make him an offer he can't refuse...dad\" - the godfather\ncontext:0,0,15",
      {
        searchParams: {
          max: 1,
          maxSpan: 300,
          name: "the godfather",
          phraseStart: "i'll make him an offer he can't refuse",
          phraseEnd: "dad",
        },
        srt: { language: "en", limit: 1 },
        downloadParams: { bufferLeft: 0, bufferRight: 0, offset: 15 },
      },
    ],
    [
      '"i\'m going to enjoy watching you die"\nthe matrix 1999',
      {
        searchParams: {
          max: 1,
          maxSpan: 300,
          name: "the matrix 1999",
          phraseStart: "i'm going to enjoy watching you die",
          phraseEnd: null,
        },
        srt: { language: "en", limit: 1 },
        downloadParams: { bufferLeft: 0, bufferRight: 0, offset: 0 },
      },
    ],
    [
      "i can't believe it...you said it. - some movie",
      {
        searchParams: {
          max: 1,
          maxSpan: 300,
          name: "some movie",
          phraseStart: "i can't believe it",
          phraseEnd: "you said it.",
        },
        srt: { language: "en", limit: 1 },
        downloadParams: { bufferLeft: 0, bufferRight: 0, offset: 0 },
      },
    ],
  ]) {
    expect(parseParams(inp)).toEqual(out);
  }
});
