import { parseWhisperOutput } from "./whisper";

test("parseWhisperOutput", () => {
  expect(
    parseWhisperOutput(`
    [00:00.000 --> 00:05.000]  a survivor of the Nostromo, signing off.
    `),
  ).toEqual([
    {
      id: "1",
      startTime: "00:00:00,000",
      startSeconds: 0,
      endTime: "00:00:05,000",
      endSeconds: 5,
      text: "a survivor of the Nostromo, signing off.",
    },
  ]);
});
