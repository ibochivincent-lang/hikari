// scripts/extract_lido_nav.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

const fs = require('fs');
const html = fs.readFileSync('C:/Users/User/.gemini/antigravity-ide/brain/cbf081a6-479b-4bd9-af21-8a642df38c72/.system_generated/steps/1303/content.md', 'utf8');

const navMatch = html.match(/<nav[^>]*data-testid="navigation"[^>]*>([\s\S]*?)<\/nav>/);
if (navMatch) {
  const items = [...navMatch[1].matchAll(/<li class="[^"]*navListItem[^"]*"[\s\S]*?<span[^>]*role="menu"[^>]*>([^<]+)<\/span>([\s\S]*?)(?=<li class="[^"]*navListItem|$)/g)];
  for (const item of items) {
    const categoryName = item[1].trim();
    console.log('\n====================================');
    console.log('CATEGORY:', categoryName);
    const sub = item[2];
    
    // Find all columns or sections
    const cols = [...sub.matchAll(/<div class="[^"]*columnWrapper[^"]*"[\s\S]*?(?=<div class="[^"]*columnWrapper|$)/g)];
    for (const col of cols) {
      const titleMatch = col[0].match(/<h4[^>]*>([^<]+)<\/h4>/);
      if (titleMatch) console.log('  [Section]:', titleMatch[1]);
      
      const linkMatches = [...col[0].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)];
      for (const lm of linkMatches) {
        const title = (lm[1].match(/<span[^>]*linkTitle[^>]*>([^<]+)<\/span>/) || [])[1];
        const desc = (lm[1].match(/<span[^>]*linkDescription[^>]*>([^<]+)<\/span>/) || [])[1];
        if (title) {
          console.log(`    - ${title}${desc ? ' : ' + desc : ''}`);
        }
      }
    }
  }
}
