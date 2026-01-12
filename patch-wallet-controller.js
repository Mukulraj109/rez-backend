const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/controllers/walletController.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `  if (!wallet) {
    return sendError(res, 'Failed to create wallet', 500);
  }

  // Get ReZ and Promo coins from coins array
  const rezCoin = wallet.coins?.find((c: any) => c.type === 'rez');
  const promoCoin = wallet.coins?.find((c: any) => c.type === 'promo');`;

const newCode = `  if (!wallet) {
    return sendError(res, 'Failed to create wallet', 500);
  }

  // AUTO-SYNC: Ensure wallet balance matches CoinTransaction (source of truth)
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

  // Get ReZ and Promo coins from coins array
  const rezCoin = wallet.coins?.find((c: any) => c.type === 'rez');
  const promoCoin = wallet.coins?.find((c: any) => c.type === 'promo');`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content);
  console.log('✅ walletController.ts patched successfully!');
  console.log('   Added auto-sync from CoinTransaction in getWalletBalance()');
} else if (content.includes('AUTO-SYNC: Ensure wallet balance matches CoinTransaction')) {
  console.log('✅ Already patched!');
} else {
  console.log('❌ Could not find the code to patch');
  console.log('Looking for:', oldCode.substring(0, 100));
}
