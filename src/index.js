import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "frankly my dear",
      },
      webTorrentClient,
      magnet: { limit: 1, medium: "Movies" },
      srt: {
        limit: 1,
      },
      downloadParams: {
        bufferLeft: 0,
        bufferRight: 0,
      },
    })
  )(["gone with the wind"]);
  console.log("finished");
  webTorrentClient.destroy();
  process.exit();
})();
