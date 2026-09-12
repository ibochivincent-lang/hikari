const http = require('http');

http.get('http://localhost:3000', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Page Length:', d.length);
    console.log('has Kanji loader ("光"):', d.includes('loader__kanji-char') && d.includes('光'));
    console.log('has Japanese logo badge ("光"):', d.includes('logo-kanji-badge'));
    console.log('has Japanese brand text ("光"):', d.includes('topnav__logo-kanji') && d.includes('光'));
    console.log('has nav-slider-trigger ("Explore Protocol"):', d.includes('nav-slider-trigger') && d.includes('Explore Protocol'));
    console.log('has navSlider deck:', d.includes('id="navSlider"'));
    console.log('has hero 12.4% APY card:', d.includes('hero__yield-card') && d.includes('12.4%'));
    console.log('has hero calculator slider:', d.includes('heroCalcSlider'));
    console.log('has Trading Bots in Analytics:', d.includes('viewTradingBots') && d.includes('Hikari MEV Arbitrageur'));
    console.log('has Cross-Chain bridge (CCTP):', d.includes('panelBridge') && d.includes('CctpForwarder'));
    console.log('has wallet connect button:', d.includes('btnConnectWallet'));
    console.log('has emojis:', /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(d));
  });
}).on('error', (err) => console.error(err));
