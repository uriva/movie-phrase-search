import { log, prop } from "gamla";

import Fuse from "fuse.js";
import SrtParser from "srt-parser-2";
import { writeFileSync } from "fs";

export const parseSrt = (str) => {
  const result = new SrtParser().fromSrt(str);
  if (!result.length || result.find((entry) => entry.text.length > 500)) {
    console.error(`ignoring malformatted srt file: ${str.slice(0, 500)}`);
    return null;
  }
  writeFileSync("./fg.srt", str);
  return result;
};

export const findPhraseInSrt = (query) => (srt) =>
  new Fuse(srt, {
    keys: ["text"],
    threshold: 0.5,
  })
    .search(query)
    .map(prop("item"));
