const fs = require('fs');

const appCode = fs.readFileSync('frontend/public/app.js', 'utf8');
const appIds = [...new Set([...appCode.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]))];

const htmlCode = fs.readFileSync('frontend/public/index.html', 'utf8');
const htmlIds = new Set([...htmlCode.matchAll(/id=['"]([^'"]+)['"]/g)].map(m => m[1]));

const missing = appIds.filter(id => !htmlIds.has(id));
console.log('Missing IDs count:', missing.length);
if (missing.length > 0) {
  console.log('Missing IDs:', missing);
} else {
  console.log('ALL app.js IDs exist in index.html! 100% matched.');
}
