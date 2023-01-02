import { findPhraseInSrt, parseSrt } from "./srt";
import { log, pipe } from "gamla";

import { readFileSync } from "fs";

test("findInSrt", () => {
  for (const [file, input, output] of [
    [
      "deconstructing-harry.srt",
      {
        phraseStart: "then one day",
        phraseEnd: "socially",
        maxSpan: 120,
      },
      [
        {
          endSeconds: 1652.739,
          endTime: "00:27:32,739",
          id: "598->606",
          startSeconds: 1630.7,
          startTime: "00:27:10,700",
          text: "<i>Then one day,</i>\n<i>the inevitable happened.</i>->then I think we could start\nto see each other socially.",
        },
      ],
    ],
    [
      "good-will-hunting.srt",
      {
        phraseStart: "i went on a date",
        phraseEnd: "time's up",
        maxSpan: 120,
      },
      [],
    ],
    [
      "good-will-hunting.srt",
      {
        phraseStart: "i went on a date",
        phraseEnd: "time's up",
        maxSpan: 300,
      },
      [
        {
          id: "717->767",
          startSeconds: 3345.133,
          endSeconds: 3528.316,
          startTime: "00:55:45,133",
          endTime: "00:58:48,316",
          text: "Yeah. I went on a date last week.->Time's up.",
        },
      ],
    ],
  ])
    pipe(
      readFileSync,
      (b) => b.toString(),
      parseSrt,
      log,
      findPhraseInSrt(input),
      (x) => expect(x).toEqual(output),
    )("./example-subs/" + file);
});
