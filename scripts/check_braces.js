const fs = require('fs')

const source = fs.readFileSync('src/renderer/src/store/useProjectStore.ts', 'utf8')
let index = 0
let line = 1
let column = 1
let state = 'code'
const stack = []

while (index < source.length) {
  const ch = source[index]
  const next = source[index + 1]

  if (ch === '\n') {
    line += 1
    column = 1
    index += 1
    if (state === 'line-comment') state = 'code'
    continue
  }

  if (state === 'code') {
    if (ch === '/' && next === '/') {
      state = 'line-comment'
      index += 2
      column += 2
      continue
    }
    if (ch === '/' && next === '*') {
      state = 'block-comment'
      index += 2
      column += 2
      continue
    }
    if (ch === "'") {
      state = 'single-quote'
      index += 1
      column += 1
      continue
    }
    if (ch === '"') {
      state = 'double-quote'
      index += 1
      column += 1
      continue
    }
    if (ch === '`') {
      state = 'template'
      index += 1
      column += 1
      continue
    }
    if (ch === '{') {
      stack.push({ line, column })
      index += 1
      column += 1
      continue
    }
    if (ch === '}') {
      if (!stack.length) {
        console.log(`extra closing brace at ${line}:${column}`)
        process.exit(0)
      }
      stack.pop()
      index += 1
      column += 1
      continue
    }

    index += 1
    column += 1
    continue
  }

  if (state === 'block-comment') {
    if (ch === '*' && next === '/') {
      state = 'code'
      index += 2
      column += 2
      continue
    }
    index += 1
    column += 1
    continue
  }

  if (state === 'single-quote') {
    if (ch === '\\') {
      index += 2
      column += 2
      continue
    }
    if (ch === "'") {
      state = 'code'
      index += 1
      column += 1
      continue
    }
    index += 1
    column += 1
    continue
  }

  if (state === 'double-quote') {
    if (ch === '\\') {
      index += 2
      column += 2
      continue
    }
    if (ch === '"') {
      state = 'code'
      index += 1
      column += 1
      continue
    }
    index += 1
    column += 1
    continue
  }

  if (state === 'template') {
    if (ch === '\\') {
      index += 2
      column += 2
      continue
    }
    if (ch === '`') {
      state = 'code'
      index += 1
      column += 1
      continue
    }
    if (ch === '$' && next === '{') {
      stack.push({ line, column })
      state = 'code'
      index += 2
      column += 2
      continue
    }
    index += 1
    column += 1
    continue
  }
}

if (!stack.length) {
  console.log('balanced braces')
} else {
  const last = stack[stack.length - 1]
  console.log(`unclosed brace count=${stack.length}, last opened at ${last.line}:${last.column}`)
}
