import * as dotenv from "dotenv";

import { TwitterApi } from "twitter-api-v2";
import { botHelper } from "./botUtils.js";
import { log } from "gamla";

dotenv.config();

export const main = async ({
  accessToken,
  accessSecret,
  appKey,
  appSecret,
}) => {
  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  for await (const {
    text,
    id,
    referenced_tweets,
  } of await client.v2.userMentionTimeline(process.env.userId, {
    max_results: 5,
    expansions: ["referenced_tweets.id"],
  })) {
    if (!referenced_tweets || !referenced_tweets.length) {
      botHelper(
        console.log,
        async (filepath) => {
          client.v2.reply("", id, {
            media: {
              media_ids: [await client.v1.uploadMedia(filepath)],
            },
          });
        },
        () => client.v2.reply("sorry i could not find it :(", id),
      )(log(text).split("@quote2video")[1].trim());
    }
  }
};

export const printAuthLink = async ({ appKey, appSecret }) => {
  const client = new TwitterApi({ appKey, appSecret });
  const authLink = await client.generateAuthLink("https://twitter.com");
  console.log(authLink);
};

export const getAccessToken = async ({
  accessToken,
  accessSecret,
  oauthVerifier,
  appKey,
  appSecret,
}) => {
  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  try {
    const { accessToken, accessSecret } = await client.login(oauthVerifier);
    console.log({ accessToken, accessSecret });
  } catch (e) {
    console.error(e);
  }
};

main({
  appKey: process.env.appKey,
  appSecret: process.env.appSecret,
  accessToken: process.env.accessToken,
  accessSecret: process.env.accessSecret,
});
