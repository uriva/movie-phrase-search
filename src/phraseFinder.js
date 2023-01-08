import {
  anyjuxt,
  filter,
  juxt,
  map,
  mapCat,
  pipe,
  prop,
  sideEffect,
  sortKey,
  take,
} from "gamla";
import {
  torrentIdToTorrent,
  torrentToServer,
  torrentToSrts,
} from "./webtorrent.js";

import { downloadMatchFromMp4Url } from "./ffmpeg.js";
import { findPhraseInSrt } from "./srt.js";
import { movieFromQuote } from "./quodb.js";

const searchTorrent = pipe(
  (query) => `https://apibay.org/q.php?q=${query}&cat=200`,
  fetch,
  (x) => x.json(),
  sideEffect((x) => console.log(`found ${x.length} torrents`)),
  filter(
    anyjuxt(pipe(prop("leechers"), parseInt), pipe(prop("seeders"), parseInt)),
  ),
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
        sortKey(prop("startSeconds")),
        sideEffect((x) =>
          console.log(
            `found ${x.length} occurrences:\n${x
              .map(prop("startTime"))
              .join("\n")}`,
          ),
        ),
      ),
    ),
    async ([{ url, server }, matches]) => {
      const filenames = await map(
        downloadMatchFromMp4Url(downloadParams)(searchParams)(url),
      )(matches);
      server.close();
      return filenames;
    },
  );

export const findAndDownload = pipe(
  async (params) => ({
    ...params,
    searchParams: {
      ...params.searchParams,
      name:
        params.searchParams.name ||
        (await movieFromQuote(params.searchParams.phraseStart)),
    },
  }),
  ({ searchParams, downloadParams, srt, webTorrentClient }) =>
    pipe(
      searchTorrent,
      take(searchParams.max),
      map(perTorrent(searchParams, downloadParams, srt, webTorrentClient)),
    )(searchParams.name),
);
