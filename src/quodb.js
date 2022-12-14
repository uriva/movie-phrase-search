import { assert, head, logWith, map, nonempty, pipe, prop } from "gamla";

const search = pipe(
  (query) => `https://api.quodb.com/search/${query}`,
  fetch,
  (x) => x.json(),
  prop("docs"),
  map(({ title, year, phrase, time }) => ({ title, year, phrase, time })),
);

export const movieFromQuote = pipe(
  search,
  assert(nonempty, "fatal: could not find anything with this quote"),
  map(prop("title")),
  head,
  logWith("found movie for quote"),
);
