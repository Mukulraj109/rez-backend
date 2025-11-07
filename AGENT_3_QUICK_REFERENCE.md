# Agent 3 - Quick Reference Guide

## What Was Delivered

### ✅ New Models (2)

1. **QuizQuestion** - `src/models/QuizQuestion.ts`
   - 8 categories (shopping, fashion, food, tech, etc.)
   - 3 difficulty levels (easy=10pts, medium=20pts, hard=30pts)
   - 50 seed questions with explanations
   - Statistics tracking (usage, accuracy)

2. **TriviaQuestion** - `src/models/TriviaQuestion.ts`
   - 10 categories (history, science, geography, etc.)
   - 3 difficulty levels (easy=15pts, medium=25pts, hard=35pts)
   - 30 seed questions with fun facts
   - Daily trivia feature

### ✅ Cron Jobs (2)

1. **Session Cleanup** - `src/jobs/cleanupExpiredSessions.ts`
   - **Schedule**: Daily at midnight (00:00)
   - **Purpose**: Expire sessions > 24h, delete sessions > 30 days
   - **Impact**: Keeps database clean

2. **Coin Expiry** - `src/jobs/expireCoins.ts`
   - **Schedule**: Daily at 1:00 AM
   - **Purpose**: Expire old coins, notify users
   - **Impact**: Prevents coin accumulation, encourages usage

---

## Quick Start Commands

### Seed Database

```bash
# Seed quiz questions (50 questions)
cd user-backend
npx ts-node src/scripts/seedQuizQuestions.ts

# Seed trivia questions (30 questions)
npx ts-node src/scripts/seedTriviaQuestions.ts
```

### Check Job Status

```typescript
import sessionCleanup from './jobs/cleanupExpiredSessions';
import coinExpiry from './jobs/expireCoins';

console.log(sessionCleanup.getStatus());
console.log(coinExpiry.getStatus());
```

### Manual Triggers (Testing)

```typescript
// Trigger session cleanup manually
import { triggerManualSessionCleanup } from './jobs/cleanupExpiredSessions';
await triggerManualSessionCleanup();

// Trigger coin expiry manually
import { triggerManualCoinExpiry } from './jobs/expireCoins';
await triggerManualCoinExpiry();

// Preview upcoming coin expirations
import { previewUpcomingExpirations } from './jobs/expireCoins';
const preview = await previewUpcomingExpirations(7); // next 7 days
```

---

## Usage Examples

### Get Quiz Questions

```typescript
import { QuizQuestion } from './models/QuizQuestion';

// Random quiz (10 questions)
const quiz = await QuizQuestion.getRandomQuestions(10);

// Category-specific quiz
const shoppingQuiz = await QuizQuestion.getRandomQuestions(10, 'shopping');

// Difficulty-specific quiz
const hardQuiz = await QuizQuestion.getRandomQuestions(5, null, 'hard');

// Combined filters
const mediumFoodQuiz = await QuizQuestion.getRandomQuestions(10, 'food', 'medium');
```

### Get Trivia Questions

```typescript
import { TriviaQuestion } from './models/TriviaQuestion';

// Daily trivia
const dailyTrivia = await TriviaQuestion.getDailyTrivia();

// Random trivia
const randomTrivia = await TriviaQuestion.getRandomTrivia(5);

// Category trivia
const scienceTrivia = await TriviaQuestion.getTriviaByCategory('science', 5);
```

### Update Statistics

```typescript
// After user answers a question
await QuizQuestion.updateQuestionStats(questionId, isCorrect);
await TriviaQuestion.updateTriviaStats(triviaId, isCorrect);

// Get accuracy rate
const accuracy = await QuizQuestion.getQuestionAccuracyRate(questionId);
console.log(`Question accuracy: ${accuracy}%`);
```

### Working with Coins

```typescript
import { CoinTransaction } from './models/CoinTransaction';

// Award coins with expiry (90 days)
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 90);

const transaction = await CoinTransaction.create({
  user: userId,
  type: 'earned',
  amount: 20,
  balance: newBalance,
  source: 'quiz_game',
  description: 'Completed quiz',
  expiresAt: expiryDate
});

// Get user balance
const balance = await CoinTransaction.getUserBalance(userId);

// Preview expirations
const preview = await previewUpcomingExpirations(7);
console.log(`${preview.totalCoins} coins expiring in 7 days`);
```

---

## File Locations

```
user-backend/src/
├── models/
│   ├── QuizQuestion.ts         ✨ NEW
│   ├── TriviaQuestion.ts       ✨ NEW
│   ├── CoinTransaction.ts      (existing, exported)
│   ├── GameSession.ts          (existing, exported)
│   └── index.ts                (updated exports)
├── jobs/
│   ├── cleanupExpiredSessions.ts  ✨ NEW
│   └── expireCoins.ts             ✨ NEW
├── scripts/
│   ├── seedQuizQuestions.ts    ✨ NEW
│   └── seedTriviaQuestions.ts  ✨ NEW
└── server.ts                   (updated initialization)
```

---

## Integration Status

### ✅ Completed

- [x] Models created and exported
- [x] Seed scripts with real data
- [x] Cron jobs implemented
- [x] Server integration
- [x] Error handling & logging
- [x] Comprehensive documentation

