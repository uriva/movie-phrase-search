import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "i only hope that he's lucky",
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
  )(["match point"]);
  webTorrentClient.destroy();
  process.exit();
})().catch(console.error);
