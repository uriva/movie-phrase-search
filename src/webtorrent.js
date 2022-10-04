import {
  always,
  complement,
  empty,
  filter,
  ifElse,
  max,
  pipe,
  prop,
  sideEffect,
} from "gamla";

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

const downloadToStr = (file) =>
  new Promise((resolve) => {
    file.getBuffer((err, buffer) => {
      if (err) throw err;
      resolve(buffer.toString());
    });
  });

const videoFilePredicate = ({ name }) =>
  name.endsWith("mp4") || name.endsWith("mkv");

const srtFilePredicate = ({ name }) => name.endsWith("srt");

const findSrtInFiles = pipe(
  filter(srtFilePredicate),
  ifElse(empty, always(null), max(prop("length")))
);

const assert = (condition, text) =>
  sideEffect((x) => {
    if (!condition(x)) throw text;
  });

const resolveVideoFile = pipe(
  prop("files"),
  assert(complement(empty), "fatal error: no video files in torrent"),
  filter(videoFilePredicate),
  max(prop("length"))
);

const randomPort = () => Math.floor(1000 + Math.random() * 9000);

export const torrentToServer = (torrent) =>
  new Promise((resolve) => {
    const port = randomPort();
    const server = torrent.createServer();
    server.listen(port);
    resolve({
      url: `http://localhost:${port}/${torrent.files.indexOf(
        resolveVideoFile(torrent)
      )}`,
      server,
    });
  });

export const torrentToSrts = (params) => async (torrent) => {
  const { files } = torrent;
  const srtWithinFile = findSrtInFiles(files);
  const srtWithin =
    srtWithinFile && parseSrt(await downloadToStr(srtWithinFile));
  if (srtWithin) {
    return [srtWithin];
  }
  if (params.path) {
    return [parseSrt(readFileSync(params.path).toString())];
  }
  return srtsForVideoFile(params)(resolveVideoFile(files));
};
