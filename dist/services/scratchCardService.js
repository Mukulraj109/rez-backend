"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScratchCard = createScratchCard;
exports.scratchCell = scratchCell;
exports.claimScratchCard = claimScratchCard;
exports.getScratchCardHistory = getScratchCardHistory;
exports.getScratchCardStats = getScratchCardStats;
const MiniGame_1 = require("../models/MiniGame");
const CoinTransaction_1 = require("../models/CoinTransaction");
const SCRATCH_CARD_PRIZES = [
    { type: 'coins', value: 100, label: '100 Coins', color: '#10B981' },
    { type: 'coins', value: 200, label: '200 Coins', color: '#3B82F6' },
    { type: 'coins', value: 500, label: '500 Coins', color: '#8B5CF6' },
    { type: 'cashback', value: 10, label: '10% Cashback', color: '#F59E0B' },
    { type: 'discount', value: 15, label: '15% Discount', color: '#EC4899' },
    { type: 'voucher', value: 50, label: '₹50 Voucher', color: '#EF4444' },
    { type: 'nothing', value: 0, label: 'Better Luck Next Time', color: '#6B7280' }
];
const PRIZE_WEIGHTS = {
    coins_100: 25,
    coins_200: 15,
    coins_500: 5,
    cashback_10: 15,
    discount_15: 10,
    voucher_50: 5,
    nothing: 25
};
/**
 * Create a new scratch card session
 */
async function createScratchCard(userId) {
    // Expire old active scratch cards
    await MiniGame_1.MiniGame.updateMany({
        user: userId,
        gameType: 'scratch_card',
        status: 'active'
    }, {
        status: 'expired'
    });
    // Generate scratch card configuration
    const prize = selectScratchCardPrize();
    const gridSize = 9; // 3x3 grid
    // Determine winning cells (3 matching cells for a win)
    const winningCells = generateWinningPattern(gridSize);
    // Create grid with prizes
    const grid = new Array(gridSize).fill(null).map((_, index) => {
        if (winningCells.includes(index)) {
            return {
                index,
                prize: prize.label,
                type: prize.type,
                value: prize.value,
                revealed: false
            };
        }
        // Fill other cells with random prizes (mostly "nothing")
        const randomPrize = Math.random() > 0.7
            ? SCRATCH_CARD_PRIZES[Math.floor(Math.random() * (SCRATCH_CARD_PRIZES.length - 1))]
            : SCRATCH_CARD_PRIZES[SCRATCH_CARD_PRIZES.length - 1]; // "nothing"
        return {
            index,
            prize: randomPrize.label,
            type: randomPrize.type,
            value: randomPrize.value,
            revealed: false
        };
    });
    // Create session (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const scratchCard = await MiniGame_1.MiniGame.create({
        user: userId,
        gameType: 'scratch_card',
        status: 'active',
        expiresAt,
        metadata: {
            grid,
            winningCells,
            winningPrize: prize,
            scratchedCells: [],
            revealed: false,
            gridSize: 3 // 3x3
        }
    });
    return {
        sessionId: scratchCard._id,
        gridSize: 3,
        totalCells: gridSize,
        expiresAt,
        // Don't reveal the grid data to client
        cells: new Array(gridSize).fill({ revealed: false })
    };
}
/**
 * Select a prize based on weighted probability
 */
function selectScratchCardPrize() {
    const totalWeight = Object.values(PRIZE_WEIGHTS).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    if (random < PRIZE_WEIGHTS.coins_100) {
        return SCRATCH_CARD_PRIZES[0]; // 100 coins
    }
    else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200) {
        return SCRATCH_CARD_PRIZES[1]; // 200 coins
    }
    else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200 + PRIZE_WEIGHTS.coins_500) {
        return SCRATCH_CARD_PRIZES[2]; // 500 coins
    }
    else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200 + PRIZE_WEIGHTS.coins_500 + PRIZE_WEIGHTS.cashback_10) {
        return SCRATCH_CARD_PRIZES[3]; // 10% cashback
    }
    else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200 + PRIZE_WEIGHTS.coins_500 + PRIZE_WEIGHTS.cashback_10 + PRIZE_WEIGHTS.discount_15) {
        return SCRATCH_CARD_PRIZES[4]; // 15% discount
    }
    else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200 + PRIZE_WEIGHTS.coins_500 + PRIZE_WEIGHTS.cashback_10 + PRIZE_WEIGHTS.discount_15 + PRIZE_WEIGHTS.voucher_50) {
        return SCRATCH_CARD_PRIZES[5]; // ₹50 voucher
    }
    return SCRATCH_CARD_PRIZES[6]; // Nothing
}
/**
 * Generate winning pattern (3 matching cells)
 */
function generateWinningPattern(gridSize) {
    const patterns = [
        [0, 1, 2], // Top row
        [3, 4, 5], // Middle row
        [6, 7, 8], // Bottom row
        [0, 3, 6], // Left column
        [1, 4, 7], // Middle column
        [2, 5, 8], // Right column
        [0, 4, 8], // Diagonal \
        [2, 4, 6] // Diagonal /
    ];
    // Select random pattern
    return patterns[Math.floor(Math.random() * patterns.length)];
}
/**
 * Scratch a cell
 */
