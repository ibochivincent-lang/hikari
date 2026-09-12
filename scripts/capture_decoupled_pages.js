// scripts/capture_decoupled_pages.js
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\cbf081a6-479b-4bd9-af21-8a642df38c72';

async function capture() {
  console.log('Launching headless Chrome for verification screenshots...');
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100',
    'http://localhost:3000?skipLoader=true'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9229/json', async (res) => {
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

        // 1a. Capture Landing Page Topnav and Hero
        console.log('1a. Capturing Landing Page Topnav and Hero...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              window.scrollTo({ top: 0, behavior: 'instant' });
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1200));
        const shotLandingHero = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_landing_hero.png'), Buffer.from(shotLandingHero.result.data, 'base64'));
        console.log('Saved screenshot_landing_hero.png');

        // 1b. Capture Landing Earn Cards
        console.log('1b. Capturing Landing Earn Cards...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const el = document.getElementById('earnSection');
              if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1200));
        const shotLandingEarn = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_landing_earn.png'), Buffer.from(shotLandingEarn.result.data, 'base64'));
        console.log('Saved screenshot_landing_earn.png');

        // 1c. Capture Uncompromised Security Section
        console.log('1c. Capturing Uncompromised Security Section...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const el = document.getElementById('securityShowcase');
              if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1200));
        const shotLandingSecurity = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_landing_security.png'), Buffer.from(shotLandingSecurity.result.data, 'base64'));
        console.log('Saved screenshot_landing_security.png');

        // 1c2. Capture Node Operators Coming Soon Section
        console.log('1c2. Capturing Node Operators Coming Soon Section...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const el = document.querySelector('.nodes-gov-container');
              if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1200));
        const shotLandingNodes = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_landing_nodes.png'), Buffer.from(shotLandingNodes.result.data, 'base64'));
        console.log('Saved screenshot_landing_nodes.png');

        // 1d. Capture Landing Page Footer Transition
        console.log('1d. Capturing Landing Page Footer Transition...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1200));
        const shotLandingFooter = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_landing_footer.png'), Buffer.from(shotLandingFooter.result.data, 'base64'));
        console.log('Saved screenshot_landing_footer.png');

        // 2. Navigate to app.html?vault=xlm
        console.log('2. Navigating to app.html?vault=xlm...');
        await send('Page.navigate', { url: 'http://localhost:3000/app.html?vault=xlm' });
        await new Promise(r => setTimeout(r, 2000));
        const shotAppXlm = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_app_xlm.png'), Buffer.from(shotAppXlm.result.data, 'base64'));
        console.log('Saved screenshot_app_xlm.png');

        // 3. Navigate to app.html?vault=usd
        console.log('3. Navigating to app.html?vault=usd...');
        await send('Page.navigate', { url: 'http://localhost:3000/app.html?vault=usd' });
        await new Promise(r => setTimeout(r, 2000));
        const shotAppUsd = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_app_usd.png'), Buffer.from(shotAppUsd.result.data, 'base64'));
        console.log('Saved screenshot_app_usd.png');

        // 4. Navigate to app.html?vault=multichain
        console.log('4. Navigating to app.html?vault=multichain...');
        await send('Page.navigate', { url: 'http://localhost:3000/app.html?vault=multichain' });
        await new Promise(r => setTimeout(r, 2000));
        const shotAppMulti = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_app_multichain.png'), Buffer.from(shotAppMulti.result.data, 'base64'));
        console.log('Saved screenshot_app_multichain.png');

        // Clean up
        ws.close();
        chromeProc.kill();
        console.log('All screenshots captured successfully!');
        process.exit(0);
      };
    });
  });
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
