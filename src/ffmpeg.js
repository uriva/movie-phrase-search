import { empty, log, map, pipe, second } from "gamla";

import ffmpeg from "fluent-ffmpeg";

const tempDir = "/tmp/";

const matchToFilename =
  ({ name, phrase }) =>
  ({ startTime, endTime }) =>
    `${name}-${phrase}-${startTime}-${endTime}.mp4`;

export const downloadMatchFromMp4Url =
  ({ bufferLeft, bufferRight }) =>
  (searchParams) =>
  ({ url }, { startSeconds, endSeconds, startTime, endTime }) =>
    new Promise((resolve) => {
      ffmpeg(url)
        .seekInput(startSeconds - bufferLeft)
        .duration(endSeconds - startSeconds + bufferLeft + bufferRight)
        .output(matchToFilename(searchParams)({ startTime, endTime }))
        .on("end", () => {
          console.log(`written match to file.`);
          resolve();
        })
        .on("error", console.error)
        .run();
    });

export const mergeMp4s =
  ({ name, phrase }) =>
  (matches) =>
    new Promise((resolve) => {
      if (empty(matches)) {
        resolve();
        return;
      }
      const merged = ffmpeg();
      matches
        .map(pipe(second, matchToFilename({ name, phrase })))
        .forEach((path) => merged.input(path));
      merged
        .on("end", () => {
          console.log("written combined to file");
          resolve();
        })
        .on("error", console.error)
        .mergeToFile(`${name}-${phrase}.mp4`, tempDir);
    });
