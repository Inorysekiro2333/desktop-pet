const fs = require('fs');
const { PNG } = require('pngjs');

const SRC = 'C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/assets/front.png';
const TARGET_W = 240;
const png = PNG.sync.read(fs.readFileSync(SRC));
const W = png.width, H = png.height;
const TW = TARGET_W, TH = Math.round(H * TW / W);

const out = new PNG({ width: TW, height: TH });
const o = out.data;
// nearest-neighbor downsample
for (let y = 0; y < TH; y++) {
  const sy = Math.min(H - 1, Math.floor(y * H / TH));
  for (let x = 0; x < TW; x++) {
    const sx = Math.min(W - 1, Math.floor(x * W / TW));
    const si = (sy * W + sx) * 4;
    const di = (y * TW + x) * 4;
    o[di] = png.data[si];
    o[di+1] = png.data[si+1];
    o[di+2] = png.data[si+2];
    o[di+3] = png.data[si+3];
  }
}

const buf = PNG.sync.write(out);
const b64 = buf.toString('base64');
const dataUrl = 'data:image/png;base64,' + b64;
fs.writeFileSync('C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/assets/spirit-240.png', buf);
fs.writeFileSync('C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/assets/spirit-240.txt', b64);
fs.writeFileSync('C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/assets/spirit-240.dataurl.txt', dataUrl);
console.log('resized', TW + 'x' + TH, 'png bytes=' + buf.length, 'base64 chars=' + b64.length);
