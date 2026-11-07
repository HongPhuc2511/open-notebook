// Run from the `frontend/` folder:  node apply-ui-shapes.mjs
// Rounds and flattens the shadcn components to match the Notebook theme.
// Safe to re-run: it only reports what it changed or could not find.
import fs from 'node:fs'

const dir = 'src/components/ui/'

const edits = {
  'card.tsx': [
    ['rounded-lg border py-6', 'rounded-3xl border-0 py-6'],
  ],
  'dialog.tsx': [
    ['rounded-xl border p-6 shadow-overlay', 'rounded-3xl border-0 p-6 shadow-overlay'],
    ['absolute right-4 top-4 rounded-sm', 'absolute right-4 top-4 rounded-full p-1.5'],
  ],
  'dropdown-menu.tsx': [
    ['rounded-md border p-1 shadow-pop', 'rounded-2xl border-0 p-2 shadow-pop'],
    ['rounded-md border p-1 shadow-lg', 'rounded-2xl border-0 p-2 shadow-pop'],
    ['rounded-sm', 'rounded-xl'],
  ],
  'popover.tsx': [
    ['rounded-md border p-4 shadow-pop', 'rounded-2xl border-0 p-4 shadow-pop'],
  ],
  'select.tsx': [
    ['rounded-md border bg-popover px-3 py-2', 'rounded-full border bg-popover px-4 py-2'],
    ['data-[size=default]:h-9 data-[size=sm]:h-8', 'data-[size=default]:h-10 data-[size=sm]:h-9'],
    ['rounded-md border shadow-pop', 'rounded-2xl border-0 shadow-pop'],
    ['"p-1",', '"p-2",'],
    ['rounded-sm', 'rounded-xl'],
  ],
  'tabs.tsx': [
    [
      'inline-flex w-fit items-center justify-start gap-4 border-b border-border text-muted-foreground',
      'inline-flex w-fit items-center justify-start gap-1 text-muted-foreground',
    ],
    [
      '-mb-px inline-flex h-9 flex-1 items-center justify-center gap-2 border-b-2 border-transparent px-1 text-sm',
      'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm',
    ],
    ['ring-ring/40focus-visible', 'ring-ring/40 focus-visible'],
    [
      'data-[state=active]:border-primary data-[state=active]:text-foreground',
      'data-[state=active]:bg-accent data-[state=active]:text-accent-foreground',
    ],
  ],
  'textarea.tsx': [
    ['rounded-md border bg-popover px-3 py-2', 'rounded-2xl border bg-popover px-4 py-3'],
  ],
  'badge.tsx': [
    ['rounded-sm border px-2 py-0.5', 'rounded-full border px-2.5 py-0.5'],
  ],
  // not inspected yet: reported if the pattern is missing
  'alert.tsx': [['rounded-lg border', 'rounded-2xl border']],
  'alert-dialog.tsx': [['rounded-lg border', 'rounded-3xl border-0']],
}

let problems = 0
for (const [file, list] of Object.entries(edits)) {
  const path = dir + file
  if (!fs.existsSync(path)) {
    console.log(`MISSING FILE  ${path}`)
    problems++
    continue
  }
  let text = fs.readFileSync(path, 'utf8')
  for (const [from, to] of list) {
    const parts = text.split(from)
    const count = parts.length - 1
    if (count === 0) {
      const done = text.includes(to)
      console.log(`${done ? 'already done' : 'NOT FOUND   '}  ${file}: ${from.slice(0, 60)}`)
      if (!done) problems++
      continue
    }
    text = parts.join(to)
    console.log(`ok (${count}x)       ${file}: ${from.slice(0, 60)}`)
  }
  fs.writeFileSync(path, text)
}
console.log(problems ? `\n${problems} item(s) need a look.` : '\nAll edits applied.')