async function scratchCell(sessionId, cellIndex) {
    const scratchCard = await MiniGame_1.MiniGame.findById(sessionId);
    if (!scratchCard) {
        throw new Error('Scratch card not found');
    }
    if (scratchCard.status === 'completed') {
        throw new Error('Scratch card already completed');
    }
    if (scratchCard.status === 'expired') {
        throw new Error('Scratch card has expired');
    }
    if (new Date() > scratchCard.expiresAt) {
        scratchCard.status = 'expired';
        await scratchCard.save();
        throw new Error('Scratch card has expired');
    }
    const grid = scratchCard.metadata?.grid || [];
    const scratchedCells = scratchCard.metadata?.scratchedCells || [];
    const winningCells = scratchCard.metadata?.winningCells || [];
    if (cellIndex < 0 || cellIndex >= grid.length) {
        throw new Error('Invalid cell index');
    }
    if (scratchedCells.includes(cellIndex)) {
        throw new Error('Cell already scratched');
    }
    // Mark cell as scratched
    grid[cellIndex].revealed = true;
    scratchedCells.push(cellIndex);
    // Check if all winning cells are scratched
    const allWinningCellsScratched = winningCells.every((cell) => scratchedCells.includes(cell));
    let won = false;
    let prize = null;
    if (allWinningCellsScratched) {
        won = true;
        prize = scratchCard.metadata?.winningPrize;
        if (prize && scratchCard.metadata) {
            scratchCard.status = 'completed';
            scratchCard.completedAt = new Date();
            scratchCard.reward = {
                [prize.type]: prize.value
            };
            scratchCard.metadata.revealed = true;
            // Award prize
            if (prize.type !== 'nothing') {
                await awardScratchCardPrize(scratchCard.user.toString(), prize);
            }
        }
    }
    // Update metadata
    scratchCard.metadata = {
        ...scratchCard.metadata,
        grid,
        scratchedCells
    };
    await scratchCard.save();
    return {
        sessionId: scratchCard._id,
        cellIndex,
        cellData: grid[cellIndex],
        scratchedCells,
        won,
        prize: won ? prize : null,
        completed: scratchCard.status === 'completed',
        allCellsRevealed: scratchedCells.length === grid.length
    };
}
/**
 * Award scratch card prize
 */
async function awardScratchCardPrize(userId, prize) {
    if (prize.type === 'coins') {
        await CoinTransaction_1.CoinTransaction.createTransaction(userId, 'earned', prize.value, 'scratch_card', `Won ${prize.value} coins from Scratch Card`);
    }
    else if (prize.type === 'cashback') {
        // TODO: Implement cashback awarding
        console.log(`Awarded ${prize.value}% cashback to user ${userId}`);
    }
    else if (prize.type === 'discount') {
        // TODO: Implement discount coupon creation
        console.log(`Awarded ${prize.value}% discount to user ${userId}`);
    }
    else if (prize.type === 'voucher') {
        // TODO: Implement voucher awarding
        console.log(`Awarded ₹${prize.value} voucher to user ${userId}`);
    }
}
/**
 * Claim scratch card (reveal all cells)
 */
async function claimScratchCard(sessionId) {
    const scratchCard = await MiniGame_1.MiniGame.findById(sessionId);
    if (!scratchCard) {
        throw new Error('Scratch card not found');
    }
    if (scratchCard.status === 'completed') {
        throw new Error('Scratch card already completed');
    }
    // Reveal all cells
    const grid = scratchCard.metadata?.grid || [];
    grid.forEach((cell) => {
        cell.revealed = true;
    });
    scratchCard.status = 'completed';
    scratchCard.completedAt = new Date();
    scratchCard.metadata = {
        ...scratchCard.metadata,
        grid,
        revealed: true,
        scratchedCells: grid.map((_, index) => index)
    };
    await scratchCard.save();
    return {
        sessionId: scratchCard._id,
        grid,
        winningCells: scratchCard.metadata?.winningCells,
        winningPrize: scratchCard.metadata?.winningPrize,
        completed: true
    };
}
/**
 * Get scratch card history
 */
async function getScratchCardHistory(userId, limit = 10) {
    const cards = await MiniGame_1.MiniGame.find({
        user: userId,
        gameType: 'scratch_card',
        status: 'completed'
    })
        .sort({ completedAt: -1 })
        .limit(limit);
    return cards.map(c => ({
        id: c._id,
        completedAt: c.completedAt,
        prize: c.metadata?.winningPrize,
        reward: c.reward
    }));
}
/**
 * Get scratch card statistics
 */
async function getScratchCardStats(userId) {
    const cards = await MiniGame_1.MiniGame.find({
        user: userId,
        gameType: 'scratch_card',
        status: 'completed'
    });
    const totalCards = cards.length;
    let totalWins = 0;
    let totalCoinsWon = 0;
    let totalCashbackWon = 0;
    let totalDiscountsWon = 0;
    let totalVouchersWon = 0;
    cards.forEach(card => {
        const prize = card.metadata?.winningPrize;
        if (prize && prize.type !== 'nothing') {
            totalWins++;
            if (card.reward?.coins)
                totalCoinsWon += card.reward.coins;
            if (card.reward?.cashback)
                totalCashbackWon += card.reward.cashback;
            if (card.reward?.discount)
                totalDiscountsWon += card.reward.discount;
            if (card.reward?.voucher)
                totalVouchersWon += 1;
        }
    });
    return {
        totalCards,
        totalWins,
        winRate: totalCards > 0 ? Math.round((totalWins / totalCards) * 100) : 0,
        totalCoinsWon,
        totalCashbackWon,
        totalDiscountsWon,
        totalVouchersWon
    };
}
exports.default = {
    createScratchCard,
    scratchCell,
    claimScratchCard,
    getScratchCardHistory,
    getScratchCardStats
};
