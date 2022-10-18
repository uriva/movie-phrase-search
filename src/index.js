import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "i never make plans that far ahead",
      },
      webTorrentClient,
      srt: {
        language: "en",
        limit: 1,
      },
      downloadParams: {
        limit: 2,
        bufferLeft: 0,
        bufferRight: 0,
      },
    })
  )([""]);
  webTorrentClient.destroy();
  process.exit();
})();
