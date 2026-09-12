// scripts/capture_hakiru_redesign.js
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\cbf081a6-479b-4bd9-af21-8a642df38c72';

async function capture() {
  console.log('Launching headless Chrome for Hakiru 5-Tab Redesign captures...');
  const port = 9300;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100',
    'http://localhost:3000/app.html'
  ]);

  async function getTabs() {
    for (let i = 0; i < 15; i++) {
      try {
        const data = await new Promise((resolve, reject) => {
          const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
          });
          req.on('error', reject);
        });
        const tabs = JSON.parse(data);
        const page = tabs.find(t => t.type === 'page');
        if (page) return page;
      } catch (e) {
        await new Promise(r => setTimeout(r, 600));
      }
    }
    throw new Error('Chrome DevTools port did not become ready');
  }

  const pageTab = await getTabs();
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

        // 1. Capture Stake Tab (Default)
        console.log('1. Capturing Tab 1: Stake with Social AI Banner & FAQ...');
        const shotStake = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_tab1_stake.png'), Buffer.from(shotStake.result.data, 'base64'));
        console.log('Saved screenshot_tab1_stake.png');

        // 2. Open Wallet Modal
        console.log('2. Opening and capturing Wallet Connect Modal...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = document.getElementById('btnConnectWallet');
              if (btn) btn.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 800));
        const shotModal = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_wallet_modal.png'), Buffer.from(shotModal.result.data, 'base64'));
        console.log('Saved screenshot_wallet_modal.png');

        // 3. Connect via Instant Testnet Demo
        console.log('3. Connecting wallet via Instant Testnet Demo...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const demoBtn = document.getElementById('optDemoAccount');
              if (demoBtn) demoBtn.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 800));
        const shotConnected = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_wallet_connected.png'), Buffer.from(shotConnected.result.data, 'base64'));
        console.log('Saved screenshot_wallet_connected.png');

        // 4. Open Account Details Modal
        console.log('4. Opening Account Details Modal...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = document.getElementById('btnConnectWallet');
              if (btn) btn.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 800));
        const shotAccount = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_account_modal.png'), Buffer.from(shotAccount.result.data, 'base64'));
        console.log('Saved screenshot_account_modal.png');

        // Close account modal
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const closeBtn = document.getElementById('btnCloseAccountModal');
              if (closeBtn) closeBtn.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 500));

        // 5. Switch to Wrap Tab
        console.log('5. Switching to Tab 2: Wrap & Unwrap...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = document.getElementById('btnNavWrap');
              if (btn) btn.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 800));
        const shotWrap = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_tab2_wrap.png'), Buffer.from(shotWrap.result.data, 'base64'));
        console.log('Saved screenshot_tab2_wrap.png');

        // 6. Switch to Withdrawals Tab
        console.log('6. Switching to Tab 3: Withdrawals...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = document.getElementById('btnNavWithdrawals');
              if (btn) btn.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 800));
        const shotWithdrawals = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_tab3_withdrawals.png'), Buffer.from(shotWithdrawals.result.data, 'base64'));
        console.log('Saved screenshot_tab3_withdrawals.png');

        // 7. Switch to Rewards Tab
        console.log('7. Switching to Tab 4: Rewards...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = document.getElementById('btnNavRewards');
              if (btn) btn.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 800));
        const shotRewards = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_tab4_rewards.png'), Buffer.from(shotRewards.result.data, 'base64'));
        console.log('Saved screenshot_tab4_rewards.png');

        // 8. Switch to Earn Tab
        console.log('8. Switching to Tab 5: Earn...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = document.getElementById('btnNavEarn');
              if (btn) btn.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 800));
        const shotEarn = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_tab5_earn.png'), Buffer.from(shotEarn.result.data, 'base64'));
        console.log('Saved screenshot_tab5_earn.png');

        // 9. Switch to Light Theme
        console.log('9. Toggling Light Theme on Stake Tab...');
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btnStake = document.getElementById('btnNavStake');
              if (btnStake) btnStake.click();
              const btnTheme = document.getElementById('themeToggleBtn');
              if (btnTheme) btnTheme.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1000));
        const shotLight = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'screenshot_tab1_light_theme.png'), Buffer.from(shotLight.result.data, 'base64'));
        console.log('Saved screenshot_tab1_light_theme.png');

        // Clean up
        ws.close();
        chromeProc.kill();
        console.log('All 9 Hakiru redesign visual screenshots captured successfully!');
        process.exit(0);
      };
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
