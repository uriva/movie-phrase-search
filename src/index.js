import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";

(async () => {
  const webTorrentClient = new WebTorrent();
  await findAndDownload({
    searchParams: {
      max: 1,
      name: "alien 1979",

      phraseStart: "survivor",
      phraseEnd: "signing off",
      maxSpan: 120,
    },
    webTorrentClient,
    srt: {
      language: "en",
      limit: 1,
    },
    downloadParams: {
      limit: 1,
      offset: 50,
      bufferLeft: 0,
      bufferRight: 0,
    },
  });
  webTorrentClient.destroy();
  process.exit();
})().catch(console.error);
