import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "roads",
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
  )(["back to the future 1985"]);
  webTorrentClient.destroy();
  process.exit();
})();
