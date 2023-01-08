import { last, letIn, pipe, sideEffect } from "gamla";
import { mergeFiles, searchQuoteToString } from "./ffmpeg.js";

import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import fs from "fs";

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
          if (filenames.length > 5) {
            const merged = await mergeFiles(filenames);
            await success([merged]);
            fs.unlink(merged, () => {});
          } else {
            await success(filenames);
          }
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

const splitSentences = (s) => s.split(/\.\.\.|\.\s|\?\s/g);

export const parseParams = (input) => {
  const [quoteAndMovie, context] = input.replace(/"/g, "").split("context:");
  const separatorLocation = quoteAndMovie.includes("-")
    ? quoteAndMovie.indexOf("-")
    : quoteAndMovie.indexOf("\n");
  const movie = quoteAndMovie.slice(separatorLocation + 1).trim();
  const quote = quoteAndMovie.slice(0, separatorLocation).trim();
  const [startQuote, endQuote] = letIn(splitSentences(quote), (sentences) =>
    sentences.length === 1
      ? [sentences[0], null]
      : [sentences[0], last(sentences)],
  );
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
