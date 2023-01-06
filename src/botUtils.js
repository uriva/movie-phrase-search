import { pipe, sideEffect } from "gamla";

import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import fs from "fs";
import { searchQuoteToString } from "./ffmpeg.js";

export const example =
  'It should look like this: "may the force be with you - star wars".';

export const botHelper = (onParams, success, failure) =>
  pipe(parseParams, sideEffect(onParams), async (params) => {
    const webTorrentClient = new WebTorrent();
    if (!params.searchParams.name || !params.searchParams.phraseStart) {
      failure(`I didn't understand the movie name or quote. ${example}`);
      return;
    }
    try {
      const matches = await findAndDownload({ ...params, webTorrentClient });
      if (matches.length) {
        const [filenames] = matches;
        if (filenames.length) {
          await success(filenames);
          for (const filename of filenames) fs.unlink(filename, () => {});
        } else {
          failure(
            `I found a video, but couldn't find the quote "${searchQuoteToString(
              params.searchParams,
            )}" in it.`,
          );
        }
      } else {
        failure(
          `I couldn't find the movie "${params.searchParams.name}". You can try adding the year, e.g. "the matrix 1999".`,
        );
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
    srt: {
      language: "en",
      limit: 1,
    },
    searchParams: {
      max: 1,
      name: movie,
      phraseStart: startQuote.trim(),
      phraseEnd: endQuote ? endQuote.trim() : null,
      maxSpan: 300,
    },
    downloadParams: {
      bufferLeft,
      bufferRight,
      offset,
    },
  };
};
