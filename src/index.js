import {
  always,
  contains,
  empty,
  explode,
  filter,
  head,
  juxt,
  log,
  logWith,
  lowercase,
  map,
  mapCat,
  max,
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

const videoFilePredicate = ({ name }) =>
  name.endsWith("mp4") || name.endsWith("mkv");

const srtFilePredicate = ({ name }) => name.endsWith("srt");

const randomPort = () => Math.floor(1000 + Math.random() * 9000);

const makeServer = (torrent) =>
  new Promise((resolve) => {
    const port = randomPort();
    const server = torrent.createServer();
    server.listen(port);
    resolve({
      url: `http://localhost:${port}/${resolveVideoFileIndex(torrent)}`,
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

const findPhraseInSrt = ({
  phrase,
  maxMatchesPerSrt,
  bufferLeft,
  bufferRight,
}) =>
  pipe(
    findPhrase(phrase),
    sideEffect((x) => console.log(`found ${x.length} occurrences`)),
    map(({ startTime, endTime }) => ({
      id: `./${phrase}-${startTime}-${endTime}`,
      start: srtTimestampToSeconds(startTime) - bufferLeft,
      duration:
        srtTimestampToSeconds(endTime) +
        bufferRight -
        (srtTimestampToSeconds(startTime) - bufferLeft),
    })),
    take(maxMatchesPerSrt)
  );

const findSrtForVideoFile = (params) =>
  pipe(
    sideEffect(() => console.log(`computing hash...`)),
    computeHash,
    (movieHash) =>
      fetch(
        "https://api.opensubtitles.org/api/v1/subtitles?" +
          new URLSearchParams({
            ...params,
            movieHash,
          }),
        {
          headers: {
            "Content-Type": "application/json",
            "Api-Key": "MijIRcpzHyNls6f54dQyNlqNkKcr9I4J",
          },
        }
      ),
    (x) => x.json(),
    log,
    (x) => x["en"] || [],
    map(
      pipe(
        ({ url }) => fetch(url),
        (r) => r.text(),
        parseSrt
      )
    ),
    filter((x) => x),
    sideEffect((x) => console.log(`found ${x.length} srt files`)),
    head
  );

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

const downloadToStr = (file) =>
  new Promise((resolve) => {
    file.getBuffer((_, buffer) => resolve(buffer.toString()));
  });

const resolveVideoFileIndex = (torrent) => {
  const videoFiles = torrent.files.filter(videoFilePredicate);
  if (empty(videoFiles)) {
    console.error("did not find video files in torrent");
    throw "fatal error";
  }
  return torrent.files.indexOf(max(prop("length"))(videoFiles));
};

const torrentToSrt = (params) => async (torrent) => {
  const srtWithin = torrent.files.find(srtFilePredicate);
  return srtWithin
    ? parseSrt(await downloadToStr(srtWithin))
    : findSrtForVideoFile(params)(
        torrent.files[resolveVideoFileIndex(torrent)]
      );
};

const main = async ({ name, magnet, matcher, srt, webTorrentClient }) =>
  pipe(
    searchMagnets(magnet),
    sideEffect((x) => console.log(`found ${x.length} magnet links`)),
    map(
      pipe(
        magnetToTorrent(webTorrentClient),
        juxt(
          makeServer,
          pipe(torrentToSrt({ query: name, ...srt }), findPhraseInSrt(matcher))
        ),
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
    srt: {
      // imdbid: "tt7768848",
      limit: 1,
    },
    matcher: {
      phrase: "the",
      maxMatchesPerSrt: 10,
      bufferLeft: 0,
      bufferRight: 0,
    },
  });
  console.log("finished");
  webTorrentClient.destroy();
})();
