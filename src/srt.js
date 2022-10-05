import { contains, filter, lowercase, map, pipe, prop, replace } from "gamla";

import SrtParser from "srt-parser-2";

export const parseSrt = (str) => {
  const result = new SrtParser().fromSrt(str);
  if (!result.length || result.find((entry) => entry.text.length > 500)) {
    console.error(`ignoring malformatted srt file: ${str.slice(0, 500)}`);
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
