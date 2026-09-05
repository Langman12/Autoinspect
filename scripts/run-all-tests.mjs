import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
}

async function findTestFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const files = entries
      .filter((e) => e.isFile() && (e.name.endsWith('.test.mjs') || e.name.endsWith('-unit.mjs')))
      .map((e) => join(dir, e.name))
    return files
  } catch {
    return []
  }
}

async function runTestFile(filePath) {
  return new Promise((resolve) => {
    const start = performance.now()
    const proc = spawn('node', ['--experimental-strip-types', filePath], {
      stdio: 'pipe',
      env: process.env,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))

    proc.on('close', (code) => {
      const duration = (performance.now() - start).toFixed(2)
      resolve({
        filePath,
        code,
        duration,
        stdout,
        stderr,
      })
    })
  })
}

async function main() {
  console.log(`\n${ANSI.bold}${ANSI.cyan}================================================================================${ANSI.reset}`)
  console.log(`${ANSI.bold}${ANSI.cyan}   🛡️  AUTOGUARD AI — MASTER TEST RUNNER & VERIFICATION HARNESS              ${ANSI.reset}`)
  console.log(`${ANSI.bold}${ANSI.cyan}================================================================================${ANSI.reset}\n`)

  const unitDir = join(process.cwd(), 'tests', 'unit')
  const integrationDir = join(process.cwd(), 'tests', 'integration')
  const e2eDir = join(process.cwd(), 'tests', 'e2e')
  const scriptsDir = join(process.cwd(), 'scripts')

  const unitFiles = await findTestFiles(unitDir)
  const integrationFiles = await findTestFiles(integrationDir)
  const e2eFiles = await findTestFiles(e2eDir)
  const legacyUnitFiles = (await findTestFiles(scriptsDir)).filter(f => f.includes('test-weather-unit') || f.includes('test-recall-unit'))

  const allTestFiles = [...unitFiles, ...integrationFiles, ...e2eFiles, ...legacyUnitFiles]

  if (allTestFiles.length === 0) {
    console.error(`${ANSI.red}❌ No test files found in tests/ or scripts/!${ANSI.reset}`)
    process.exit(1)
  }

  console.log(`${ANSI.gray}Discovered ${allTestFiles.length} test suite files across unit, integration, and e2e categories...${ANSI.reset}\n`)

  let passedSuites = 0
  let failedSuites = 0
  let totalDurationMs = 0

  for (const file of allTestFiles) {
    const relPath = file.replace(process.cwd() + '/', '')
    process.stdout.write(`  ▶ Running ${ANSI.bold}${relPath}${ANSI.reset} ... `)

    const result = await runTestFile(file)
    totalDurationMs += parseFloat(result.duration)

    if (result.code === 0) {
      passedSuites++
      console.log(`${ANSI.green}✔ PASSED${ANSI.reset} ${ANSI.gray}(${result.duration}ms)${ANSI.reset}`)
    } else {
      failedSuites++
      console.log(`${ANSI.red}✖ FAILED${ANSI.reset} ${ANSI.gray}(${result.duration}ms)${ANSI.reset}`)
      console.error(`\n${ANSI.red}Error output for ${relPath}:${ANSI.reset}\n${result.stderr || result.stdout}\n`)
    }
  }

  console.log(`\n${ANSI.bold}${ANSI.cyan}--------------------------------------------------------------------------------${ANSI.reset}`)
  console.log(`${ANSI.bold}TEST EXECUTION SUMMARY:${ANSI.reset}`)
  console.log(`  • Total Suites:  ${ANSI.bold}${allTestFiles.length}${ANSI.reset}`)
  console.log(`  • Suites Passed: ${ANSI.green}${passedSuites}${ANSI.reset}`)
  console.log(`  • Suites Failed: ${failedSuites > 0 ? ANSI.red + failedSuites : ANSI.gray + '0'}${ANSI.reset}`)
  console.log(`  • Total Time:    ${ANSI.bold}${totalDurationMs.toFixed(2)}ms${ANSI.reset}`)
  console.log(`${ANSI.bold}${ANSI.cyan}================================================================================${ANSI.reset}\n`)

  if (failedSuites > 0) {
    process.exit(1)
  } else {
    console.log(`${ANSI.green}${ANSI.bold}✅ ALL AUTOGUARD AI TEST SUITES PASSED CLEANLY WITH ZERO REGRESSIONS.${ANSI.reset}\n`)
    process.exit(0)
  }
}

main()
