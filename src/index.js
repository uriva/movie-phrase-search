import WebTorrent from "webtorrent";
import { main } from "./lib.js";
import { map } from "gamla";

(async () => {
  const webTorrentClient = new WebTorrent();
  await map((name) =>
    main({
      searchParams: {
        name,
        phrase: "my precious",
      },
      webTorrentClient,
      magnet: { maxResults: 1, medium: "Movies" },
      srt: {
        // path: "/home/uri/Downloads/pretty-woman-1990-english-yify-129600/Pretty.Woman.1990.1080p.720p.BluRay.x264.[YTS.MX]-English.srt",
        // imdbid: "tt7768848",
        limit: 1,
      },
      downloadParams: {
        bufferLeft: 0,
        bufferRight: 0,
      },
    })
  )([
    "the fellowship of the ring 1080p",
    "the two towers 1080p",
    "the return of the king 1080p",
  ]);
  console.log("finished");
  webTorrentClient.destroy();
  process.exit();
})();
