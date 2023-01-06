import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        max: 1,
        name,
        phraseStart: "diamond lane",
        phraseEnd: null,
        maxSpan: 120,
      },
      webTorrentClient,
      srt: {
        language: "en",
        limit: 1,
      },
      downloadParams: {
        limit: 2,
        offset: 73,
        bufferLeft: 0,
        bufferRight: 0,
      },
    }),
  )(["curb your enthusiasm s04e06"]);
  webTorrentClient.destroy();
  process.exit();
})().catch(console.error);
