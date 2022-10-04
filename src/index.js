import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "i'll be back",
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
  )(["the terminator 1984"]);
  console.log("finished");
  webTorrentClient.destroy();
  process.exit();
})();
