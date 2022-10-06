import {
  contains,
  filter,
  log,
  lowercase,
  pipe,
  replace,
  filter,
  groupByMany,
  identity,
  join,
  log,
  map,
  mapCat,
  pairRight,
  pipe,
  prop,
  second,
  sideEffect,
  spread,
  unique,
  zip,
} from "gamla";

import tf from "@tensorflow/tfjs-node-gpu";
import universalSentenceEncoder from "@tensorflow-models/universal-sentence-encoder";

import SrtParser from "srt-parser-2";

export const parseSrt = (str) => {
  const result = new SrtParser().fromSrt(str);
  if (!result.length || result.find((entry) => entry.text.length > 500)) {
    console.error(`ignoring malformatted srt file: ${str.slice(0, 500)}`);
    return null;
  }
  return result;
};

const cleanText = pipe(
  lowercase,
  ...map((c) => replace(c, ""))(",!?.\"'-♪".split(""))
);

export const findPhraseInSrt = ml
  ? findPhraseInSrtMl
  : (query) =>
      filter(pipe(prop("text"), cleanText, contains(cleanText(query))));

const cosineSimilarity = (vec1) => (vec2) =>
  tf.div(tf.dot(vec1, vec2), tf.mul(tf.norm(vec1), tf.norm(vec2)));

const ngrams = (n) => (xs) => {
  const result = [];
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j <= i + n && j <= xs.length; j++) {
      result.push(xs.slice(i, j));
    }
  }
  return result;
};

const textToPhrases = (x) =>
  ngrams(4)(x.split(/[-.,?!\s]+/))
    .filter(identity)
    .map(join(" "));

const findPhraseInSrtMl = async (query) => {
  const model = await universalSentenceEncoder.load();
  const similarity = cosineSimilarity(
    (await (await model.embed([query])).array())[0]
  );
  return pipe(
    groupByMany(pipe(prop("text"), textToPhrases)),
    async (phraseToEntries) =>
      pipe(
        Object.keys,
        pairRight(
          pipe(
            (x) => model.embed(x),
            (x) => x.array(),
            map(similarity)
          )
        ),
        spread(zip),
        filter(pipe(second, async (score) => (await score.data())[0] > 0.6)),
        mapCat(([key]) => phraseToEntries[key]),
        unique(({ startTime, endTime }) => startTime + endTime)
      )(phraseToEntries)
  );
};
