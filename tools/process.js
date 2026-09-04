const fs = require('fs');
const { PNG } = require('pngjs');

const SRC = 'C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/assets/penguin-girl.png';
const OUT_DIR = 'C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/assets';
const png = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H, data } = png;

const BG = [255,255,255];
function dist(px,p){ const r=px[0]-p[0],g=px[1]-p[1],b=px[2]-p[2]; return Math.sqrt(r*r+g*g+b*b); }
const T1 = 104;   // background-ish threshold for flood fill
const T3 = 70;    // fringe narrowing threshold

// Crop region then remove border-connected background via flood fill.
function cutToTransparent(x0, y0, x1, y1) {
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  // local pixel getters over the source
  const srcAt = (lx,ly) => { const i=((y0+ly)*W+(x0+lx))*4; return [data[i],data[i+1],data[i+2],data[i+3]]; };
  const crop = new PNG({ width: cw, height: ch });
  const cd = crop.data;
  for (let y=0;y<ch;y++) for (let x=0;x<cw;x++) {
    const s=srcAt(x,y); const d=(y*cw+x)*4; cd[d]=s[0]; cd[d+1]=s[1]; cd[d+2]=s[2]; cd[d+3]=s[3];
  }
  // BFS flood fill from all border pixels that look like background
  const bgMask = new Uint8Array(cw*ch);
  const queue = [];
  const push = (x,y)=>{ const idx=y*cw+x; if(!bgMask[idx] && dist([cd[(idx)*4],cd[(idx)*4+1],cd[(idx)*4+2]],BG) < T1){ bgMask[idx]=1; queue.push(idx); } };
  for (let x=0;x<cw;x++){ push(x,0); push(x,ch-1); }
  for (let y=0;y<ch;y++){ push(0,y); push(cw-1,y); }
  while(queue.length){
    const idx=queue.pop(); const x=idx%cw, y=(idx/cw)|0;
    if(x>0) push(x-1,y); if(x<cw-1) push(x+1,y); if(y>0) push(x,y-1); if(y<ch-1) push(x,y+1);
  }
  // apply: background -> transparent; fringe (adjacent to bg, whitish) -> partial alpha
  for (let y=0;y<ch;y++) for (let x=0;x<cw;x++) {
    const idx=y*cw+x, d=idx*4;
    if (bgMask[idx]) { cd[d+3]=0; continue; }
    // fringe check
    const nb = [ [x>0,idx-1],[x<cw-1,idx+1],[y>0,idx-cw],[y<ch-1,idx+cw] ];
    let touchesBg=false, maxDist=0;
    for (const [ok,ni] of nb) if(ok && bgMask[ni]){ touchesBg=true; }
    if (touchesBg) {
      const dd = dist([cd[d],cd[d+1],cd[d+2]], BG);
      if (dd < T3) { cd[d+3] = Math.round((dd/T3)*255); } // blend halo edge
      else { cd[d+3]=255; }
    } else {
      cd[d+3]=255;
    }
  }
  return crop;
}

const regions = {
  front: [548,25,1046,863],
  side:  [28,40,465,863],
  back:  [1122,39,1606,863],
};
for (const [name,[x0,y0,x1,y1]] of Object.entries(regions)) {
  const crop = cutToTransparent(x0,y0,x1,y1);
  const file = `${OUT_DIR}/${name}.png`;
  fs.writeFileSync(file, PNG.sync.write(crop));
  console.log('wrote', name, crop.width+'x'+crop.height, file);
}
console.log('done');
