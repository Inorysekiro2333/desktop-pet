const fs = require('fs');
const { PNG } = require('pngjs');

const src = 'C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/assets/penguin-girl.png';
const png = PNG.sync.read(fs.readFileSync(src));
const { width: W, height: H, data } = png;

// Estimate background RGB from the four corners (averaged)
const cornerPixels = [];
for (const [x, y] of [[0,0],[W-1,0],[0,H-1],[W-1,H-1],[Math.floor(W/2),0],[Math.floor(W/2),H-1]]) {
  const i = (y * W + x) * 4;
  cornerPixels.push([data[i], data[i+1], data[i+2]]);
}
function avg(ps){ return ps.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]).map(v=>Math.round(v/ps.length)); }
const bg = avg(cornerPixels);
console.log('image', W, 'x', H, 'bg~', bg.join(','));

// Build non-background mask
const thr = 42; // per-channel distance threshold
function dist(px, py, pz){ const r=px-bg[0], g=py-bg[1], b=pz-bg[2]; return Math.sqrt(r*r+g*g+b*b); }
const mask = new Uint8Array(W*H);
for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
  const i=(y*W+x)*4;
  if (data[i+3] > 10 && dist(data[i],data[i+1],data[i+2]) > thr) mask[y*W+x]=1;
}

// Column occupancy -> find contiguous segments with content
const colCount = new Array(W).fill(0);
for (let x=0;x<W;x++){ let c=0; for(let y=0;y<H;y++) c+=mask[y*W+x]; colCount[x]=c; }
const segs=[]; let start=-1;
const minCol=3; // ignore tiny noise columns
for (let x=0;x<W;x++){
  if (colCount[x]>=minCol){ if(start<0) start=x; }
  else if(start>=0){ segs.push([start,x-1]); start=-1; }
}
if(start>=0) segs.push([start,W-1]);
// Merge segments separated by small gaps
const merged=[];
for(const s of segs){
  if(merged.length && s[0]-merged[merged.length-1][1] < 12) merged[merged.length-1][1]=s[1];
  else merged.push([s[0],s[1]]);
}
console.log('column segments:', JSON.stringify(merged));

// For each segment compute bbox
merged.forEach((s,idx)=>{
  let x1=s[0], x2=s[1], y1=H, y2=0;
  for(let x=x1;x<=x2;x++) for(let y=0;y<H;y++) if(mask[y*W+x]){ if(y<y1)y1=y; if(y>y2)y2=y; }
  console.log(`seg${idx}: x[${x1},${x2}] y[${y1},${y2}] w=${x2-x1+1} h=${y2-y1+1}`);
});
