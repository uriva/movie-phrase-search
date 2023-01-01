import { pipe, sideEffect } from "gamla";

import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import fs from "fs";

const example =
  'It should look like this: "may the force be with you - star wars".';

export const botHelper = (onParams, success, failure) =>
  pipe(parseParams, sideEffect(onParams), async (params) => {
    const webTorrentClient = new WebTorrent();
    if (!params.searchParams.name || !params.searchParams.phraseStart) {
      failure(`I didn't understand the movie name or quote. ${example}`);
      return;
    }
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

export const parseParams = (input) => {
  const [quote, context] = input.replace(/"/g, "").split("context:");
  const separatorLocation = quote.includes("-")
    ? quote.indexOf("-")
    : quote.indexOf("\n");
  const movie = quote.slice(separatorLocation + 1).trim();
  const [startQuote, endQuote] = quote.slice(0, separatorLocation).split("...");
  const [bufferLeft, bufferRight, offset] = (context || "0,0,0")
    .trim()
    .split(",")
    .map(Number);
  return {
    searchParams: {
      name: movie,
      phraseStart: startQuote.trim(),
      phraseEnd: endQuote ? endQuote.trim() : null,
    },
    downloadParams: {
      bufferLeft,
      bufferRight,
      offset,
    },
  };
};
