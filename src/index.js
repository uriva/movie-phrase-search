import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "mr cobb",
      },
      webTorrentClient,
      magnet: { limit: 1, medium: "Movies" },
      srt: {
        limit: 1,
      },
      matches: { useMl: false },
      downloadParams: {
        bufferLeft: 0,
        bufferRight: 0,
      },
    })
  )(["inception"]);
  webTorrentClient.destroy();
  process.exit();
})();
