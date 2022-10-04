import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "devil in our pocket",
      },
      webTorrentClient,
      magnet: { limit: 1, medium: "Movies" },
      srt: {
        limit: 1,
      },
      downloadParams: {
        bufferLeft: 9,
        bufferRight: 35,
      },
    })
  )(["jodorowsky's dune"]);
  webTorrentClient.destroy();
  process.exit();
})();
