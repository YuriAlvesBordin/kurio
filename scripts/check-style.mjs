import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import ts from 'typescript'

const ROOT = process.cwd()
const IGNORED = new Set(['node_modules', 'dist', 'dist-e2e', 'reports', 'playwright-report', 'test-results', 'lighthouse-reports', '.git', 'public', 'e2e-snapshots'])
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs'])
const TEXT_EXTENSIONS = new Set(['.md', '.html', '.json', '.css', '.yml', '.yaml', '.txt'])
const problems = []
const DASH = String.fromCharCode(8212)

/**
 * Lists every project file that must follow the style rules.
 * @param dir directory to walk
 */
function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry) || entry.endsWith('.png') || entry === 'package-lock.json') continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else if (CODE_EXTENSIONS.has(extname(entry)) || TEXT_EXTENSIONS.has(extname(entry))) files.push(path)
  }
  return files
}

/**
 * Records a style problem with its location.
 * @param file absolute file path
 * @param text file content
 * @param index character offset
 * @param message what is wrong
 */
function report(file, text, index, message) {
  const line = text.slice(0, index).split('\n').length
  problems.push(`${relative(ROOT, file)}:${line} ${message}`)
}

/**
 * Checks whether a node is something a top of function comment may describe.
 * @param node syntax node that follows a comment
 */
function isDocumentable(node) {
  if (!node) return false
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isClassDeclaration(node) || ts.isConstructorDeclaration(node)) return true
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.some((declaration) => {
      const init = declaration.initializer
      if (!init) return false
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return true
      return ts.isCallExpression(init) && init.arguments.some((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))
    })
  }
  return false
}

/**
 * Applies the comment, semicolon and dash rules to a TypeScript or JavaScript file.
 * @param file absolute path
 * @param text content
 */
function checkCode(file, text) {
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind)
  const allowed = new Set()

  const visit = (node) => {
    if (isDocumentable(node)) {
      for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) {
        if (text.startsWith('/**', range.pos)) allowed.add(range.pos)
      }
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || node.kind === ts.SyntaxKind.JsxText) {
      const value = node.getText(source)
      if (value.includes(';') && !/^\s*$/.test(value) && !file.endsWith('check-style.mjs')) {
        const isCss = /style|className|import|from/.test(node.parent?.getText(source).slice(0, 20) ?? '')
        if (!isCss) report(file, text, node.getStart(source), 'semicolon inside text')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  const comments = new Map()
  const collect = (node) => {
    const ranges = [...(ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []), ...(ts.getTrailingCommentRanges(text, node.getEnd()) ?? [])]
    for (const range of ranges) comments.set(range.pos, range)
    ts.forEachChild(node, collect)
  }
  collect(source)
  for (const pos of comments.keys()) {
    if (!allowed.has(pos) && !text.startsWith('#!', pos)) report(file, text, pos, 'comment is not a top of function description')
  }
}

/**
 * Applies the semicolon rule to prose files, ignoring fenced and inline code.
 * @param file absolute path
 * @param text content
 */
function checkMarkdown(file, text) {
  let fenced = false
  let offset = 0
  for (const line of text.split('\n')) {
    if (line.trim().startsWith('```')) fenced = !fenced
    else if (!fenced && line.replace(/`[^`]*`/g, '').includes(';')) report(file, text, offset, 'semicolon inside text')
    offset += line.length + 1
  }
}

for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8')
  let dash = text.indexOf(DASH)
  while (dash !== -1) {
    report(file, text, dash, 'em dash')
    dash = text.indexOf(DASH, dash + 1)
  }
  if (CODE_EXTENSIONS.has(extname(file))) checkCode(file, text)
  else if (extname(file) === '.md') checkMarkdown(file, text)
}

if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`\n${problems.length} style problem(s) found`)
  process.exit(1)
}
console.log('Style check passed')
