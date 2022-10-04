import { downloadMatchFromMp4Url, mergeMp4s } from "./ffmpeg.js";
import {
  explode,
  head,
  juxt,
  log,
  map,
  mapCat,
  pipe,
  prop,
  sideEffect,
  spread,
  unique,
} from "gamla";
import {
  magnetToTorrent,
  torrentToServer,
  torrentToSrts,
} from "./webtorrent.js";

import TorrentSearchApi from "torrent-search-api";
import { findPhraseInSrt } from "./srt.js";
import { parseMagnet } from "parse-magnet-uri";

TorrentSearchApi.enablePublicProviders();

const searchMagnets = ({ limit, medium }) =>
  pipe(
    (movieName) => TorrentSearchApi.search(movieName, medium, limit),
    map(async (x) => await TorrentSearchApi.getMagnet(x)),
    unique(pipe(parseMagnet, prop("infoHash")))
  );

const awaitSideEffect = (f) => async (x) => {
  await f(x);
  return x;
};

export const findAndDownload = async ({
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
          torrentToServer,
          pipe(
            torrentToSrts({ query: searchParams.name, ...srt }),
            mapCat(findPhraseInSrt(searchParams.phrase)),
            sideEffect((x) => console.log(`found ${x.length} occurrences`))
          )
        ),
        explode(1),
        awaitSideEffect(
          map(spread(downloadMatchFromMp4Url(downloadParams)(searchParams)))
        ),
        awaitSideEffect(
          pipe(
            unique(pipe(head, prop("url"))),
            map(([{ server }]) => server.close())
          )
        ),
        mergeMp4s(searchParams)
      )
    )
  )(searchParams.name);
