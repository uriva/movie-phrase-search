import { pipe, sideEffect, split } from "gamla";

import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import fs from "fs";

export const botHelper = (onParams, success, failure) =>
  pipe(parseParams, sideEffect(onParams), async (params) => {
    const webTorrentClient = new WebTorrent();
    try {
      const filename = await findAndDownload({ ...params, webTorrentClient });
      if (filename) {
        await success(filename);
        fs.unlink(filename, () => {});
      } else {
        failure();
      }
    } catch (e) {
      console.error(e);
    }
    webTorrentClient.destroy();
  });

const parseParams = pipe(
  split("\n"),
  ([name, phraseStart, phraseEnd, offset, bufferLeft, bufferRight]) => ({
    searchParams: {
      name,
      phraseStart,
      phraseEnd,
      maxSpan: 120,
    },
    srt: {
      language: "en",
      limit: 1,
    },
    downloadParams: {
      limit: 2,
      offset: offset ? parseFloat(offset) : 0,
      bufferLeft: bufferLeft ? parseFloat(bufferLeft) : 0,
      bufferRight: bufferRight ? parseFloat(bufferRight) : 0,
    },
  }),
);