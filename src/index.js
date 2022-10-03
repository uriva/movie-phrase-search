import {
  contains,
  explode,
  filter,
  juxt,
  log,
  lowercase,
  map,
  mapCat,
  pipe,
  prop,
  replace,
  sideEffect,
  spread,
  take,
} from "gamla";

import OpenSubtitles from "opensubtitles-api";
import TorrentSearchApi from "torrent-search-api";
import WebTorrent from "webtorrent";
import { computeHash } from "./openSubtitleHash.js";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import { parseMagnet } from "parse-magnet-uri";
import { default as srtParser2 } from "srt-parser-2";

const searchMagnets =
  ({ maxResults, medium }) =>
  async (movieName) => {
    TorrentSearchApi.enablePublicProviders();
    return map(async (x) => {
      return await TorrentSearchApi.getMagnet(x);
    })(await TorrentSearchApi.search(movieName, medium, maxResults));
  };

const parseSrt = (str) => new srtParser2.default().fromSrt(str);

const cleanText = pipe(
  lowercase,
  ...map((c) => replace(c, ""))(",!?.\"'-♪".split(""))
);

const findPhrase = (text) =>
  filter(pipe(prop("text"), cleanText, contains(cleanText(text))));

const getSrtsForHashAndName =
  ({ query, imdbid }) =>
  (movieHash) =>
    new OpenSubtitles({
      useragent: "UserAgent",
    })
      .search({
        imdbid,
        query,
        movieHash,
        limit: 10,
      })
      .then(
        pipe(
          (x) => x["en"] || [],
          map(pipe(prop("url"), fetch, (r) => r.text(), parseSrt))
        )
      );

const filePredicate = ({ name }) =>
  name.endsWith("mp4") || name.endsWith("mkv");

const magnetToFiles = (magnet) =>
  new Promise((resolve) => {
    new WebTorrent().add(magnet, ({ files }) => {
      resolve(files);
    });
  });

const randomPort = () => Math.floor(1000 + Math.random() * 9000);

const makeServer = (magnet) =>
  new Promise((resolve) => {
    const client = new WebTorrent();
    client.add(magnet, async (torrent) => {
      const port = randomPort();
      torrent.createServer().listen(port);
      resolve(
        `http://localhost:${port}/${torrent.files.findIndex(filePredicate)}`
      );
    });
  });

const downloadChunk = async (url, { start, duration, id }) => {
  ffmpeg(url)
    .seekInput(start)
    .duration(duration)
    .output(`${id}.mp4`)
    .on("end", () => {
      console.log(`written file ${id}`);
    })
    .run();
};

const srtTimestampToSeconds = (srtTimestamp) => {
  const [rest, millisecondsString] = srtTimestamp.split(",");
  const milliseconds = parseInt(millisecondsString, 10);
  const [hours, minutes, seconds] = map((x) => parseInt(x))(rest.split(":"));
  return milliseconds * 0.001 + seconds + 60 * minutes + 3600 * hours;
};

const findTimeRanges =
  ({
    name,
    imdbid,
    phrase,
    maxSrtsPerFile,
    maxMatchesPerSrt,
    bufferLeft,
    bufferRight,
  }) =>
  (magnet) =>
    pipe(
      sideEffect(() => console.log(`fetching metadata...`)),
      magnetToFiles,
      (files) => files.find(filePredicate),
      sideEffect(() => console.log(`computing hash...`)),
      computeHash,
      getSrtsForHashAndName({ query: name, imdbid }),
      sideEffect((x) => console.log(`found ${x.length} srt files`)),
      take(maxSrtsPerFile),
      mapCat(findPhrase(phrase)),
      log,
      sideEffect((x) => console.log(`found ${x.length} occurrences`)),
      map(({ startTime, endTime }) => ({
        id: `./${
          parseMagnet(magnet).name
        }-${name}-${phrase}-${startTime}-${endTime}`,
        start: srtTimestampToSeconds(startTime) - bufferLeft,
        duration:
          srtTimestampToSeconds(endTime) +
          bufferRight -
          (srtTimestampToSeconds(startTime) - bufferLeft),
      })),
      take(maxMatchesPerSrt)
    )(magnet);

const main = async ({ name, magnet, matcher }) =>
  pipe(
    searchMagnets(magnet),
    sideEffect((x) => console.log(`found ${x.length} magnet links`)),
    map(
      pipe(
        juxt(makeServer, findTimeRanges({ ...matcher, name })),
        explode(1),
        map(spread(downloadChunk))
      )
    )
  )(name);

main({
  name: "inception",
  magnet: { maxResults: 1, medium: "Movies" },
  matcher: {
    phrase: "mr cobb",
    medium: "Movies",
    // imdbid: "tt7768848",
    maxSrtsPerFile: 1,
    maxMatchesPerSrt: 10,
    bufferLeft: 0,
    bufferRight: 0,
  },
});
