import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const config = JSON.parse(await readFile(new URL('../lighthouse/config.json', import.meta.url), 'utf8'))
const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const base = `http://127.0.0.1:${config.port}`

/**
 * Computes the median of a list of numbers.
 * @param values numeric samples
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Starts vite preview for the production build and waits until it answers.
 */
async function startServer() {
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(config.port), '--strictPort'], { stdio: 'ignore' })
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(base)
      if (response.ok) return child
    } catch {
      await sleep(500)
    }
  }
  child.kill()
  throw new Error('Preview server did not start. Run npm run build first.')
}

/**
 * Runs one Lighthouse audit in a fresh Chrome instance.
 * @param url page address
 * @param formFactor mobile or desktop
 */
async function audit(url, formFactor) {
  const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] })
  try {
    const flags = { port: chrome.port, output: ['json', 'html'], onlyCategories: config.categories, logLevel: 'error' }
    return await lighthouse(url, flags, formFactor === 'desktop' ? desktopConfig : undefined)
  } finally {
    await chrome.kill()
  }
}

await mkdir(config.outputDir, { recursive: true })
const server = await startServer()
const summary = []
try {
  for (const page of config.pages) {
    for (const formFactor of config.formFactors) {
      const samples = []
      for (let run = 1; run <= config.runs; run += 1) {
        const result = await audit(`${base}${page.path}`, formFactor)
        const lhr = result.lhr
        const stem = `${config.outputDir}/${page.id}-${formFactor}-run${run}`
        await writeFile(`${stem}.json`, result.report[0])
        await writeFile(`${stem}.html`, result.report[1])
        samples.push({
          performance: Math.round(lhr.categories.performance.score * 100),
          accessibility: Math.round(lhr.categories.accessibility.score * 100),
          bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
          seo: Math.round(lhr.categories.seo.score * 100),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
        })
      }
      const keys = Object.keys(samples[0])
      const medians = Object.fromEntries(keys.map((key) => [key, median(samples.map((sample) => sample[key]))]))
      summary.push({ page: page.id, formFactor, runs: samples, median: medians })
      console.log(page.id, formFactor, JSON.stringify(medians))
    }
  }
} finally {
  server.kill()
}

const rows = summary.map((entry) => {
  const m = entry.median
  return `| ${entry.page} | ${entry.formFactor} | ${m.performance} | ${m.accessibility} | ${m.bestPractices} | ${m.seo} | ${Math.round(m.lcp)} ms | ${m.cls.toFixed(3)} | ${Math.round(m.tbt)} ms |`
})
const table = ['| Página | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |', ...rows].join('\n')
await writeFile(`${config.outputDir}/summary.json`, JSON.stringify({ targets: config.targets, results: summary }, null, 2))
await writeFile(`${config.outputDir}/summary.md`, `${table}\n`)
console.log(table)
