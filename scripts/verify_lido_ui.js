// scripts/verify_lido_ui.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Verification suite for Lido-style mega navigation and modal integrations.

async function verify() {
  const res = await fetch('http://localhost:3000');
  if (!res.ok) throw new Error(`HTTP status: ${res.status}`);
  const html = await res.text();
  console.log('Page loaded successfully. Length:', html.length);

  const checks = {
    lidoHeader: html.includes('lido-header'),
    lidoNav: html.includes('lido-nav'),
    productsMenu: html.includes('data-menu="products"'),
    institutionalMenu: html.includes('data-menu="institutional"'),
    nodeOperatorsMenu: html.includes('data-menu="node-operators"'),
    governanceMenu: html.includes('data-menu="governance"'),
    buildersMenu: html.includes('data-menu="builders"'),
    communityMenu: html.includes('data-menu="community"'),
    sdkModal: html.includes('id="sdkModal"'),
    invariantsModal: html.includes('id="invariantsModal"'),
    faqModal: html.includes('id="faqModal"'),
    mobileDrawer: html.includes('id="lidoMobileDrawer"'),
    modeSwitchBar: html.includes('mode-switch-bar'),
    btnSimpleMode: html.includes('id="btnSimpleMode"'),
    btnProMode: html.includes('id="btnProMode"'),
    vaultTierSelector: html.includes('vault-tier-selector'),
    optLobstr: html.includes('id="optLobstr"'),
    optXbull: html.includes('id="optXbull"'),
    rationaleBox: html.includes('rationale-box')
  };

  console.log('UI Verification Results:');
  console.table(checks);

  const allPassed = Object.values(checks).every(Boolean);
  if (!allPassed) {
    console.error('Some checks failed!');
    process.exit(1);
  }
  console.log('✓ All 19 navigation, tier selector, mode toggle, wallet, and rationale elements verified successfully!');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
