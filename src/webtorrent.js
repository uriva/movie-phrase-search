import {
  always,
  empty,
  filter,
  ifElse,
  log,
  max,
  pipe,
  prop,
  sideEffect,
} from "gamla";

import chardet from "chardet";
import { parseMagnet } from "parse-magnet-uri";
import { parseSrt } from "./srt.js";
import { readFileSync } from "fs";
import { srtsForVideoFile } from "./openSubtitles.js";

export const magnetToTorrent = (webTorrentClient) => (magnet) =>
  new Promise((resolve) => {
    webTorrentClient.add(
      sideEffect((magnet) =>
        console.log(`fetching torrent ${parseMagnet(magnet).name}...`)
      )(magnet),
      async (torrent) => {
        resolve(torrent);
      }
    );
  });

const chardetEncodingToBufferParameter = (chardetEncoding) =>
  chardetEncoding === "windows-1252" ? "utf8" : chardetEncoding;

const downloadToStr = (file) =>
  new Promise((resolve) => {
    file.getBuffer((err, buffer) => {
      if (err) throw err;
      resolve(
        buffer.toString(
          chardetEncodingToBufferParameter(chardet.detect(buffer))
        )
      );
    });
  });

const findSuffix = (suffix) =>
  pipe(
    prop("files"),
    filter(({ name }) => name.endsWith(`.${suffix}`)),
    ifElse(empty, always(null), max(prop("length")))
  );

export const torrentToServer = (torrent) =>
  new Promise((resolve) => {
    const server = torrent.createServer();
    server.listen();
    resolve({
      url: `http://localhost:${server.address().port}/${torrent.files.indexOf(
        findSuffix("mp4")(torrent)
      )}`,
      server,
    });
  });

export const torrentToSrts = (params) => async (torrent) => {
  const srtWithinFile = findSuffix("srt")(torrent);
  const srtWithin =
    srtWithinFile && parseSrt(await downloadToStr(srtWithinFile));
  if (srtWithin) {
    console.log("found srt file within torrent, using it.");
    return [srtWithin];
  }
  if (params.path) {
    return [parseSrt(readFileSync(params.path).toString())];
  }
  const vid = findSuffix("mp4")(torrent);
  if (!vid) {
    console.error("no video file found in torrent");
    return [];
  }
  return srtsForVideoFile(params)(vid);
};
