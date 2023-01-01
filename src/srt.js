import { filter, map, pipe, product, prop } from "gamla";

import Fuse from "fuse.js";
import SrtParser from "srt-parser-2";
import { writeFileSync } from "fs";

export const parseSrt = (str) => {
  const result = new SrtParser.default().fromSrt(str);
  if (!result.length || result.find((entry) => entry.text.length > 500)) {
    console.error(`ignoring malformatted srt file: ${str.slice(0, 500)}`);
    return null;
  }
  writeFileSync("./subs.srt", str);
  return result;
};

const mergeEntries = ([a, b]) => ({
  ...a,
  id: a.id + "->" + b.id,
  endTime: b.endTime,
  endSeconds: b.endSeconds,
  text: a.text + "->" + b.text,
});

const isValidEntryPair =
  (maxSpan) =>
  ([a, b]) =>
    maxSpan > b.startSeconds - a.startSeconds &&
    b.startSeconds - a.startSeconds > 0;

export const findPhraseInSrt = ({ phraseStart, phraseEnd, maxSpan }) =>
  pipe(
    (srt) =>
      new Fuse(srt, {
        keys: ["text"],
        threshold: 0.1,
        isCaseSensitive: false,
        ignoreLocation: true,
      }),
    (index) => (query) => index.search(query).map(prop("item")),
    (search) =>
      phraseEnd
        ? pipe(
            map(search),
            product,
            filter(isValidEntryPair(maxSpan)),
            map(mergeEntries),
          )([phraseStart, phraseEnd])
        : search(phraseStart),
  );
