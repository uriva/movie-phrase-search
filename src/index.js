import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    findAndDownload({
      searchParams: {
        name,
        phrase: "you know what I do",
        phraseEnd: "just hang up and try again",
      },
      webTorrentClient,
      srt: {
        language: "en",
        limit: 1,
      },
      downloadParams: {
        limit: 2,
        bufferLeft: 0,
        bufferRight: 5,
      },
    })
  )(["what about bob 1991"]);
  webTorrentClient.destroy();
  process.exit();
})().catch(console.error);
