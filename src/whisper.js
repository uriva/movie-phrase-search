import { enumerate, join, map, pipe, split } from "gamla";

import SrtParser from "srt-parser-2";
import { exec } from "child_process";

const match = (re) => (str) => re.exec(str);
const trim = (s) => s.trim();
export const parseWhisperOutput = pipe(
  trim,
  split("\n"),
  map(
    pipe(
      trim,
      match(/^\[(.*)\s-->\s(.*)\]\s+(.*)$/),
      ([_, start, end, text]) => `00:${start} --> 00:${end}\n${text}`,
    ),
  ),
  enumerate,
  map(([index, content]) => `${index + 1}\n${content}`),
  join("\n\n"),
  (str) => new SrtParser.default().fromSrt(str),
);

export const transcribe = (filename) =>
  new Promise((resolve, reject) =>
    exec(`whisper ${filename} --language en`, (error, stdout, stderr) => {
      resolve(parseWhisperOutput(stdout));
      console.error(stderr);
      if (error !== null) {
        console.error(error);
        reject();
      }
    }),
  );
