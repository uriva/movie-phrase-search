import { downloadMatchFromMp4Url, mergeMp4s } from "./ffmpeg.js";
import {
  explode,
  greater,
  head,
  juxt,
  length,
  map,
  mapCat,
  pipe,
  prop,
  sideEffect,
  spread,
  take,
  unique,
  when,
} from "gamla";
import {
  torrentIdToTorrent,
  torrentToServer,
  torrentToSrts,
} from "./webtorrent.js";

import { findPhraseInSrt } from "./srt.js";
import { movieFromQuote } from "./quodb.js";

const awaitSideEffect = (f) => async (x) => {
  await f(x);
  return x;
};

const searchTorrent = pipe(
  (query) => `https://apibay.org/q.php?q=${query}&cat=200`,
  fetch,
  (x) => x.json(),
  sideEffect((x) => console.log(`found ${x.length} torrents`)),
  map(prop("info_hash")),
);

const perTorrent = (searchParams, downloadParams, srt, webTorrentClient) =>
  pipe(
    torrentIdToTorrent(webTorrentClient),
    juxt(
      torrentToServer,
      pipe(
        torrentToSrts({ query: searchParams.name, ...srt }),
        mapCat(findPhraseInSrt(searchParams)),
        sideEffect((x) =>
          console.log(
            `found ${x.length} occurrences:\n${x
              .map(prop("startTime"))
              .join("\n")}`,
          ),
        ),
      ),
    ),
    explode(1),
    awaitSideEffect(
      map(spread(downloadMatchFromMp4Url(downloadParams)(searchParams))),
    ),
    awaitSideEffect(
      pipe(
        unique(pipe(head, prop("url"))),
        map(([{ server }]) => server.close()),
      ),
    ),
    when(pipe(length, greater(1)), mergeMp4s(searchParams)),
  );

export const findAndDownload = pipe(
  async (params) => ({
    ...params,
    searchParams: {
      ...params.searchParams,
      name:
        params.searchParams.name ||
        (await movieFromQuote(params.searchParams.phrase)),
    },
  }),
  ({ searchParams, downloadParams, srt, webTorrentClient }) =>
    pipe(
      searchTorrent,
      take(1),
      map(perTorrent(searchParams, downloadParams, srt, webTorrentClient)),
    )(searchParams.name),
);
