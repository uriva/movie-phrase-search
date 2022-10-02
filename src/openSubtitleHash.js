import { logWith, pipe } from "gamla";

const initLongs = (fileLength) => {
  const longs = [];
  let temp = fileLength;
  for (let i = 0; i < 8; i++) {
    longs[i] = temp & 255;
    temp = temp >> 8;
  }
  return longs;
};

const read = (stream) =>
  new Promise((resolve, reject) => {
    const bufs = [];
    stream
      .on("data", (data) => {
        bufs.push(data);
      })
      .on("end", () => {
        resolve(Buffer.concat(bufs));
      })
      .on("error", reject);
  });

const binl2hex = (a) => {
  var b = 255,
    d = "0123456789abcdef",
    e = "",
    c = 7;

  a[1] += a[0] >> 8;
  a[0] = a[0] & b;
  a[2] += a[1] >> 8;
  a[1] = a[1] & b;
  a[3] += a[2] >> 8;
  a[2] = a[2] & b;
  a[4] += a[3] >> 8;
  a[3] = a[3] & b;
  a[5] += a[4] >> 8;
  a[4] = a[4] & b;
  a[6] += a[5] >> 8;
  a[5] = a[5] & b;
  a[7] += a[6] >> 8;
  a[6] = a[6] & b;
  a[7] = a[7] & b;
  for (d, e, c; c > -1; c--) {
    e += d.charAt((a[c] >> 4) & 15) + d.charAt(a[c] & 15);
  }
  return e;
};

const chunkSize = 64 * 1024;

const process =
  (fileTorrent, [start, end]) =>
  async (longs) => {
    const buffer = await read(
      await fileTorrent.createReadStream({ start, end })
    );
    let c = 0;
    for (const byte of buffer) {
      longs[(c + 8) % 8] += byte;
      c++;
    }
    return longs;
  };

export const computeHash = (fileTorrent) =>
  pipe(
    initLongs,
    process(fileTorrent, [0, chunkSize - 1]),
    process(fileTorrent, [
      fileTorrent.length - chunkSize,
      fileTorrent.length - 1,
    ]),
    binl2hex
  )(fileTorrent.length);
