// @deepseek-ai/dsh-penguin-pet — a light "desktop" pet for the Harness web window.
// Host plugin only: on webserver index render it pushes a <style> and a <body>
// <script> row, so the pet renders inside the served page with NO client build.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-penguin-pet'

const here = dirname(fileURLToPath(import.meta.url))

let sprite = ''
try {
  const b64 = readFileSync(join(here, 'spirit-240.txt'), 'utf8').trim()
  sprite = 'data:image/png;base64,' + b64
} catch {
  // Sprite missing: keep the pet as a plain bubble so the page still boots.
  sprite = ''
}

const STYLE = `
.dsh-pet{position:fixed;left:22px;bottom:48px;z-index:2147483000;width:var(--pet-w,120px);user-select:none;-webkit-user-select:none;filter:drop-shadow(0 8px 12px rgba(0,0,0,.22));transition:width .12s ease}
.dsh-pet *{box-sizing:border-box}
.dsh-pet.collapsed{width:48px}
.dsh-pet-inner{width:100%;cursor:grab}
.dsh-pet-inner:active{cursor:grabbing}
.dsh-pet-inner img{width:100%;display:block;pointer-events:none}
@keyframes dshPetBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes dshPetBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
.dsh-pet-inner.anim{animation:dshPetBreathe 3s ease-in-out infinite}
.dsh-pet-inner.anim{animation:dshPetBob 2.4s ease-in-out infinite}
@keyframes dshPetReact{0%{transform:scale(1,1)}30%{transform:scale(1.18,.82)}60%{transform:scale(.9,1.12)}100%{transform:scale(1,1)}}
.dsh-pet-inner.react{animation:dshPetReact .45s ease-in-out}
.dsh-pet-bubble{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#fff;color:#2c3e50;padding:5px 10px;border-radius:12px;border:2px solid #ffd28a;font-size:12px;line-height:1.3;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.12);opacity:0;transition:opacity .2s;pointer-events:none}
.dsh-pet-bubble.show{opacity:1}
.dsh-pet-bubble:after{content:"";position:absolute;top:100%;left:50%;margin-left:-5px;border:6px solid transparent;border-top-color:#ffd28a}
.dsh-pet-bar{position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%);display:flex;gap:1px;background:rgba(255,255,255,.94);border:1px solid #e3eef7;border-radius:10px;padding:3px 4px;box-shadow:0 3px 8px rgba(0,0,0,.12);opacity:0;pointer-events:none;transition:opacity .15s ease}
.dsh-pet.show .dsh-pet-bar{opacity:1;pointer-events:auto}
.dsh-pet-bar button{border:none;background:transparent;color:#2b6a9b;font-size:13px;line-height:1;cursor:pointer;padding:4px 6px;border-radius:6px}
.dsh-pet-bar button:hover{background:#e7f2fb}
.dsh-pet-mini{display:none;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.92);border:1px solid #cfe0ee;box-shadow:0 4px 10px rgba(31,74,122,.18);color:#5f83a3;align-items:center;justify-content:center;cursor:grab;transition:transform .15s ease}
.dsh-pet-mini:hover{transform:scale(1.06)}
.dsh-pet-mini svg{display:block}
.dsh-pet.collapsed .dsh-pet-inner,.dsh-pet.collapsed .dsh-pet-bar{display:none}
.dsh-pet.collapsed .dsh-pet-mini{display:flex}
`

