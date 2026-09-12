const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\cbf081a6-479b-4bd9-af21-8a642df38c72';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  console.log('Navigating to http://localhost:3000/app.html...');
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // 1. Stake Tab
  console.log('Capturing Stake Tab...');
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab1_stake.png') });

  // 2. Withdrawals Tab (Request)
  console.log('Capturing Withdrawals Tab (Request)...');
  await page.click('button[data-tab="withdrawals"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab3_withdrawals.png') });

  // 3. Withdrawals Tab (Direct to Bank)
  console.log('Capturing Withdrawals Tab (Direct to Bank)...');
  await page.click('#subtabWithdrawDirectBank');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab3_direct_bank.png') });

  // 4. Earn Tab
  console.log('Capturing Earn Tab...');
  await page.click('button[data-tab="earn"]');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab5_earn.png') });

  // 4b. Multichain Converter Card in Earn Tab
  console.log('Capturing Multichain Converter in Earn Tab...');
  await page.evaluate(() => {
    window.scrollTo({ top: 650, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab5_multichain.png') });

  // 5. Wallet Modal
  console.log('Capturing Wallet Modal...');
  await page.click('#btnConnectWallet');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_wallet_modal.png') });

  // 6. Connect Testnet Demo Account
  console.log('Connecting Testnet Demo Account...');
  await page.click('#optDemoAccount');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_wallet_connected.png') });

  // 7. Light Theme
  console.log('Switching to Light Theme...');
  await page.click('#themeToggleBtn');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab1_light_theme.png') });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
