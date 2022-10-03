import {
  contains,
  explode,
  filter,
  head,
  juxt,
  log,
  logWith,
  lowercase,
  map,
  mapCat,
  pipe,
  prop,
  replace,
  sideEffect,
  spread,
  take,
  unique,
} from "gamla";

import OpenSubtitles from "opensubtitles-api";
import TorrentSearchApi from "torrent-search-api";
import WebTorrent from "webtorrent";
import { computeHash } from "./openSubtitleHash.js";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import { parseMagnet } from "parse-magnet-uri";
import { default as srtParser2 } from "srt-parser-2";

TorrentSearchApi.enablePublicProviders();
const searchMagnets = ({ maxResults, medium }) =>
  pipe(
    (movieName) => TorrentSearchApi.search(movieName, medium, maxResults),
    map(async (x) => await TorrentSearchApi.getMagnet(x)),
    unique(pipe(parseMagnet, prop("infoHash")))
  );

const parseSrt = (str) => {
  const result = new srtParser2.default().fromSrt(str);
  if (!result.length || result.find((entry) => entry.text.length > 500)) {
    console.error("ignoring malformatted srt file");
    return null;
  }
  return result;
};

const cleanText = pipe(
  lowercase,
  ...map((c) => replace(c, ""))(",!?.\"'-♪".split(""))
);

const findPhrase = (text) =>
  filter(pipe(prop("text"), cleanText, contains(cleanText(text))));

const getSrtsForHashAndName =
  ({ query, imdbid, limit }) =>
  (movieHash) =>
    new OpenSubtitles({
      useragent: "UserAgent",
    })
      .search({
        imdbid,
        query,
        movieHash,
        limit,
      })
      .then(
        pipe(
          (x) => x["en"] || [],
          map(pipe(prop("url"), fetch, (r) => r.text(), parseSrt)),
          filter((x) => x)
        )
      );

const videoFilePredicate = ({ name }) =>
  name.endsWith("mp4") || name.endsWith("mkv");

const randomPort = () => Math.floor(1000 + Math.random() * 9000);

const makeServer = (torrent) =>
  new Promise((resolve) => {
    const port = randomPort();
    const server = torrent.createServer();
    server.listen(port);
    resolve({
      url: `http://localhost:${port}/${torrent.files.findIndex(filePredicate)}`,
      server,
    });
  });

const downloadChunk = ({ url }, { start, duration, id }) =>
  new Promise((resolve) => {
    ffmpeg(url)
      .seekInput(start)
      .duration(duration)
      .output(`${id}.mp4`)
      .on("end", () => {
        console.log(`written file ${id}`);
        resolve();
      })
      .run();
  });

const srtTimestampToSeconds = (srtTimestamp) => {
  const [rest, millisecondsString] = srtTimestamp.split(",");
  const milliseconds = parseInt(millisecondsString, 10);
  const [hours, minutes, seconds] = map((x) => parseInt(x))(rest.split(":"));
  return milliseconds * 0.001 + seconds + 60 * minutes + 3600 * hours;
};

const findTimeRanges =
  ({
    query,
    imdbid,
    phrase,
    maxSrtsPerFile,
    maxMatchesPerSrt,
    bufferLeft,
    bufferRight,
  }) =>
  ([torrentName, videoFile]) =>
    pipe(
      sideEffect(() => console.log(`computing hash...`)),
      computeHash,
      getSrtsForHashAndName({ limit: maxSrtsPerFile, query, imdbid }),
      sideEffect((x) => console.log(`found ${x.length} srt files`)),
      take(maxSrtsPerFile),
      mapCat(findPhrase(phrase)),
      sideEffect((x) => console.log(`found ${x.length} occurrences`)),
      map(({ startTime, endTime }) => ({
        id: `./${torrentName}-${phrase}-${startTime}-${endTime}`,
        start: srtTimestampToSeconds(startTime) - bufferLeft,
        duration:
          srtTimestampToSeconds(endTime) +
          bufferRight -
          (srtTimestampToSeconds(startTime) - bufferLeft),
      })),
      take(maxMatchesPerSrt)
    )(videoFile);

const awaitSideEffect = (f) => async (x) => {
  await f(x);
  return x;
};

const magnetToTorrent = (webTorrentClient) => (magnet) =>
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

const findMatchesInTorrent = (params) =>
  pipe(
    juxt(prop("name"), pipe(prop("files"), filter(videoFilePredicate))),
    explode(1),
    mapCat(findTimeRanges(params))
  );

const main = async ({ name, magnet, matcher, webTorrentClient }) =>
  pipe(
    searchMagnets(magnet),
    sideEffect((x) => console.log(`found ${x.length} magnet links`)),
    map(
      pipe(
        magnetToTorrent(webTorrentClient),
        juxt(makeServer, findMatchesInTorrent({ ...matcher, query: name })),
        explode(1),
        awaitSideEffect(map(spread(downloadChunk))),
        unique(pipe(head, prop("url"))),
        map(([{ server }]) => server.close())
      )
    )
  )(name);

(async () => {
  const webTorrentClient = new WebTorrent();
  await main({
    webTorrentClient,
    name: "the game 1997",
    magnet: { maxResults: 1, medium: "Movies" },
    matcher: {
      phrase: "the object of the game",
      medium: "Movies",
      // imdbid: "tt7768848",
      maxSrtsPerFile: 1,
      maxMatchesPerSrt: 10,
      bufferLeft: 0,
      bufferRight: 0,
    },
  });
  console.log("finished");
  webTorrentClient.destroy();
})();
