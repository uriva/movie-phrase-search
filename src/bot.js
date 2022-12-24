import { Telegraf } from "telegraf";
import WebTorrent from "webtorrent";
import { findAndDownload } from "./phraseFinder.js";
import fs from "fs";
const helpText =
  "You can search by sending me the movie name, quote start, quote end, offset in seconds, each in its own line.\n\nExample:\n\nthe departed\nmarriage is an important part\ncock must work\n-4";
const bot = new Telegraf(process.argv[2]);
bot.start((ctx) => ctx.reply(helpText));
bot.startPolling();

bot.on("text", async (ctx) => {
  if (ctx.message.text.toLowerCase() === "help") {
    ctx.reply(helpText);
    return;
  }
  const [name, phraseStart, phraseEnd, offset] = ctx.message.text.split("\n");
  const searchParams = {
    name,
    phraseStart,
    phraseEnd,
    maxSpan: 120,
  };
  ctx.reply(`searching:\n${JSON.stringify(searchParams)}`);
  const webTorrentClient = new WebTorrent();
  const filename = await findAndDownload({
    searchParams,
    webTorrentClient,
    srt: {
      language: "en",
      limit: 1,
    },
    downloadParams: {
      limit: 2,
      offset: offset ? parseInt(offset) : 0,
      bufferLeft: 0,
      bufferRight: 0,
    },
  });
  if (filename) {
    ctx.reply("Found it! Sending you the video...");
    ctx
      .replyWithVideo({
        source: fs.createReadStream(filename),
      })
      .then(() => fs.unlink(filename, () => {}));
  } else {
    ctx.reply(
      "Couldn't find it. Try adding the movie year and quality, e.g. the matrix 1999 1080p.",
    );
  }
  webTorrentClient.destroy();
});
