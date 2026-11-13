import { spawn } from 'node:child_process'
import os from 'node:os'
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
  for (let attempt = 1; ; attempt += 1) {
    let chrome
    try {
      chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] })
      const flags = { port: chrome.port, output: ['json', 'html'], onlyCategories: config.categories, logLevel: 'error' }
      return await lighthouse(url, flags, formFactor === 'desktop' ? desktopConfig : undefined)
    } catch (error) {
      if (attempt >= 3) throw error
      console.warn(`audit of ${url} (${formFactor}) failed on attempt ${attempt}: ${error.message}. Retrying.`)
      await sleep(2000)
    } finally {
      await chrome?.kill()
    }
  }
}

await mkdir(config.outputDir, { recursive: true })
const server = await startServer()
const summary = []
let environment = null
try {
  for (const page of config.pages) {
    for (const formFactor of config.formFactors) {
      const samples = []
      for (let run = 1; run <= config.runs; run += 1) {
        const result = await audit(`${base}${page.path}`, formFactor)
        const lhr = result.lhr
        environment ??= {
          lighthouse: lhr.lighthouseVersion,
          axeCore: lhr.environment.credits?.['axe-core'],
          chrome: lhr.environment.hostUserAgent.match(/Chrome\/[\d.]+/)?.[0],
          benchmarkIndex: lhr.environment.benchmarkIndex,
          throttlingMethod: lhr.configSettings.throttlingMethod,
          mobileThrottling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
          node: process.version,
          platform: `${os.type()} ${os.release()} ${os.arch()}`,
          cpus: `${os.cpus().length}x ${os.cpus()[0]?.model ?? 'unknown'}`,
          memoryGb: Math.round(os.totalmem() / 2 ** 30),
          measuredAt: lhr.fetchTime,
        }
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
await writeFile(`${config.outputDir}/summary.json`, JSON.stringify({ targets: config.targets, environment, results: summary }, null, 2))
const notes = [
  '',
  '## Ambiente e condições de execução',
  '',
  `- Lighthouse ${environment.lighthouse} (axe-core ${environment.axeCore}), ${environment.chrome} headless, Node ${environment.node}`,
  `- Sistema: ${environment.platform}, ${environment.cpus}, ${environment.memoryGb} GB de RAM, benchmarkIndex ${Math.round(environment.benchmarkIndex)}`,
  `- Alvo: build de produção (npm run build) servido por vite preview em 127.0.0.1, cenário padrão dos mocks, sem simplificações de imagem, fonte ou funcionalidade`,
  `- Throttling ${environment.throttlingMethod}: mobile com RTT 150 ms, 1638 kbps e CPU 4x mais lenta, desktop com o perfil padrão do Lighthouse`,
  `- ${config.runs} medições por página e perfil, mediana por categoria. Medido em ${environment.measuredAt}`,
  '- Metas: ' + Object.entries(config.targets).map(([key, value]) => `${key} >= ${value}`).join(', '),
  '',
]
await writeFile(`${config.outputDir}/summary.md`, `${table}\n${notes.join('\n')}`)
console.log(table)
