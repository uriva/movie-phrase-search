import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phraseStart: "then one day",
        phraseEnd: "socially",
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
  )(["deconstructing harry 1997 1080p"]);
  webTorrentClient.destroy();
  process.exit();
})().catch(console.error);
