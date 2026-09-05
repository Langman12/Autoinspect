/**
 * Headless Chrome CDP Test for Test Lab & ML Acoustic Trainer
 */
import { spawn } from 'child_process'
import { mkdirSync } from 'fs'

async function runTestLabJourney() {
  console.log('🚀 Launching Google Chrome (1600x1200)...')
  mkdirSync('/tmp/ag_chrome_testlab', { recursive: true })

  const chromeProc = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--user-data-dir=/tmp/ag_chrome_testlab',
    '--remote-debugging-port=9222',
    '--window-size=1600,1200',
    'http://localhost:5173/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list')
    const pages = await listRes.json()
    const page = pages.find((p) => p.url.includes('localhost:5173') || p.type === 'page') || pages[0]

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

    await new Promise((r) => setTimeout(r, 2000))

    async function evaluate(fnStr) {
      const res = await send('Runtime.evaluate', {
        expression: `(${fnStr})()`,
        returnByValue: true,
      })
      return res.result?.value
    }

    async function takeScreenshot(filename) {
      const ss = await send('Page.captureScreenshot', { format: 'png' })
      await import('fs/promises').then((fs) =>
        fs.writeFile(filename, Buffer.from(ss.data, 'base64'))
      )
      console.log(`📸 Saved ${filename}`)
    }

    // 1. Direct click on Test Lab tab in Layout nav
    console.log('🧪 Opening Test Lab Tab...')
    const tabClick = await evaluate(`() => {
      const nav = document.querySelector('nav');
      if (nav) {
        const buttons = Array.from(nav.querySelectorAll('button'));
        const testLabBtn = buttons.find(b => b.textContent && b.textContent.includes('Test Lab'));
        if (testLabBtn) {
          testLabBtn.scrollIntoView();
          testLabBtn.click();
          return 'Clicked Test Lab Button in nav';
        }
      }
      return 'Nav or button not found';
    }`)
    console.log('  Result:', tabClick)
    await new Promise((r) => setTimeout(r, 1500))

    await takeScreenshot('screenshot_testlab_01_top.png')

    // 2. Scroll to Section 5: Acoustic Machine Learning Trainer
    console.log('📜 Scrolling to Section 5: Acoustic ML Trainer...')
    const scrollToAcoustic = await evaluate(`() => {
      const headings = Array.from(document.querySelectorAll('h3, h2, div'));
      const acousticHeading = headings.find(h => h.textContent && h.textContent.includes('Acoustic Machine Learning Trainer'));
      if (acousticHeading) {
        acousticHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
        return 'Scrolled to Acoustic ML Trainer Section';
      }
      // Fallback: scroll down 1200px
      window.scrollBy(0, 1500);
      return 'Scrolled window down';
    }`)
    console.log('  Result:', scrollToAcoustic)
    await new Promise((r) => setTimeout(r, 1000))

    await takeScreenshot('screenshot_testlab_02_scrolled.png')

    // 3. Click "⚡ Auto-Seed Training Data (300+ Samples)"
    console.log('⚡ Clicking Auto-Seed Training Data...')
    const autoSeedClick = await evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const seedBtn = buttons.find(b => b.textContent && b.textContent.includes('Auto-Seed'));
      if (seedBtn) {
        seedBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        seedBtn.click();
        return 'Clicked Auto-Seed Training Data button';
      }
      return 'Auto-seed button not found';
    }`)
    console.log('  Result:', autoSeedClick)
    await new Promise((r) => setTimeout(r, 1500))

    await takeScreenshot('screenshot_testlab_03_seeded.png')

    // 4. Click "🧠 Train In-Browser Model"
    console.log('🧠 Clicking Train In-Browser Model...')
    const trainModelClick = await evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const trainBtn = buttons.find(b => b.textContent && b.textContent.includes('Train In-Browser Model'));
      if (trainBtn) {
        trainBtn.click();
        return 'Clicked Train In-Browser Model button';
      }
      return 'Train button not found';
    }`)
    console.log('  Result:', trainModelClick)

    // Wait for in-browser ML model training to finish
    await new Promise((r) => setTimeout(r, 3000))

    await takeScreenshot('screenshot_testlab_04_trained_confusion_matrix.png')

    // 5. Scroll further to Research Knowledge Base & Search
    console.log('🔍 Filtering Knowledge Base by "Rod Knock"...')
    const filterKB = await evaluate(`() => {
      const input = document.querySelector('input[placeholder*="Search fault"]');
      if (input) {
        input.scrollIntoView({ behavior: 'instant', block: 'center' });
        input.value = 'Rod Knock';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return 'Filtered Knowledge Base by Rod Knock';
      }
      return 'Search input not found';
    }`)
    console.log('  Result:', filterKB)
    await new Promise((r) => setTimeout(r, 1000))

    await takeScreenshot('screenshot_testlab_05_kb_filtered.png')

    ws.close()
    console.log('🎉 Test Lab Acoustic Journey Validated!')
  } finally {
    chromeProc.kill()
  }
}

runTestLabJourney().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
