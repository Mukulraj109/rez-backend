import { CoinGift } from '../models/CoinGift';
import { User } from '../models/User';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import pushNotificationService from '../services/pushNotificationService';
import { giftScheduledQueueSize } from '../config/walletMetrics';

const logger = createServiceLogger('gift-delivery');

/**
 * Scheduled Gift Delivery Job
 * Runs every 5 minutes.
 * Finds scheduled gifts whose deliveryType='scheduled' and scheduledAt <= now,
 * still in 'pending' status, and transitions them to 'delivered'.
 */
export async function runGiftDelivery(): Promise<void> {
  const lockKey = 'job:gift-delivery';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 120); // 2min lock
    if (!lockToken) {
      logger.info('Gift delivery job skipped — lock held');
      return;
    }

    const now = new Date();

    // Update scheduled queue gauge (all pending scheduled, not just due)
    const queueSize = await CoinGift.countDocuments({
      status: 'pending',
      deliveryType: 'scheduled',
    });
    giftScheduledQueueSize.set(queueSize);

    const dueGifts = await CoinGift.find({
      status: 'pending',
      deliveryType: 'scheduled',
      scheduledAt: { $lte: now },
    }).limit(200);

    if (dueGifts.length === 0) {
      await redisService.releaseLock(lockKey, lockToken);
      return;
    }

    logger.info(`Found ${dueGifts.length} scheduled gifts due for delivery`);

    let delivered = 0;
    for (const gift of dueGifts) {
      try {
        // Atomic status transition
        const updated = await CoinGift.findOneAndUpdate(
          { _id: gift._id, status: 'pending' },
          { $set: { status: 'delivered' } },
          { new: true }
        );

        if (updated) {
          delivered++;

          // Send push notification to recipient
          try {
            const [sender, recipient] = await Promise.all([
              User.findById(gift.sender).select('fullName phoneNumber').lean(),
              User.findById(gift.recipient).select('phoneNumber').lean(),
            ]);
            if (recipient?.phoneNumber) {
              const senderName = sender?.fullName || 'Someone';
              const themeEmoji = gift.theme === 'birthday' ? '🎂'
                : gift.theme === 'love' ? '💝'
                : gift.theme === 'thanks' ? '🙏'
                : gift.theme === 'congrats' ? '🎉'
                : gift.theme === 'christmas' ? '🎄'
                : '🎁';
              await pushNotificationService.sendGiftReceived(
                senderName,
                gift.amount,
                themeEmoji,
                recipient.phoneNumber
              );
            }
          } catch (notifErr) {
            logger.error('Failed to send gift notification', notifErr, { giftId: String(gift._id) });
          }

          logger.info('Gift delivered', {
            giftId: String(gift._id),
            recipient: String(gift.recipient),
            amount: gift.amount,
          });
        }
      } catch (error) {
        logger.error('Failed to deliver gift', error, { giftId: String(gift._id) });
      }
    }

    logger.info('Gift delivery job complete', { delivered, total: dueGifts.length });
    await redisService.releaseLock(lockKey, lockToken);
  } catch (error) {
    logger.error('Gift delivery job failed', error);
  }
}
