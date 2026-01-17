import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { connectDatabase } from '../config/database';

dotenv.config();

async function fixWalletBalance() {
    await connectDatabase();

    const email = 'mukulraj756@gmail.com';
    const targetBalance = 10000;

    try {
        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ User not found:', email);
            return;
        }

        console.log('✅ User found:', user.profile?.firstName, user.profile?.lastName);
        console.log('   User ID:', user._id);
        console.log('   User.wallet.balance:', user.wallet?.balance);

        // Get current CoinTransaction balance
        const currentCoinBalance = await CoinTransaction.getUserBalance(user._id.toString());
        console.log('   CoinTransaction balance:', currentCoinBalance);

        // Get or create Wallet
        let wallet = await Wallet.findOne({ user: user._id });
        if (!wallet) {
            console.log('🆕 Creating wallet for user...');
            wallet = await (Wallet as any).createForUser(user._id);
        }

        if (!wallet) {
            console.log('❌ Failed to get or create wallet');
            return;
        }

        console.log('   Wallet.balance.available:', wallet.balance?.available);
        console.log('   Wallet.balance.total:', wallet.balance?.total);

        // Calculate the difference needed
        const difference = targetBalance - currentCoinBalance;

        if (difference === 0) {
            console.log('✅ Balance is already correct!');
            return;
        }

        console.log(`\n🔧 Fixing balance: ${currentCoinBalance} → ${targetBalance} (adding ${difference})`);

        // Create a CoinTransaction to set the correct balance
        const transaction = await CoinTransaction.createTransaction(
            user._id.toString(),
            'bonus',  // type
            difference, // amount to add
            'admin',  // source
            `Admin balance correction: seeding 10,000 RC for user`
        );

        console.log('✅ Created CoinTransaction:', transaction._id);
        console.log('   New balance in transaction:', transaction.balance);

        // Now update the Wallet model to match
        const w = wallet as any;
        w.balance.available = targetBalance;
        w.balance.total = targetBalance;

        // Update ReZ coin
        const rezCoin = w.coins.find((c: any) => c.type === 'rez');
        if (rezCoin) {
            rezCoin.amount = targetBalance;
            rezCoin.lastUsed = new Date();
        }

        await w.save();
        console.log('✅ Wallet updated');
        console.log('   New Wallet.balance.available:', w.balance.available);
        console.log('   New Wallet.balance.total:', w.balance.total);

        // Verify final state
        const finalCoinBalance = await CoinTransaction.getUserBalance(user._id.toString());
        console.log('\n✅ Final verification:');
        console.log('   CoinTransaction balance:', finalCoinBalance);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

fixWalletBalance();
