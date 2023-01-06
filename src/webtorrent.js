import {
  always,
  empty,
  filter,
  identity,
  ifElse,
  max,
  pipe,
  prop,
  when,
} from "gamla";

import chardet from "chardet";
import { parseSrt } from "./srt.js";
import { readFileSync } from "fs";
import { srtsForVideoFile } from "./openSubtitles.js";

export const torrentIdToTorrent = (webTorrentClient) => (torrentId) =>
  new Promise((resolve) => {
    webTorrentClient.add(torrentId, (torrent) => {
      resolve(torrent);
    });
  });

const chardetEncodingToBufferParameter = (chardetEncoding) =>
  ["ISO-8859-1", "ISO-8859-2", "windows-1252"].includes(chardetEncoding)
    ? "utf8"
    : chardetEncoding;

const downloadToStr = (file) =>
  new Promise((resolve) => {
    file.getBuffer((err, buffer) => {
      if (err) throw err;
      resolve(
        buffer.toString(
          chardetEncodingToBufferParameter(chardet.detect(buffer)),
        ),
      );
    });
  });

const findSuffix = (suffixes) =>
  pipe(
    prop("files"),
    filter(({ name }) =>
      suffixes.some((suffix) => name.endsWith(`.${suffix}`)),
    ),
    ifElse(empty, always(null), max(prop("length"))),
  );

const findVideoFile = findSuffix(["avi", "mp4", "mkv"]);

const torrentToServerHelper = (torrent, filename) => {
  const server = torrent.createServer();
  server.listen();
  return {
    url: `http://localhost:${server.address().port}/${torrent.files.indexOf(
      filename,
    )}`,
    server,
  };
};

export const torrentToServer = (torrent) =>
  torrentToServerHelper(torrent, findVideoFile(torrent));

const preExistingSrt = pipe(
  findSuffix(["srt"]),
  when(identity, pipe(downloadToStr, parseSrt)),
);

export const torrentToSrts = (params) => async (torrent) => {
  const srtWithin = await preExistingSrt(torrent);
  if (srtWithin) {
    console.log("found srt file within torrent, using it.");
    return [srtWithin];
  }
  if (params.path) {
    return [parseSrt(readFileSync(params.path).toString())];
  }
  const vid = findVideoFile(torrent);
  if (!vid) {
    console.error("no video file found in torrent");
    return [];
  }
  return srtsForVideoFile(params)(vid);
};
