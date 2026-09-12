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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1050 });

  console.log('Navigating to http://localhost:3000/app.html...');
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // 1. Stake Tab - Pro Deck toggle before FAQ
  console.log('Capturing Stake Tab with Pro Deck before FAQs...');
  await page.evaluate(() => {
    window.scrollTo({ top: 400, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab1_stake.png') });

  // 2. Wrap Tab - Pro Deck before FAQ
  console.log('Capturing Wrap Tab with Pro Deck before FAQs...');
  await page.click('button[data-tab="wrap"]');
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    window.scrollTo({ top: 350, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab2_wrap.png') });

  // 3. Withdrawals Tab (Request) - Pro Deck is NOT present
  console.log('Capturing Withdrawals Tab (Request - Pro Deck Hidden)...');
  await page.click('button[data-tab="withdrawals"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab3_withdrawals.png') });

  // 4. Rewards Tab - Pro Deck is NOT present
  console.log('Capturing Rewards Tab (Pro Deck Hidden)...');
  await page.click('button[data-tab="rewards"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab4_rewards.png') });

  // 5. Earn Tab
  console.log('Capturing Earn Tab...');
  await page.click('button[data-tab="earn"]');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_tab5_earn.png') });

  // 6. Return to Stake Tab & Open Wallet Modal (Primary 3-Column Tabular Grid)
  console.log('Opening Wallet Modal in 3-column tabular grid...');
  await page.click('button[data-tab="stake"]');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.click('#btnConnectWallet');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_wallet_modal.png') });

  // 7. Click "More" Tile to Expand Secondary Grid
  console.log('Clicking "More" tile in wallet grid...');
  await page.click('#btnTileMoreWallets');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_wallet_modal_expanded.png') });

  // 8. Connect Testnet Demo Account
  console.log('Connecting Testnet Demo Account...');
  await page.click('#optDemoAccount');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_wallet_connected.png') });

  // 9. Light Theme
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
