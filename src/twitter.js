import { ETwitterStreamEvent, TwitterApi } from "twitter-api-v2";

import { botHelper } from "./botUtils.js";
import { log } from "gamla";

export const runTwitterBot = async ({
  accessToken,
  accessSecret,
  appKey,
  appSecret,
  command,
  bearerToken,
}) => {
  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });
  const bearerTokenClient = new TwitterApi(bearerToken);
  const stream = await bearerTokenClient.v2.searchStream();
  stream.autoReconnect = true;
  stream.on(ETwitterStreamEvent.Data, ({ data: { id, text } }) => {
    console.log("incoming tweet", { id, text });
    botHelper(
      console.log,
      async (filepath) => {
        client.v2.reply("", id, {
          media: {
            media_ids: [await client.v1.uploadMedia(filepath)],
          },
        });
      },
      (reason) => client.v2.reply(reason || "Sorry, I couldn't find it :(", id),
    )(log(text).split(command)[1].trim());
  });
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

export const writeRules = async ({ command, bearerToken }) => {
  const bearerTokenClient = new TwitterApi(bearerToken);
  await bearerTokenClient.v2.updateStreamRules({
    add: [{ value: command, tag: command }],
  });
  const rules = await bearerTokenClient.v2.streamRules();
  console.log(rules.data);
};
