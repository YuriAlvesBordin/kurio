import { scenarioIds, type ScenarioId } from '@/api/contracts'
import { createRandom } from './random'
import { resolveScenario, type Scenario } from './scenarios'

const SCENARIO_KEY = 'kurio.mock.scenario'

interface Runtime {
  scenario: Scenario
  random: () => number
  ruleHits: Map<number, number>
  authedCalls: number
  orderTimeoutUsed: boolean
  priceChangeUsed: boolean
  soldOutUsed: boolean
}

const MANUAL_KEY = 'kurio.mock.manual'

/**
 * Reads whether orders must wait for a manual settlement. The flag lives in session storage so a reload keeps it.
 */
function readManualSettlement(): boolean {
  try {
    return sessionStorage.getItem(MANUAL_KEY) === '1'
  } catch {
    return false
  }
}

export const settings = {
  orderSettleMs: Number(import.meta.env.VITE_MOCK_ORDER_SETTLE_MS ?? 1800),
  manualSettlement: readManualSettlement(),
  latencyScale: Number(import.meta.env.VITE_MOCK_LATENCY_SCALE ?? 1),
  orderTimeoutHangMs: Number(import.meta.env.VITE_MOCK_ORDER_HANG_MS ?? 15000),
}

/**
 * Builds a fresh runtime so counters restart whenever the scenario changes.
 * @param scenario active scenario
 */
function createRuntime(scenario: Scenario): Runtime {
  return {
    scenario,
    random: createRandom(scenario.latency.seed),
    ruleHits: new Map(),
    authedCalls: 0,
    orderTimeoutUsed: false,
    priceChangeUsed: false,
    soldOutUsed: false,
  }
}

/**
 * Reads the initial scenario from the URL, then storage, then the build default.
 * A scenario given in the URL is persisted so later navigations and reloads keep it.
 */
function initialScenario(): Scenario {
  let candidate: string | null = null
  try {
    candidate = new URLSearchParams(window.location.search).get('scenario')
    if (candidate) localStorage.setItem(SCENARIO_KEY, candidate)
    else candidate = localStorage.getItem(SCENARIO_KEY)
  } catch {
    candidate = null
  }
  return resolveScenario(candidate ?? import.meta.env.VITE_DEFAULT_SCENARIO)
}

let runtime: Runtime = createRuntime(initialScenario())

/**
 * Returns the mutable runtime state of the active scenario.
 */
export function current(): Runtime {
  return runtime
}

/**
 * Activates a scenario, persists the choice and restarts its counters.
 * @param id scenario identifier
 */
export function setScenario(id: ScenarioId): Scenario {
  const scenario = resolveScenario(id)
  runtime = createRuntime(scenario)
  try {
    localStorage.setItem(SCENARIO_KEY, scenario.id)
  } catch {
    return scenario
  }
  return scenario
}

/**
 * Lists the available scenario identifiers for tooling and documentation.
 */
export function listScenarioIds(): readonly ScenarioId[] {
  return scenarioIds
}

/**
 * Computes the simulated latency for the next request using the seeded generator.
 */
export function nextLatencyMs(): number {
  const { minMs, maxMs } = runtime.scenario.latency
  return Math.round((minMs + runtime.random() * (maxMs - minMs)) * settings.latencyScale)
}

/**
 * Switches between automatic and manual order settlement and remembers the choice for this tab.
 * @param value true to keep new orders pending until they are settled by hand
 */
export function setManualSettlement(value: boolean): void {
  settings.manualSettlement = value
  try {
    if (value) sessionStorage.setItem(MANUAL_KEY, '1')
    else sessionStorage.removeItem(MANUAL_KEY)
  } catch {
    return
  }
}
