const puppeteer = require('puppeteer-core');
const path = require('path');

const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\cbf081a6-479b-4bd9-af21-8a642df38c72';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching headless Chrome for feature verification...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1050 });

  // 1. Landing page topnav with symbol-only theme toggle
  console.log('1. Capturing Landing Page TopNav with symbol-only theme toggle...');
  await page.goto('http://localhost:3000/?skipLoader=true', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_landing_theme_symbol.png') });

  // 2. Landing page "Connect with Us" social AI agent section
  console.log('2. Capturing Connect with Us section under Governed by Hikari DAO...');
  await page.evaluate(() => {
    const el = document.getElementById('connectSocialSection');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_landing_social_section.png') });

  // 3. Test interactive AI simulation toast on landing page
  console.log('3. Clicking "#btnSimHighestApy" to test real-time AI alert toast...');
  await page.click('#btnSimHighestApy');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_landing_alert_toast.png') });

  // 4. Navigate to dedicated DApp and expand Pro Deck
  console.log('4. Navigating to DApp app.html and opening Pro Deck...');
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Expand Pro Deck
  await page.click('#btnToggleProDeck');
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const el = document.getElementById('proDeckWrapper');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_app_pro_deck_futures.png') });

  // 5. Test Long-Term timeframe toggle on Futures Directional Meter
  console.log('5. Clicking Long-Term timeframe toggle on Futures Meter...');
  await page.click('#btnTfLongTerm');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_app_futures_longterm.png') });

  // 6. Test Trading Bots tab showing 4 bots
  console.log('6. Clicking Trading Bots tab in Pro Deck...');
  await page.click('#btnTabTradingBots');
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const el = document.getElementById('chartSection');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_app_trading_bots_4.png') });

  await browser.close();
  console.log('All feature verification screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Error capturing features:', err);
  process.exit(1);
});
