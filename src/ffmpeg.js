import { empty, log, map, pipe, second } from "gamla";

import ffmpeg from "fluent-ffmpeg";

const tempDir = "/tmp/";

const matchToFilename =
  ({ name, phrase }) =>
  ({ startTime, endTime }) =>
    `${name}-${phrase}-${startTime}-${endTime}.mp4`;

const srtTimestampToSeconds = (srtTimestamp) => {
  const [rest, millisecondsString] = srtTimestamp.split(",");
  const milliseconds = parseInt(millisecondsString, 10);
  const [hours, minutes, seconds] = map((x) => parseInt(x))(rest.split(":"));
  return milliseconds * 0.001 + seconds + 60 * minutes + 3600 * hours;
};

export const downloadMatchFromMp4Url =
  ({ bufferLeft, bufferRight }) =>
  (searchParams) =>
  ({ url }, { startTime, endTime }) =>
    new Promise((resolve) => {
      ffmpeg(url)
        .seekInput(srtTimestampToSeconds(startTime) - bufferLeft)
        .duration(
          srtTimestampToSeconds(endTime) -
            srtTimestampToSeconds(startTime) +
            bufferLeft +
            bufferRight
        )
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
