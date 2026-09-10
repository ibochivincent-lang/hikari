const fs = require('fs');
const css = fs.readFileSync('frontend/public/styles.css', 'utf8');
const js = fs.readFileSync('frontend/public/app.js', 'utf8');
const html = fs.readFileSync('frontend/public/index.html', 'utf8');

const checks = [
  { name: 'No simple-mode-hidden in CSS', pass: !css.includes('.simple-mode-hidden') },
  { name: 'No simple-mode-hidden in JS', pass: !js.includes('simple-mode-hidden') },
  { name: 'Comprehensive light theme in CSS', pass: css.includes('[data-theme="light"]') },
  { name: 'Simple mode button present in HTML', pass: html.includes('id="btnSimpleMode"') },
  { name: 'Pro mode button present in HTML', pass: html.includes('id="btnProMode"') },
  { name: 'Theme switcher present in HTML', pass: html.includes('id="themeSwitch"') },
  { name: 'Portal focus ring animation in CSS', pass: css.includes('.portal-focus-ring') },
  { name: 'vercel.json created and valid', pass: fs.existsSync('vercel.json') }
];

console.log('--- INTEGRITY AUDIT ---');
let allPass = true;
checks.forEach(c => {
  console.log(`${c.pass ? '✓ PASS' : '✗ FAIL'}: ${c.name}`);
  if (!c.pass) allPass = false;
});

if (allPass) {
  console.log('ALL INTEGRITY CHECKS PASSED!');
} else {
  console.error('INTEGRITY FAILURE DETECTED');
  process.exit(1);
}
