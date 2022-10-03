import {
  contains,
  enumerate,
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

const selectRightFileIndex = (x) =>
  x.findIndex(({ name }) => name.endsWith("mp4") || name.endsWith("mkv"));

const selectRightFile = (files) => files[selectRightFileIndex(files)];

const magnetToFiles = (magnet) =>
  new Promise((resolve) => {
    new WebTorrent().add(magnet, ({ files }) => {
      resolve(files);
    });
  });

const makeServer = (index) => (magnetURI) =>
  new Promise((resolve) => {
    const client = new WebTorrent();
    const portDigit = index + 1;
    const port = `${portDigit}${portDigit}${portDigit}${portDigit}`;
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
  ({
    name,
    imdbid,
    phrase,
    maxSrtsPerFile,
    maxMatchesPerSrt,
    bufferLeft,
    bufferRight,
  }) =>
  async ([index, magnet]) => {
    const [servingUrl, timeRangesFound] = await juxt(
      makeServer(index),
      pipe(
        magnetToFiles,
        selectRightFile,
        sideEffect(() => console.log(`computing hash...`)),
        computeHash,
        getSrtsForHashAndName({ query: name, imdbid }),
        sideEffect((x) => console.log(`found ${x.length} srt files`)),
        take(maxSrtsPerFile),
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
        `./${index}-${name}-${phrase}-${startTime}-${endTime}.mp4`
      )
    )(timeRangesFound.slice(0, maxMatchesPerSrt));
  };

const main = async ({
  phrase,
  medium,
  imdbid,
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
    enumerate,
    map(
      perMagnet({
        name,
        imdbid,
        phrase,
        maxSrtsPerFile,
        maxMatchesPerSrt,
        bufferLeft,
        bufferRight,
      })
    )
  )(name);

main({
  phrase: "batman",
  medium: "Movies",
  // medium: "Series",
  name: "batman begins",
  // imdbid: "tt7768848",
  maxFiles: 1,
  maxSrtsPerFile: 1,
  maxMatchesPerSrt: 50,
  bufferLeft: 0,
  bufferRight: 0,
});
