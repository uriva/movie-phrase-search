import { botHelper, example } from "./botUtils.js";

import { Telegraf } from "telegraf";
import fs from "fs";
import { map } from "gamla";

export const runTelegramBot = ({ telegramToken }) => {
  const bot = new Telegraf(telegramToken, { handlerTimeout: 300000 });
  bot.catch(async (err, ctx) => {
    console.error(err);
    try {
      await ctx.reply(`Ugh something went wrong:\n\n${JSON.stringify(err)}`);
    } catch (e) {
      console.error(e);
    }
  });
  bot.start(async (ctx) => {
    try {
      await ctx.reply(example);
    } catch (e) {
      console.error(e);
    }
  });
  bot.startPolling();
  bot.on("text", async (ctx) => {
    try {
      if (ctx.message.text.toLowerCase() === "help") {
        await ctx.reply(example);
        return;
      }
      return botHelper(
        async (params) => {
          console.log(params);
          try {
            await ctx.reply(`params:\n${JSON.stringify(params, null, 2)}`);
          } catch (e) {
            console.error(e);
          }
        },
        async (filepaths) => {
          try {
            await ctx.reply("Found it! Sending you the video...");
            await map((filepath) =>
              ctx.replyWithVideo({
                source: fs.createReadStream(filepath),
              }),
            )(filepaths);
          } catch (e) {
            console.error(e);
          }
        },
        async (reason) => {
          try {
            await ctx.reply(reason);
          } catch (e) {
            console.error(e);
          }
        },
      )(ctx.message.text);
    } catch (e) {
      console.error(e);
    }
  });
};
