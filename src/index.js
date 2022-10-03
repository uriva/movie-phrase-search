import {
  contains,
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
  take,
} from "gamla";

import OpenSubtitles from "opensubtitles-api";
import TorrentSearchApi from "torrent-search-api";
import WebTorrent from "webtorrent";
import { computeHash } from "./openSubtitleHash.js";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import { default as srtParser2 } from "srt-parser-2";

const searchMagnets = (maxResults, medium) => async (movieName) => {
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

const getSrtsForHashAndName = (query) => (movieHash) =>
  new OpenSubtitles({
    useragent: "UserAgent",
  })
    .search({
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

const selectRightFileIndex = (x) =>
  x.findIndex(({ name }) => name.endsWith("mp4") || name.endsWith("mkv"));

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
      console.log(`written file ${output}`);
    })
    .run();
};

const srtTimestampToSeconds = (srtTimestamp) => {
  const [rest, millisecondsString] = srtTimestamp.split(",");
  const milliseconds = parseInt(millisecondsString, 10);
  const [hours, minutes, seconds] = map((x) => parseInt(x))(rest.split(":"));
  return milliseconds * 0.001 + seconds + 60 * minutes + 3600 * hours;
};

const perMagnet =
  (name, phrase, maxSrts, maxFileMatches, bufferLeft, bufferRight) =>
  async (magnet) => {
    const [servingUrl, timeRangesFound] = await juxt(
      makeServer,
      pipe(
        magnetToFiles,
        selectRightFile,
        computeHash,
        getSrtsForHashAndName(name),
        sideEffect((x) => console.log(`found ${x.length} srt files`)),
        take(maxSrts),
        mapCat(findPhrase(phrase)),
        log,
        sideEffect((x) => console.log(`found ${x.length} occurrences`))
      )
    )(magnet);
    return map(({ startTime, endTime }) =>
      downloadChunk(
        servingUrl,
        srtTimestampToSeconds(startTime) - bufferLeft,
        srtTimestampToSeconds(endTime) +
          bufferRight -
          (srtTimestampToSeconds(startTime) - bufferLeft),
        `./${name}-${phrase}-${startTime}-${endTime}.mp4`
      )
    )(timeRangesFound.slice(0, maxFileMatches));
  };

const main = async ({
  phrase,
  medium,
  name,
  maxFiles,
  maxMatchesPerSrt,
  maxSrtsPerFile,
  bufferLeft,
  bufferRight,
}) =>
  pipe(
    searchMagnets(maxFiles, medium),
    sideEffect((x) => console.log(`found ${x.length} magnet links`)),
    map(
      perMagnet(
        name,
        phrase,
        maxSrtsPerFile,
        maxMatchesPerSrt,
        bufferLeft,
        bufferRight
      )
    )
  )(name);

main({
  phrase: "lucky",
  medium: "Movies",
  name: "Match Point",
  maxFiles: 1,
  maxSrtsPerFile: 1,
  maxMatchesPerSrt: 50,
  bufferLeft: 3,
  bufferRight: 0,
});
