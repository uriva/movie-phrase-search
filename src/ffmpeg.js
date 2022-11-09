import { empty, log, map, pipe, second } from "gamla";

import ffmpeg from "fluent-ffmpeg";

const tempDir = "/tmp/";

const prefix = ({ name, phrase }) => `${name || "auto-detected"}-${phrase}`;

const matchToFilename =
  (params) =>
  ({ startTime, endTime }) =>
    `${prefix(params)}-${startTime}-${endTime}.mp4`;

export const downloadMatchFromMp4Url =
  ({ bufferLeft, bufferRight }) =>
  (searchParams) =>
  ({ url }, { startSeconds, endSeconds, startTime, endTime }) =>
    new Promise((resolve) => {
      ffmpeg(url)
        .seekInput(startSeconds - bufferLeft)
        .duration(endSeconds - startSeconds + bufferLeft + bufferRight)
        .outputOptions("-crf 28")
        .output(matchToFilename(searchParams)({ startTime, endTime }))
        .on("end", () => {
          console.log(`written match to file.`);
          resolve();
        })
        .on("error", console.error)
        .run();
    });

export const mergeMp4s = (params) => (matches) =>
  new Promise((resolve) => {
    if (empty(matches)) {
      resolve();
      return;
    }
    const merged = ffmpeg();
    matches
      .map(pipe(second, matchToFilename(params)))
      .forEach((path) => merged.input(path));
    merged
      .on("end", () => {
        console.log("written combined to file");
        resolve();
      })
      .on("error", console.error)
      .mergeToFile(`${prefix(params)}.mp4`, tempDir);
  });
