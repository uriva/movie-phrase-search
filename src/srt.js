import { contains, filter, lowercase, map, pipe, prop, replace } from "gamla";

import { default as srtParser2 } from "srt-parser-2";

export const parseSrt = (str) => {
  const result = new srtParser2.default().fromSrt(str);
  if (!result.length || result.find((entry) => entry.text.length > 500)) {
    console.error("ignoring malformatted srt file");
    return null;
  }
  return result;
};

const cleanText = pipe(
  lowercase,
  ...map((c) => replace(c, ""))(",!?.\"'-♪".split(""))
);

export const findPhraseInSrt = (text) =>
  filter(pipe(prop("text"), cleanText, contains(cleanText(text))));
