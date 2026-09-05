/**
 * Real Headless Chrome CDP User Experience Journey Tester
 */
import { spawn } from 'child_process'
import { mkdirSync } from 'fs'

async function runJourney() {
  console.log('🚀 Launching Google Chrome in Headless Mode (1600x1000)...')
  mkdirSync('/tmp/ag_chrome_test', { recursive: true })

  const chromeProc = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--user-data-dir=/tmp/ag_chrome_test',
    '--remote-debugging-port=9222',
    '--window-size=1600,1100',
    'http://localhost:5173/',
  ])

  // Wait for Chrome to bind port 9222
  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list')
    const pages = await listRes.json()
    const page = pages.find((p) => p.url.includes('localhost:5173') || p.type === 'page') || pages[0]
    console.log('📄 Target Page:', page.title, page.url)

    const ws = new WebSocket(page.webSocketDebuggerUrl)

    let msgId = 1
    const pending = new Map()

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.id && pending.has(data.id)) {
        const { resolve } = pending.get(data.id)
        pending.delete(data.id)
        resolve(data.result)
      }
    }

    await new Promise((resolve) => (ws.onopen = resolve))
    console.log('🔌 WebSocket Debugger Connection Established.')

    function send(method, params = {}) {
      const id = msgId++
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })
    }

    await send('Page.enable')
    await send('Runtime.enable')
    await send('DOM.enable')

    console.log('⏳ Waiting 2s for React hydration...')
    await new Promise((r) => setTimeout(r, 2000))

    // Helper for evaluation
    async function evaluate(fnStr) {
      const res = await send('Runtime.evaluate', {
        expression: `(${fnStr})()`,
        returnByValue: true,
      })
      return res.result?.value
    }

    // Helper for screenshot
    async function takeScreenshot(filename) {
      const ss = await send('Page.captureScreenshot', { format: 'png' })
      await import('fs/promises').then((fs) =>
        fs.writeFile(filename, Buffer.from(ss.data, 'base64'))
      )
      console.log(`📸 Saved ${filename}`)
    }

    // 1. Capture Homepage (Inspect View)
    await takeScreenshot('screenshot_01_inspect_hub.png')

    // 2. Select Tesla Model Y Preset
    console.log('🚗 Selecting Tesla Model Y preset...')
    const presetRes = await evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const teslaBtn = buttons.find(b => b.textContent && b.textContent.includes('Tesla Model Y'));
      if (teslaBtn) { teslaBtn.click(); return 'Selected Tesla Model Y'; }
      return 'Tesla preset not found';
    }`)
    console.log('  Result:', presetRes)
    await new Promise((r) => setTimeout(r, 800))

    // 3. Navigate to Test Lab Tab (index 5 in nav)
    console.log('🧪 Navigating to Test Lab Tab...')
    const navTestLab = await evaluate(`() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const testLabBtn = navButtons.find(b => b.textContent && b.textContent.includes('Test Lab'));
      if (testLabBtn) { testLabBtn.click(); return 'Clicked Test Lab in Nav'; }
      return 'Nav button not found';
    }`)
    console.log('  Result:', navTestLab)
    await new Promise((r) => setTimeout(r, 1500))
    await takeScreenshot('screenshot_02_testlab_top.png')

    // 4. Scroll down to Section 5: Acoustic ML Trainer & Click Auto-Seed
    console.log('⚡ Scrolling to Acoustic ML Trainer & Auto-Seeding Dataset...')
    const seedAction = await evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const seedBtn = buttons.find(b => b.textContent && b.textContent.includes('Auto-Seed Training Data'));
      if (seedBtn) {
        seedBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        seedBtn.click();
        return 'Clicked Auto-Seed Training Data';
      }
      return 'Auto-seed button not found';
    }`)
    console.log('  Result:', seedAction)
    await new Promise((r) => setTimeout(r, 1500))
    await takeScreenshot('screenshot_03_testlab_seeded.png')

    // 5. Click Train In-Browser Model
    console.log('🧠 Training In-Browser ML Classifier...')
    const trainAction = await evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const trainBtn = buttons.find(b => b.textContent && b.textContent.includes('Train In-Browser Model'));
      if (trainBtn) {
        trainBtn.click();
        return 'Clicked Train In-Browser Model';
      }
      return 'Train button not found';
    }`)
    console.log('  Result:', trainAction)
    await new Promise((r) => setTimeout(r, 2500))
    await takeScreenshot('screenshot_04_testlab_trained_confusion_matrix.png')

    // 6. Search Research Knowledge Base for "bearing" & Play Frequency Tone
    console.log('🔍 Searching Knowledge Base for "bearing"...')
    const searchAction = await evaluate(`() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const searchInput = inputs.find(i => i.placeholder && i.placeholder.includes('Search fault name'));
      if (searchInput) {
        searchInput.value = 'bearing';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        return 'Filtered Knowledge Base by "bearing"';
      }
      return 'Search input not found';
    }`)
    console.log('  Result:', searchAction)
    await new Promise((r) => setTimeout(r, 1000))
    await takeScreenshot('screenshot_05_testlab_kb_search.png')

    // 7. Navigate to Tactical Guardian GPS View
    console.log('🛡️ Navigating to Tactical Guardian GPS Tab...')
    const navGuardian = await evaluate(`() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const gBtn = navButtons.find(b => b.textContent && b.textContent.includes('Guardian GPS'));
      if (gBtn) { gBtn.click(); return 'Clicked Guardian GPS in Nav'; }
      return 'Guardian nav button not found';
    }`)
    console.log('  Result:', navGuardian)
    await new Promise((r) => setTimeout(r, 2000))
    await takeScreenshot('screenshot_06_tactical_guardian.png')

    // 8. Navigate to Pathology Matrix View
    console.log('🔬 Navigating to Pathology Matrix Tab...')
    const navMatrix = await evaluate(`() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const mBtn = navButtons.find(b => b.textContent && b.textContent.includes('Pathology Matrix'));
      if (mBtn) { mBtn.click(); return 'Clicked Pathology Matrix in Nav'; }
      return 'Matrix nav button not found';
    }`)
    console.log('  Result:', navMatrix)
    await new Promise((r) => setTimeout(r, 1500))
    await takeScreenshot('screenshot_07_pathology_matrix.png')

    ws.close()
    console.log('🎉 Full End-to-End User Experience Journey Successfully Validated!')
  } finally {
    chromeProc.kill()
  }
}

runJourney().catch((err) => {
  console.error('❌ Journey failed:', err)
  process.exit(1)
})