function buildPetScript() {
  return `
(function(){
  if (window.__dshPetInstalled) return
  window.__dshPetInstalled = true
  var root = document.createElement('div'); root.className = 'dsh-pet'
  var bubble = document.createElement('div'); bubble.className = 'dsh-pet-bubble'
  var inner = document.createElement('div'); inner.className = 'dsh-pet-inner anim'
  var img = document.createElement('img'); img.alt = '\\u4f01\\u9e45\\u5a18'; img.src = ${JSON.stringify(sprite)}
  inner.appendChild(img)
  var bar = document.createElement('div'); bar.className = 'dsh-pet-bar'
  var mini = document.createElement('div'); mini.className = 'dsh-pet-mini'; mini.title = '\\u5c55\\u5f00'; mini.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>'

  document.body.appendChild(root)
  root.appendChild(bubble); root.appendChild(inner); root.appendChild(bar); root.appendChild(mini)

  // ---- size ----
  var PET_W = 120, MIN = 70, MAX = 260, STEP = 20
  function setSize(w){ PET_W = Math.max(MIN, Math.min(MAX, w)); root.style.setProperty('--pet-w', PET_W + 'px'); try { localStorage.setItem('dshPetSize', PET_W) } catch(e){} }
  var saved = parseInt(localStorage.getItem('dshPetSize'), 10); setSize(saved ? saved : PET_W)

  // ---- lines / reactions ----
  var lines = ['\\u5495\\u5495\\u560e\\u560e', '\\u6211\\u662f\\u9999\\u4f01\\u9e45\\uff0c\\u4f60\\u662f\\u51d1\\u4f01\\u9e45']
  var say = function(t){ bubble.textContent = t; bubble.classList.add('show'); clearTimeout(say._t); say._t = setTimeout(function(){ bubble.classList.remove('show') }, 1800) }
  var react = function(){ inner.classList.remove('react'); void inner.offsetWidth; inner.classList.add('react'); say(lines[Math.floor(Math.random() * lines.length)]); setTimeout(function(){ inner.classList.remove('react') }, 500) }

  // ---- hover toolbar buttons (outside drag target, so clicks always work) ----
  var btnDec = document.createElement('button'); btnDec.textContent = '\\u2212'; btnDec.title = '\\u7f29\\u5c0f'
  var btnInc = document.createElement('button'); btnInc.textContent = '\\uff0b'; btnInc.title = '\\u653e\\u5927'
  var btnFold = document.createElement('button'); btnFold.textContent = '\\u25a2'; btnFold.title = '\\u6298\\u53e0'
  btnInc.addEventListener('click', function(e){ e.stopPropagation(); setSize(PET_W + STEP) })
  btnDec.addEventListener('click', function(e){ e.stopPropagation(); setSize(PET_W - STEP) })
  btnFold.addEventListener('click', function(e){ e.stopPropagation(); root.classList.add('collapsed') })
  bar.appendChild(btnDec); bar.appendChild(btnInc); bar.appendChild(btnFold)

  // ---- toolbar grace: keep it visible 400ms so the cursor can reach it ----
  var showTimer
  function showBar(){ root.classList.add('show'); clearTimeout(showTimer) }
  function hideBar(){ clearTimeout(showTimer); showTimer = setTimeout(function(){ root.classList.remove('show') }, 400) }
  root.addEventListener('pointerenter', showBar)
  root.addEventListener('pointerleave', hideBar)

  // ---- drag: only the pet body / folded mini capture the pointer ----
  function drag(el, onTap){
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = 0
    el.addEventListener('pointerdown', function(e){ if (e.button !== 0) return; dragging = true; moved = 0; sx = e.clientX; sy = e.clientY; var r = root.getBoundingClientRect(); ox = r.left; oy = r.top; el.setPointerCapture(e.pointerId) })
    el.addEventListener('pointermove', function(e){ if (!dragging) return; var dx = e.clientX - sx, dy = e.clientY - sy; moved = Math.max(moved, Math.sqrt(dx*dx + dy*dy)); root.style.left = (ox + dx) + 'px'; root.style.top = (oy + dy) + 'px'; root.style.bottom = 'auto'; root.style.right = 'auto' })
    el.addEventListener('pointerup', function(){ if (!dragging) return; dragging = false; if (moved < 6 && onTap) onTap() })
  }
  drag(inner, react)
  drag(mini, function(){ root.classList.remove('collapsed') })
})()
`
}

export function apply(ctx) {
  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'style', text: STYLE })
    table.push({ kind: 'script', placement: 'body', text: buildPetScript() })
  })
}
