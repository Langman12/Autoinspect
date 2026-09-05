/**
 * Headless Chrome CDP Test for Train ML Model & Confusion Matrix
 */
import { spawn } from 'child_process'
import { mkdirSync } from 'fs'

async function runTrainModel() {
  console.log('🚀 Launching Google Chrome (1600x1200)...')
  mkdirSync('/tmp/ag_chrome_train', { recursive: true })

  const chromeProc = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--user-data-dir=/tmp/ag_chrome_train',
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

    // 1. Open Test Lab Tab
    await evaluate(`() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const testLabBtn = navButtons.find(b => b.textContent && b.textContent.includes('Test Lab'));
      if (testLabBtn) testLabBtn.click();
    }`)
    await new Promise((r) => setTimeout(r, 1500))

    // 2. Click "⚡ Auto-Seed Dataset"
    console.log('⚡ Auto-seeding dataset...')
    const seedRes = await evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const seedBtn = buttons.find(b => b.textContent && b.textContent.includes('Auto-Seed'));
      if (seedBtn) {
        seedBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        seedBtn.click();
        return 'Auto-seed clicked';
      }
      return 'Auto-seed button not found';
    }`)
    console.log('  Result:', seedRes)
    await new Promise((r) => setTimeout(r, 1500))

    // 3. Click "Train ML Model"
    console.log('🧠 Triggering Train ML Model...')
    const trainRes = await evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const trainBtn = buttons.find(b => b.textContent && b.textContent.includes('Train ML Model'));
      if (trainBtn) {
        trainBtn.click();
        return 'Triggered Train ML Model click';
      }
      return 'Train ML Model button not found';
    }`)
    console.log('  Result:', trainRes)

    // Wait for in-browser training to complete and metrics to update
    await new Promise((r) => setTimeout(r, 2500))

    // 4. Scroll to show the trained confusion matrix and metrics
    await evaluate(`() => {
      const el = Array.from(document.querySelectorAll('h3, h4, div')).find(el => el.textContent && (el.textContent.includes('Confusion Matrix') || el.textContent.includes('Model Metrics')));
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    }`)
    await new Promise((r) => setTimeout(r, 1000))

    await takeScreenshot('screenshot_testlab_06_confusion_matrix_live.png')

    ws.close()
    console.log('🎉 Confusion Matrix & Live Model Metrics successfully captured!')
  } finally {
    chromeProc.kill()
  }
}

runTrainModel().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
