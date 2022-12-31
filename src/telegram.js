import { Telegraf } from "telegraf";
import { botHelper } from "./botUtils.js";
import fs from "fs";

const helpText =
  "You can search by sending me the movie name, quote start, quote end, offset in seconds, each in its own line.\n\nExample:\n\nthe departed\nmarriage is an important part\ncock must work\n-4";

export const runTelegramBot = ({ telegramToken }) => {
  const bot = new Telegraf(telegramToken);
  bot.start((ctx) => ctx.reply(helpText));
  bot.startPolling();
  bot.on("text", (ctx) => {
    if (ctx.message.text.toLowerCase() === "help") {
      ctx.reply(helpText);
      return;
    }
    return botHelper(
      (params) => ctx.reply(`params:\n${JSON.stringify(params, null, 2)}`),
      (filepath) => {
        ctx.reply("Found it! Sending you the video...");
        return ctx.replyWithVideo({
          source: fs.createReadStream(filepath),
        });
      },
      () =>
        ctx.reply(
          "Couldn't find the movie or quote. Try adding the movie year and quality, e.g. the matrix 1999 1080p.",
        ),
    )(ctx.message.text);
  });
};
