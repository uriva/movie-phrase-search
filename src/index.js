import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "a box of chocolate",
      },
      webTorrentClient,
      magnet: { limit: 1, medium: "Movies" },
      srt: {
        limit: 1,
      },
      matches: { useMl: false },
      downloadParams: {
        bufferLeft: 0,
        bufferRight: 10,
      },
    })
  )([""]);
  webTorrentClient.destroy();
  process.exit();
})();