### 📋 Next Steps (Frontend/API)

1. **Create Controllers** (optional)
   - `quizController.ts` - Handle quiz API requests
   - `triviaController.ts` - Handle trivia API requests

2. **Create Routes** (optional)
   - `GET /api/quiz/random` - Get random quiz
   - `POST /api/quiz/answer` - Submit answer
   - `GET /api/trivia/daily` - Get daily trivia
   - `POST /api/trivia/answer` - Submit answer

3. **Frontend Integration**
   - Display questions
   - Handle user answers
   - Show results & explanations
   - Update user coin balance

---

## Configuration

### Cron Schedules

Located in job files, easily modifiable:

```typescript
// Session Cleanup
const CRON_SCHEDULE = '0 0 * * *';  // Midnight
const EXPIRY_HOURS = 24;
const DELETE_DAYS = 30;

// Coin Expiry
const CRON_SCHEDULE = '0 1 * * *';  // 1:00 AM
const NOTIFICATION_BATCH_SIZE = 50;
```

### Points Configuration

Modify in model files:

```typescript
// QuizQuestion.ts
const pointsMap = {
  easy: 10,
  medium: 20,
  hard: 30
};

// TriviaQuestion.ts
const pointsMap = {
  easy: 15,
  medium: 25,
  hard: 35
};
```

---

## Monitoring

### Check Logs

Jobs log to console with prefixes:

- `[SESSION CLEANUP]` - Session cleanup job
- `[COIN EXPIRY]` - Coin expiry job

### Key Metrics

**Session Cleanup:**
- Sessions expired per run
- Sessions deleted per run
- Current session distribution

**Coin Expiry:**
- Users affected per run
- Total coins expired
- Notifications sent/failed

### Health Check

```typescript
// Check if jobs are running
const sessionStatus = sessionCleanup.getStatus();
const coinStatus = coinExpiry.getStatus();

if (!sessionStatus.running) {
  console.warn('Session cleanup not running!');
}

if (!coinStatus.running) {
  console.warn('Coin expiry not running!');
}
```

---

## Testing Checklist

### Database Tests

- [ ] Seed quiz questions successfully
- [ ] Seed trivia questions successfully
- [ ] Query questions by category
- [ ] Query questions by difficulty
- [ ] Update question statistics
- [ ] Calculate accuracy rates

### Cron Job Tests

- [ ] Session cleanup runs manually
- [ ] Old sessions are expired correctly
- [ ] Very old sessions are deleted
- [ ] Coin expiry runs manually
- [ ] Expired coins are deducted
- [ ] Users receive notifications
- [ ] Preview function works

### Integration Tests

- [ ] Jobs initialize on server start
- [ ] Jobs run on schedule
- [ ] No errors in logs
- [ ] Database remains clean
- [ ] Performance is acceptable

---

## Common Tasks

### Add New Quiz Question

```typescript
await QuizQuestion.create({
  question: "Your question here?",
  options: ["Option 1", "Option 2", "Option 3", "Option 4"],
  correctAnswer: 0,  // Index of correct answer
  category: "shopping",
  difficulty: "medium",
  points: 20,
  explanation: "Explanation here",
  tags: ["tag1", "tag2"]
});
```

### Deactivate Question

```typescript
await QuizQuestion.findByIdAndUpdate(questionId, {
  isActive: false
});
```

### Change Job Schedule

Edit the job file and restart server:

```typescript
// Change from midnight to 2:00 AM
const CRON_SCHEDULE = '0 2 * * *';
```

### Stop/Start Jobs

```typescript
// Stop
sessionCleanup.stop();
coinExpiry.stop();

// Start
sessionCleanup.start();
coinExpiry.start();
```

---

## Troubleshooting

### Problem: Jobs not running

**Check:**
1. Server logs show job initialization
2. `getStatus()` shows `running: true`
3. MongoDB connected successfully

**Fix:**
```typescript
sessionCleanup.stop();
sessionCleanup.start();
```

### Problem: Seeds fail

**Check:**
1. MongoDB connection string correct
2. Database accessible
3. Permissions sufficient

**Fix:**
```bash
# Check connection
mongo <your-connection-string>

# Re-run seeds
npx ts-node src/scripts/seedQuizQuestions.ts
```

### Problem: Notifications not sending

**Check:**
1. Push notification service configured
2. Twilio credentials in .env
3. User has valid phone number

**Fix:**
Review notification service configuration in `.env`

---

## Support

For detailed information, see:
- **Full Documentation**: `QUIZ_TRIVIA_SYSTEM_DOCUMENTATION.md`
- **Model Code**: `src/models/QuizQuestion.ts` and `TriviaQuestion.ts`
- **Job Code**: `src/jobs/cleanupExpiredSessions.ts` and `expireCoins.ts`

---

**Quick Summary:**
- ✅ 2 models with 80 seed questions total
- ✅ 2 automated cron jobs running daily
- ✅ Full statistics and analytics
- ✅ Production-ready with error handling
- ✅ Comprehensive logging and monitoring

**Status:** Ready for API integration and frontend development!

---

**Last Updated**: November 3, 2025
**Agent**: Agent 3 - Backend Database Architect
