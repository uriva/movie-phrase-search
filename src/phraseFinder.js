import { downloadMatchFromMp4Url, mergeMp4s } from "./ffmpeg.js";
import {
  explode,
  greater,
  head,
  identity,
  juxt,
  length,
  log,
  map,
  mapCat,
  pipe,
  prop,
  sideEffect,
  spread,
  unique,
  when,
} from "gamla";
import {
  magnetToTorrent,
  torrentToServer,
  torrentToSrts,
} from "./webtorrent.js";

import TorrentSearchApi from "torrent-search-api";
import { findPhraseInSrt } from "./srt.js";
import { movieFromQuote } from "./quodb.js";
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
  matches,
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
            mapCat(await findPhraseInSrt(matches.useML)(searchParams.phrase)),
            sideEffect((x) =>
              console.log(
                `found ${x.length} occurrences:\n${x
                  .map(prop("startTime"))
                  .join("\n")}`
              )
            )
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
        when(pipe(length, greater(1)), mergeMp4s(searchParams))
      )
    )
  )(searchParams.name || (await movieFromQuote(searchParams.phrase)));
