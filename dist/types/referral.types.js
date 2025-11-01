"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralStatus = exports.DEFAULT_QUALIFICATION_CRITERIA = exports.REFERRAL_TIERS = void 0;
exports.REFERRAL_TIERS = {
    STARTER: {
        name: 'REZ Starter',
        referralsRequired: 0,
        badge: 'Starter',
        rewards: {
            perReferral: 50
        }
    },
    PRO: {
        name: 'REZ Pro',
        referralsRequired: 5,
        badge: 'Pro',
        rewards: {
            tierBonus: 500,
            perReferral: 100
        }
    },
    ELITE: {
        name: 'REZ Elite',
        referralsRequired: 10,
        badge: 'Elite',
        rewards: {
            tierBonus: 1000,
            perReferral: 150,
            voucher: { type: 'Amazon', amount: 200 }
        }
    },
    CHAMPION: {
        name: 'REZ Champion',
        referralsRequired: 20,
        badge: 'Champion',
        rewards: {
            tierBonus: 2000,
            perReferral: 200,
            voucher: { type: 'Amazon', amount: 1000 }
        }
    },
    LEGEND: {
        name: 'REZ Legend',
        referralsRequired: 50,
        badge: 'Legend',
        rewards: {
            tierBonus: 5000,
            perReferral: 300,
            voucher: { type: 'Amazon', amount: 5000 },
            lifetimePremium: true
        }
    }
};
exports.DEFAULT_QUALIFICATION_CRITERIA = {
    minOrders: 1,
    minSpend: 500,
    timeframeDays: 30
};
var ReferralStatus;
(function (ReferralStatus) {
    ReferralStatus["PENDING"] = "pending";
    ReferralStatus["REGISTERED"] = "registered";
    ReferralStatus["ACTIVE"] = "active";
    ReferralStatus["QUALIFIED"] = "qualified";
    ReferralStatus["EXPIRED"] = "expired";
})(ReferralStatus || (exports.ReferralStatus = ReferralStatus = {}));
