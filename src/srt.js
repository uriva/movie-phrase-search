import { filter, log, map, pipe, product, prop } from "gamla";

import Fuse from "fuse.js";
import SrtParser from "srt-parser-2";
import { writeFileSync } from "fs";

export const parseSrt = (str) => {
  const result = new SrtParser().fromSrt(str);
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

const srtToSearch = (srt) => {
  const index = new Fuse(srt, {
    keys: ["text"],
    threshold: 0.1,
  });
  return (query) => index.search(query).map(prop("item"));
};

export const findPhraseInSrt =
  ({ phraseStart, phraseEnd, maxSpan }) =>
  (srt) => {
    const search = srtToSearch(srt);
    return phraseEnd
      ? pipe(
          product,
          filter(isValidEntryPair(maxSpan)),
          map(mergeEntries),
          log,
        )([search(phraseStart), search(phraseEnd)])
      : search(phraseStart);
  };
