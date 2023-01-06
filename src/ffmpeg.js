import ffmpeg from "fluent-ffmpeg";
import { letIn } from "gamla";

export const searchQuoteToString = ({ phraseStart, phraseEnd }) =>
  phraseStart + (phraseEnd ? "->" + phraseEnd : "");

const prefix = ({ name, phraseStart, phraseEnd }) =>
  `${name || "auto-detected"}-${searchQuoteToString({
    phraseStart,
    phraseEnd,
  })}`;

const matchToFilename =
  (params) =>
  ({ startTime, endTime }) =>
    `${prefix(params)}-${startTime}-${endTime}.mp4`;

export const downloadMatchFromMp4Url =
  ({ bufferLeft, bufferRight, offset }) =>
  (searchParams) =>
  (url) =>
  ({ startSeconds, endSeconds, startTime, endTime }) =>
    letIn(
      matchToFilename(searchParams)({ startTime, endTime }),
      (outputFilename) =>
        new Promise((resolve) => {
          ffmpeg(url)
            .seekInput(startSeconds - bufferLeft + offset)
            .duration(endSeconds - startSeconds + bufferLeft + bufferRight)
            // Whatsapp/telegram compatibility flags.
            .outputOptions([
              "-c:v libx264",
              "-profile:v baseline",
              "-level 3.0",
              "-pix_fmt yuv420p",
            ])
            .output(outputFilename)
            .on("end", () => {
              console.log(`written match to file: ${outputFilename}`);
              resolve(outputFilename);
            })
            .on("error", console.error)
            .run();
        }),
    );
const tempDir = "/tmp/";
export const mergeFiles = (matches) =>
  new Promise((resolve, reject) => {
    const filename = (Math.random() + 1).toString(36).substring(2) + ".mp4";
    const merged = ffmpeg();
    matches.forEach((path) => merged.input(path));
    merged
      .on("end", () => {
        resolve(filename);
      })
      .on("error", reject)
      .mergeToFile(filename, tempDir);
  });
