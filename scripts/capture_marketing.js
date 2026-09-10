// scripts/capture_marketing.js
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\cbf081a6-479b-4bd9-af21-8a642df38c72';

async function main() {
  console.log('Launching headless Chrome...');
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100',
    'http://localhost:3000?skipLoader=true'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9225/json', async (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const pageTab = tabs.find(t => t.type === 'page');
      const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

      let msgId = 1;
      function send(method, params = {}) {
        return new Promise((resolve) => {
          const id = msgId++;
          const handler = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id === id) {
              ws.removeEventListener('message', handler);
              resolve(msg);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      ws.onopen = async () => {
        await send('Runtime.enable');
        await send('Page.enable');
        await new Promise(r => setTimeout(r, 1500));

        // 1. Capture Hikari Earn section
        console.log('Capturing Hikari Earn section...');
        const earnRes = await send('Runtime.evaluate', {
          expression: `
            (() => {
              const el = document.getElementById('earnSection');
              if (el) {
                el.scrollIntoView({ block: 'start', behavior: 'instant' });
                return { found: true, y: window.scrollY, top: el.getBoundingClientRect().top };
              }
              return { found: false };
            })()
          `,
          returnByValue: true
        });
        console.log('Earn scroll result:', earnRes.result.value);
        await new Promise(r => setTimeout(r, 1200));
        const shotEarn = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_hikari_earn.png'), Buffer.from(shotEarn.result.data, 'base64'));
        console.log('Saved screenshot_hikari_earn.png');

        // 2. Capture hXLM feature showcase
        console.log('Capturing hXLM feature showcase...');
        const hxlmRes = await send('Runtime.evaluate', {
          expression: `
            (() => {
              const el = document.getElementById('hxlmSection');
              if (el) {
                el.scrollIntoView({ block: 'start', behavior: 'instant' });
                return { found: true, y: window.scrollY, top: el.getBoundingClientRect().top };
              }
              return { found: false };
            })()
          `,
          returnByValue: true
        });
        console.log('hXLM scroll result:', hxlmRes.result.value);
        await new Promise(r => setTimeout(r, 1200));
        const shotHxlm = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_hxlm_features.png'), Buffer.from(shotHxlm.result.data, 'base64'));
        console.log('Saved screenshot_hxlm_features.png');

        // 3. Capture Uncompromised Security
        console.log('Capturing Uncompromised Security section...');
        const secRes = await send('Runtime.evaluate', {
          expression: `
            (() => {
              const el = document.getElementById('securityShowcase');
              if (el) {
                el.scrollIntoView({ block: 'start', behavior: 'instant' });
                return { found: true, y: window.scrollY, top: el.getBoundingClientRect().top };
              }
              return { found: false };
            })()
          `,
          returnByValue: true
        });
        console.log('Security scroll result:', secRes.result.value);
        await new Promise(r => setTimeout(r, 1200));
        const shotSec = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_uncompromised_security.png'), Buffer.from(shotSec.result.data, 'base64'));
        console.log('Saved screenshot_uncompromised_security.png');

        // 4. Capture Node Operators & DAO Governance
        console.log('Capturing Node Operators & DAO Governance...');
        const govRes = await send('Runtime.evaluate', {
          expression: `
            (() => {
              const el = document.getElementById('governanceShowcase');
              if (el) {
                el.scrollIntoView({ block: 'start', behavior: 'instant' });
                return { found: true, y: window.scrollY, top: el.getBoundingClientRect().top };
              }
              return { found: false };
            })()
          `,
          returnByValue: true
        });
        console.log('Gov scroll result:', govRes.result.value);
        await new Promise(r => setTimeout(r, 1200));
        const shotGov = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_dao_governance.png'), Buffer.from(shotGov.result.data, 'base64'));
        console.log('Saved screenshot_dao_governance.png');

        // 5. Test Light Mode
        console.log('Switching to Light Mode and capturing...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              document.documentElement.setAttribute('data-theme', 'light');
              localStorage.setItem('theme', 'light');
              const el = document.getElementById('earnSection');
              if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1200));
        const shotLightEarn = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_light_earn.png'), Buffer.from(shotLightEarn.result.data, 'base64'));
        console.log('Saved screenshot_light_earn.png');

        // Done
        ws.close();
        chromeProc.kill();
        process.exit(0);
      };
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
