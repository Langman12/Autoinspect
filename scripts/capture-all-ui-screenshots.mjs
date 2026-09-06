import { spawn } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ARTIFACTS_DIR = '/home/nicholaas/.gemini/antigravity-ide/brain/c1799d99-4d3e-4dd2-8a97-868cf46934cb'
mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function captureAllScreenshots() {
  console.log('🚀 Launching Google Chrome for Extended UI Screenshots...')
  mkdirSync('/tmp/ag_screenshot_dir', { recursive: true })

  const chromeProc = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--allow-file-access-from-files',
    '--user-data-dir=/tmp/ag_screenshot_dir',
    '--remote-debugging-port=9333',
    '--window-size=1440,960',
    'http://localhost:5173/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://127.0.0.1:9333/json/list')
    const pages = await listRes.json()
    const page = pages.find((p) => p.type === 'page') || pages[0]

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

    async function capturePage(filename, waitMs = 1500) {
      await new Promise((r) => setTimeout(r, waitMs))
      const { data } = await send('Page.captureScreenshot', { format: 'png', quality: 100 })
      const filePath = resolve(ARTIFACTS_DIR, filename)
      writeFileSync(filePath, Buffer.from(data, 'base64'))
      console.log(`📸 Saved: ${filePath}`)
    }

    async function evaluate(expression) {
      return await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    }

    // 1. Live App: Inspect View
    console.log('Capturing Live App: Inspect View...')
    await send('Page.navigate', { url: 'http://localhost:5173/' })
    await capturePage('ui_01_inspect_hub.png', 2000)

    // 2. Live App: 3D Twin View
    console.log('Capturing Live App: 3D Twin View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('3D Twin'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_02_3d_digital_twin.png', 2000)

    // 3. Live App: Guardian GPS View
    console.log('Capturing Live App: Guardian GPS View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('Guardian GPS'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_03_guardian_gps_blackbox.png', 2000)

    // 4. Live App: OBD-II Telemetry View
    console.log('Capturing Live App: OBD-II Telemetry View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('OBD-II'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_04_obd2_can_telemetry.png', 2000)

    // 5. Live App: EV Battery Diagnostics View
    console.log('Capturing Live App: EV Battery Diagnostics View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('EV Diags'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_05_ev_battery_diags.png', 2000)

    // 6. Live App: Parts & Labor Matrix View
    console.log('Capturing Live App: Parts & Labor Matrix View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('Parts'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_06_parts_labor_matrix.png', 2000)

    // 7. Live App: AI Trade-In Valuation View
    console.log('Capturing Live App: Trade-In Valuation View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('Valuation'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_07_tradein_valuation.png', 2000)

    // 8. Live App: Vehicle Passport View
    console.log('Capturing Live App: Vehicle Passport View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('Passport'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_08_vehicle_passport.png', 2000)

    // 9. Live App: Tread & Thermal IR View
    console.log('Capturing Live App: Tread & Thermal View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('Tread/IR'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_09_tread_laser_thermal.png', 2000)

    // 10. Live App: AR Holographic Spatial Camera View
    console.log('Capturing Live App: AR Holographic Spatial Camera View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('AR HUD'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_10_ar_spatial_overlay.png', 2000)

    // 11. Live App: Fleet Analytics View
    console.log('Capturing Live App: Fleet Analytics View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('Fleet'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await capturePage('ui_11_fleet_analytics.png', 2000)

    // 12. Live App: Test Lab View
    console.log('Capturing Live App: Test Lab View...')
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll('button, span')).filter(el => el.textContent.includes('Test Lab'));
      if (tabs.length > 0) tabs[0].click();
    `)
    await evaluate(`
      const seedBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Auto-Seed') || b.textContent.includes('Seed'));
      if (seedBtn) seedBtn.click();
    `)
    await new Promise((r) => setTimeout(r, 600))
    await evaluate(`
      const trainBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Train Classifier') || b.textContent.includes('Train'));
      if (trainBtn) trainBtn.click();
    `)
    await capturePage('ui_12_test_lab.png', 2500)

    console.log('🎉 All 12 Extended UI Screenshots captured successfully!')
  } catch (err) {
    console.error('Error during screenshot capture:', err)
  } finally {
    chromeProc.kill()
  }
}

captureAllScreenshots()
