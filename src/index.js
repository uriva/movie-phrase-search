import {
  always,
  contains,
  empty,
  explode,
  filter,
  head,
  juxt,
  length,
  log,
  logWith,
  lowercase,
  map,
  mapCat,
  max,
  pipe,
  prop,
  replace,
  second,
  sideEffect,
  spread,
  take,
  unique,
} from "gamla";

import TorrentSearchApi from "torrent-search-api";
import WebTorrent from "webtorrent";
import { computeHash } from "./openSubtitleHash.js";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import { parseMagnet } from "parse-magnet-uri";
import { readFileSync } from "fs";
import { resolve } from "path";
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

const findPhraseInSrt = (text) =>
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

const matchToFilename =
  ({ name, phrase }) =>
  ({ startTime, endTime }) =>
    `${name}-${phrase}-${startTime}-${endTime}.mp4`;

const downloadChunk =
  ({ bufferLeft, bufferRight }) =>
  (searchParams) =>
  ({ url }, { startTime, endTime }) =>
    new Promise((resolve) => {
      ffmpeg(url)
        .seekInput(srtTimestampToSeconds(startTime) - bufferLeft)
        .duration(
          srtTimestampToSeconds(endTime) -
            srtTimestampToSeconds(startTime) +
            bufferLeft +
            bufferRight
        )
        .output(matchToFilename(searchParams)({ startTime, endTime }))
        .on("end", () => {
          console.log(`written match to file.`);
          resolve();
        })
        .on("error", console.error)
        .run();
    });

const tempDir = "/tmp/";

const mergeFiles =
  ({ name, phrase }) =>
  (matches) =>
    new Promise((resolve) => {
      if (empty(matches)) {
        resolve();
        return;
      }
      const merged = ffmpeg();
      matches
        .map(pipe(second, matchToFilename({ name, phrase })))
        .forEach((path) => merged.input(path));
      merged
        .on("end", () => {
          console.log("written combined to file");
          resolve();
        })
        .on("error", console.error)
        .mergeToFile(`${name}-${phrase}.mp4`, tempDir);
    });

const srtTimestampToSeconds = (srtTimestamp) => {
  const [rest, millisecondsString] = srtTimestamp.split(",");
  const milliseconds = parseInt(millisecondsString, 10);
  const [hours, minutes, seconds] = map((x) => parseInt(x))(rest.split(":"));
  return milliseconds * 0.001 + seconds + 60 * minutes + 3600 * hours;
};

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
    file.getBuffer((err, buffer) => {
      if (err) throw err;
      resolve(buffer.toString());
    });
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
  const srtWithinFile = max(prop("length"))(
    torrent.files.filter(srtFilePredicate)
  );
  const srtWithin =
    srtWithinFile && parseSrt(await downloadToStr(srtWithinFile));
  return (
    srtWithin ||
    (params.path
      ? parseSrt(readFileSync(params.path).toString())
      : findSrtForVideoFile(params)(
          torrent.files[resolveVideoFileIndex(torrent)]
        ))
  );
};

const main = async ({
  searchParams,
  downloadParams,
  magnet,
  srt,
  webTorrentClient,
}) =>
  pipe(
    searchMagnets(magnet),
    sideEffect((x) => console.log(`found ${x.length} magnet links`)),
    map(
      pipe(
        magnetToTorrent(webTorrentClient),
        juxt(
          makeServer,
          pipe(
            torrentToSrt({ query: searchParams.name, ...srt }),
            findPhraseInSrt(searchParams.phrase),
            sideEffect((x) => console.log(`found ${x.length} occurrences`))
          )
        ),
        explode(1),
        awaitSideEffect(
          map(spread(downloadChunk(downloadParams)(searchParams)))
        ),
        awaitSideEffect(
          pipe(
            unique(pipe(head, prop("url"))),
            map(([{ server }]) => server.close())
          )
        ),
        mergeFiles(searchParams)
      )
    )
  )(searchParams.name);

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    main({
      searchParams: {
        name,
        phrase: "my precious",
      },
      webTorrentClient,
      magnet: { maxResults: 1, medium: "Movies" },
      srt: {
        // path: "/home/uri/Downloads/pretty-woman-1990-english-yify-129600/Pretty.Woman.1990.1080p.720p.BluRay.x264.[YTS.MX]-English.srt",
        // imdbid: "tt7768848",
        limit: 1,
      },
      downloadParams: {
        bufferLeft: 0,
        bufferRight: 0,
      },
    })
  )([
    "the fellowship of the ring 1080p",
    "the two towers 1080p",
    "the return of the king 1080p",
  ]);
  console.log("finished");
  webTorrentClient.destroy();
  process.exit();
})();
