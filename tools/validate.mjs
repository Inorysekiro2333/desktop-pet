// Validate the injected rows: call apply() with a fake ctx, then parse each
// script/style row for syntax errors (without executing DOM code).
import { readFileSync } from 'node:fs'
const mod = await import('file:///C:/Users/liuzhanhong/Desktop/OH-WorkSpace/desktop-pet/plugin/index.mjs')

const captured = []
const ctx = {
  on(event, cb) { this._cb = cb },
}
mod.apply(ctx)
const table = []
ctx._cb(table)
captured.push(...table)

let failed = false
for (const row of table) {
  if (row.kind === 'style') {
    // naive style balance check
    const open = (row.text.match(/\{/g) || []).length
    const close = (row.text.match(/\}/g) || []).length
    const ok = open === close
    console.log(`style: ${row.kind} len=${row.text.length} braces=${open}/${close} ${ok ? 'OK' : 'BAD'}`)
    if (!ok) failed = true
  } else if (row.kind === 'script') {
    try {
      new Function(row.text)          // parse only
      console.log(`script: placement=${row.placement} len=${row.text.length} PARSE-OK`)
    } catch (e) {
      failed = true
      console.log(`script: placement=${row.placement} len=${row.text.length} PARSE-ERR -> ${e.message}`)
    }
    if (row.text.includes('</script')) { failed = true; console.log('script: contains </script (would break element) -> BAD') }
  }
}
console.log(failed ? 'RESULT: BAD' : 'RESULT: ALL OK')
process.exit(failed ? 1 : 0)
