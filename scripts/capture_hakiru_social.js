// scripts/capture_hakiru_social.js
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\cbf081a6-479b-4bd9-af21-8a642df38c72';

async function capture() {
  console.log('Launching headless Chrome for Hakiru social & solvency screenshots...');
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9235',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100',
    'http://localhost:3000/app.html?vault=xlm'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9235/json', async (res) => {
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
        await new Promise(r => setTimeout(r, 1200));

        // 1. Open and verify Solvency Modal
        console.log('1. Capturing Proof of Solvency Verification Modal...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btnOpen = document.getElementById('btnOpenSolvencyModal');
              if (btnOpen) btnOpen.click();
              const btnVerify = document.getElementById('btnVerifyInclusionProof');
              if (btnVerify) btnVerify.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1000));
        const shotSolvency = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_app_solvency_modal.png'), Buffer.from(shotSolvency.result.data, 'base64'));
        console.log('Saved screenshot_app_solvency_modal.png');

        // Close Solvency modal and open Social Pulse dock
        console.log('2. Capturing Live Social Pulse Dock Widget...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btnClose = document.getElementById('btnCloseSolvencyModal');
              if (btnClose) btnClose.click();
              const btnPulse = document.getElementById('btnToggleSocialPulse');
              if (btnPulse) btnPulse.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1000));
        const shotPulse = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_app_social_pulse.png'), Buffer.from(shotPulse.result.data, 'base64'));
        console.log('Saved screenshot_app_social_pulse.png');

        // Clean up
        ws.close();
        chromeProc.kill();
        console.log('All Hakiru visual screenshots captured successfully!');
        process.exit(0);
      };
    });
  });
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
