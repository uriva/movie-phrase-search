import { empty, equals, filter, head, juxt, log, map, pipe, prop } from "gamla";

import OpenSubtitles from "opensubtitles-api";
import TorrentSearchApi from "torrent-search-api";
import WebTorrent from "webtorrent";
import { computeHash } from "./openSubtitleHash.js";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import { default as srtParser2 } from "srt-parser-2";

const searchMagnet = async (movieName) => {
  TorrentSearchApi.enablePublicProviders();
  const results = await TorrentSearchApi.search(movieName, "Movies", 5);
  return TorrentSearchApi.getMagnet(results[0]);
};

const parseSrt = (str) => new srtParser2.default().fromSrt(str);

const findTimeForPhrase = (text) =>
  pipe(
    filter(pipe(prop("text"), equals(text))),
    head,
    juxt(prop("startTime"), prop("endTime"))
  );

const getSrtsForHashAndName = (query) => (movieHash) =>
  new OpenSubtitles({
    useragent: "UserAgent",
  })
    .search({
      query,
      movieHash,
      limit: 1,
    })
    .then(
      pipe(
        (x) => x["en"] || [],
        map(pipe(prop("url"), fetch, (r) => r.text(), parseSrt))
      )
    );

const selectRightFileIndex = (x) =>
  x.findIndex(({ name }) => name.endsWith("mp4"));

const selectRightFile = (files) => files[selectRightFileIndex(files)];

const magnetToFiles = (magnet) =>
  new Promise((resolve) => {
    new WebTorrent().add(magnet, ({ files }) => {
      resolve(files);
    });
  });

const makeServer = (magnetURI) =>
  new Promise((resolve) => {
    const client = new WebTorrent();
    const port = 3333;
    client.add(magnetURI, (torrent) => {
      const server = torrent.createServer();
      server.listen(port);
      resolve(
        `http://localhost:${port}/${selectRightFileIndex(torrent.files)}`
      );
    });
  });

const downloadChunk = async (url, start, duration, output) => {
  ffmpeg(url)
    .seekInput(start)
    .duration(duration)
    .output(output)
    .on("end", () => {
      console.log("Finished processing");
    })
    .run();
};

const srtTimestampToSeconds = (srtTimestamp) => {
  const [rest, millisecondsString] = srtTimestamp.split(",");
  const milliseconds = parseInt(millisecondsString, 10);
  const [hours, minutes, seconds] = map((x) => parseInt(x))(rest.split(":"));
  return milliseconds * 0.001 + seconds + 60 * minutes + 3600 * hours;
};

const main = async (phrase, movieName) => {
  const [servingUrl, timeRangesFound] = await pipe(
    searchMagnet,
    juxt(
      makeServer,
      pipe(
        magnetToFiles,
        selectRightFile,
        computeHash,
        getSrtsForHashAndName(movieName),
        map(findTimeForPhrase(phrase))
      )
    )
  )(movieName);
  if (empty(timeRangesFound)) {
    console.error("no srts found");
    return;
  }
  let [start, end] = head(timeRangesFound);
  await downloadChunk(
    servingUrl,
    srtTimestampToSeconds(start),
    srtTimestampToSeconds(end) - srtTimestampToSeconds(start),
    "./output.mp4"
  );
  console.log("all done!");
};

main("Cobb?", "inception");
