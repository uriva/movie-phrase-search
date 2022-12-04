import { findPhraseInSrt, parseSrt } from "./srt";
import { log, pipe } from "gamla";

import { readFileSync } from "fs";

test("findInSrt", () => {
  pipe(
    readFileSync,
    (b) => b.toString(),
    parseSrt,
    log,
    findPhraseInSrt({
      phraseStart: "then one day",
      phraseEnd: "socially",
      maxSpan: 120,
    }),
    (x) =>
      expect(x).toEqual([
        {
          endSeconds: 1652.739,
          endTime: "00:27:32,739",
          id: "598->606",
          startSeconds: 1630.7,
          startTime: "00:27:10,700",
          text: "<i>Then one day,</i>\n<i>the inevitable happened.</i>->then I think we could start\nto see each other socially.",
        },
      ]),
  )("./example-subs/deconstructing-harry.srt");
});
