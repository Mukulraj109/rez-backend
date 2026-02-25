import { Transfer } from '../models/Transfer';
import { Wallet } from '../models/Wallet';
import { logTransaction } from '../models/TransactionAuditLog';
import { ledgerService } from '../services/ledgerService';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import mongoose from 'mongoose';

const logger = createServiceLogger('stuck-tx-recovery');

/**
 * Stuck Transaction Recovery Job
 * Runs every 15 minutes.
 * Finds Transfers stuck in 'initiated' or 'otp_pending' status for >10 minutes.
 * Reverses the sender debit and marks the transfer as failed.
 */
export async function runStuckTransactionRecovery(): Promise<void> {
  const lockKey = 'job:stuck-tx-recovery';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 300); // 5min lock
    if (!lockToken) {
      logger.info('Stuck tx recovery job skipped — lock held by another instance');
      return;
    }

    const cutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    const stuckTransfers = await Transfer.find({
      status: { $in: ['initiated', 'otp_pending'] },
      createdAt: { $lt: cutoff },
    }).limit(100);

    if (stuckTransfers.length === 0) {
      logger.info('No stuck transfers found');
      return;
    }

    logger.info(`Found ${stuckTransfers.length} stuck transfers to recover`);

    let recovered = 0;
    let errors = 0;

    for (const transfer of stuckTransfers) {
      try {
        // Atomically mark as failed (status guard prevents double-recovery)
        const updated = await Transfer.findOneAndUpdate(
          { _id: transfer._id, status: { $in: ['initiated', 'otp_pending'] } },
          { $set: { status: 'failed', failureReason: 'timeout' } },
          { new: true }
        );

        if (!updated) {
          // Already handled by another process
          continue;
        }

        // Reverse sender debit — restore balance atomically
        const senderWallet = await Wallet.findOneAndUpdate(
          { user: transfer.sender },
          {
            $inc: {
              'balance.available': transfer.amount,
              'balance.total': transfer.amount,
            },
            $set: { lastTransactionAt: new Date() },
          },
          { new: true }
        );

        // Create reversing ledger entry
        const platformFloatId = ledgerService.getPlatformAccountId('platform_float');
        await ledgerService.recordEntry({
          debitAccount: { type: 'platform_float', id: platformFloatId },
          creditAccount: { type: 'user_wallet', id: transfer.sender },
          amount: transfer.amount,
          coinType: (transfer.coinType as any) || 'nuqta',
          operationType: 'transfer',
          referenceId: String(transfer._id),
          referenceModel: 'Transfer',
          metadata: {
            description: `Reversal: stuck transfer timeout after 10 minutes`,
          },
        });

        // Audit log
        if (senderWallet) {
          logTransaction({
            userId: transfer.sender,
            walletId: senderWallet._id as mongoose.Types.ObjectId,
            walletType: 'user',
            operation: 'credit',
            amount: transfer.amount,
            balanceBefore: {
              total: senderWallet.balance.total - transfer.amount,
              available: senderWallet.balance.available - transfer.amount,
              pending: 0,
              cashback: 0,
            },
            balanceAfter: {
              total: senderWallet.balance.total,
              available: senderWallet.balance.available,
              pending: 0,
              cashback: 0,
            },
            reference: {
              type: 'refund',
              id: String(transfer._id),
              description: 'Stuck transfer recovery — timeout reversal',
            },
            metadata: { source: 'cron' },
          });
        }

        recovered++;
        logger.info('Recovered stuck transfer', {
          transferId: String(transfer._id),
          sender: String(transfer.sender),
          amount: transfer.amount,
        });
      } catch (error) {
        errors++;
        logger.error('Failed to recover stuck transfer', error, {
          transferId: String(transfer._id),
        });
      }
    }

    logger.info('Stuck transaction recovery complete', { recovered, errors, total: stuckTransfers.length });

    await redisService.releaseLock(lockKey, lockToken);
  } catch (error) {
    logger.error('Stuck transaction recovery job failed', error);
  }
}
