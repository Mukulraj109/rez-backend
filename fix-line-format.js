const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/controllers/walletController.ts');
let content = fs.readFileSync(filePath, 'utf8');

const brokenLine = `// AUTO-SYNC: Ensure wallet balance matches CoinTransaction (source of truth)  try {    const { CoinTransaction } = require('../models/CoinTransaction');    const coinTransactionBalance = await CoinTransaction.getUserBalance(userId);    const currentBalance = wallet.balance.available || 0;    if (Math.abs(coinTransactionBalance - currentBalance) > 0.01) {      console.log(\`🔄 [WALLET] Auto-syncing balance: \${currentBalance} → \${coinTransactionBalance}\`);      // Update wallet balance      wallet.balance.available = coinTransactionBalance;      wallet.balance.total = coinTransactionBalance + (wallet.balance.pending || 0) + (wallet.balance.cashback || 0);      // Update ReZ coin amount      const rezCoinToUpdate = wallet.coins.find((c: any) => c.type === 'rez');      if (rezCoinToUpdate) {        rezCoinToUpdate.amount = coinTransactionBalance;        rezCoinToUpdate.lastUsed = new Date();      }      await wallet.save();    }  } catch (syncError) {    console.error('⚠️ [WALLET] Auto-sync failed:', syncError);    // Continue with existing wallet data if sync fails  }`;

const fixedCode = `  // AUTO-SYNC: Ensure wallet balance matches CoinTransaction (source of truth)
  try {
    const { CoinTransaction } = require('../models/CoinTransaction');
    const coinTransactionBalance = await CoinTransaction.getUserBalance(userId);

    const currentBalance = wallet.balance.available || 0;
    if (Math.abs(coinTransactionBalance - currentBalance) > 0.01) {
      console.log(\`🔄 [WALLET] Auto-syncing balance: \${currentBalance} → \${coinTransactionBalance}\`);

      // Update wallet balance
      wallet.balance.available = coinTransactionBalance;
      wallet.balance.total = coinTransactionBalance + (wallet.balance.pending || 0) + (wallet.balance.cashback || 0);

      // Update ReZ coin amount
      const rezCoinToUpdate = wallet.coins.find((c: any) => c.type === 'rez');
      if (rezCoinToUpdate) {
        rezCoinToUpdate.amount = coinTransactionBalance;
        rezCoinToUpdate.lastUsed = new Date();
      }

      await wallet.save();
    }
  } catch (syncError) {
    console.error('⚠️ [WALLET] Auto-sync failed:', syncError);
    // Continue with existing wallet data if sync fails
  }

`;

if (content.includes(brokenLine)) {
  content = content.replace(brokenLine, fixedCode);
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed line formatting in walletController.ts');
} else {
  console.log('❌ Could not find the broken line');
}
