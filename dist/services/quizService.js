"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startQuiz = startQuiz;
exports.submitAnswer = submitAnswer;
exports.getQuizProgress = getQuizProgress;
exports.completeQuiz = completeQuiz;
exports.getQuizStats = getQuizStats;
exports.getQuizHistory = getQuizHistory;
const MiniGame_1 = require("../models/MiniGame");
const CoinTransaction_1 = require("../models/CoinTransaction");
const QUIZ_QUESTIONS = [
    // Easy Questions (20 coins each)
    {
        id: 'q1',
        question: 'What is the capital of India?',
        options: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai'],
        correctAnswer: 1,
        difficulty: 'easy',
        coins: 20,
        category: 'Geography'
    },
    {
        id: 'q2',
        question: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswer: 1,
        difficulty: 'easy',
        coins: 20,
        category: 'Science'
    },
    {
        id: 'q3',
        question: 'How many days are there in a leap year?',
        options: ['365', '366', '364', '367'],
        correctAnswer: 1,
        difficulty: 'easy',
        coins: 20,
        category: 'General Knowledge'
    },
    {
        id: 'q4',
        question: 'What is the largest ocean on Earth?',
        options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
        correctAnswer: 2,
        difficulty: 'easy',
        coins: 20,
        category: 'Geography'
    },
    {
        id: 'q5',
        question: 'What is the currency of Japan?',
        options: ['Yuan', 'Won', 'Yen', 'Ringgit'],
        correctAnswer: 2,
        difficulty: 'easy',
        coins: 20,
        category: 'General Knowledge'
    },
    // Medium Questions (50 coins each)
    {
        id: 'q6',
        question: 'Who wrote the Mahabharata?',
        options: ['Valmiki', 'Tulsidas', 'Vyasa', 'Kalidasa'],
        correctAnswer: 2,
        difficulty: 'medium',
        coins: 50,
        category: 'Literature'
    },
    {
        id: 'q7',
        question: 'In which year did India gain independence?',
        options: ['1945', '1946', '1947', '1948'],
        correctAnswer: 2,
        difficulty: 'medium',
        coins: 50,
        category: 'History'
    },
    {
        id: 'q8',
        question: 'What is the chemical symbol for Gold?',
        options: ['Go', 'Au', 'Gd', 'Ag'],
        correctAnswer: 1,
        difficulty: 'medium',
        coins: 50,
        category: 'Science'
    },
    {
        id: 'q9',
        question: 'Which is the longest river in the world?',
        options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
        correctAnswer: 1,
        difficulty: 'medium',
        coins: 50,
        category: 'Geography'
    },
    {
        id: 'q10',
        question: 'Who invented the telephone?',
        options: ['Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Guglielmo Marconi'],
        correctAnswer: 1,
        difficulty: 'medium',
        coins: 50,
        category: 'History'
    },
    // Hard Questions (100 coins each)
    {
        id: 'q11',
        question: 'What is the speed of light in vacuum (km/s)?',
        options: ['300,000', '150,000', '450,000', '600,000'],
        correctAnswer: 0,
        difficulty: 'hard',
        coins: 100,
        category: 'Science'
    },
    {
        id: 'q12',
        question: 'Which Mughal emperor built the Taj Mahal?',
        options: ['Akbar', 'Jahangir', 'Shah Jahan', 'Aurangzeb'],
        correctAnswer: 2,
        difficulty: 'hard',
        coins: 100,
        category: 'History'
    },
    {
        id: 'q13',
        question: 'What is the smallest country in the world?',
        options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
        correctAnswer: 1,
        difficulty: 'hard',
        coins: 100,
        category: 'Geography'
    },
    {
        id: 'q14',
        question: 'Who is known as the "Father of Computers"?',
        options: ['Charles Babbage', 'Alan Turing', 'John von Neumann', 'Steve Jobs'],
        correctAnswer: 0,
        difficulty: 'hard',
        coins: 100,
        category: 'Technology'
    },
    {
        id: 'q15',
        question: 'What is the chemical formula for water?',
        options: ['H2O', 'CO2', 'O2', 'H2O2'],
        correctAnswer: 0,
        difficulty: 'hard',
        coins: 100,
        category: 'Science'
    }
];
/**
 * Start a new quiz session
 */
async function startQuiz(userId, difficulty, questionCount = 5) {
    // Expire old active quizzes
    await MiniGame_1.MiniGame.updateMany({
        user: userId,
        gameType: 'quiz',
        status: 'active'
    }, {
        status: 'expired'
    });
    // Select random questions of the specified difficulty
    const availableQuestions = QUIZ_QUESTIONS.filter(q => q.difficulty === difficulty);
    const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(questionCount, availableQuestions.length));
    if (selectedQuestions.length === 0) {
        throw new Error('No questions available for this difficulty');
    }
    // Create quiz session (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const quiz = await MiniGame_1.MiniGame.create({
        user: userId,
        gameType: 'quiz',
        status: 'active',
        difficulty,
        expiresAt,
        metadata: {
            questions: selectedQuestions.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                coins: q.coins,
                category: q.category
            })),
            currentQuestion: 0,
            score: 0,
            correctAnswers: 0,
            totalQuestions: selectedQuestions.length,
            answers: []
        }
    });
    return {
        quizId: quiz._id.toString(),
        questions: selectedQuestions.map(({ correctAnswer, coins, ...q }) => q),
        timeLimit: 30, // 30 seconds per question
        totalQuestions: selectedQuestions.length
    };
}
/**
 * Submit answer for a quiz question
 */
async function submitAnswer(quizId, questionIndex, answer, timeSpent) {
    const quiz = await MiniGame_1.MiniGame.findById(quizId);
    if (!quiz) {
        throw new Error('Quiz not found');
    }
    if (quiz.status === 'completed') {
        throw new Error('Quiz already completed');
    }
    if (quiz.status === 'expired') {
        throw new Error('Quiz has expired');
    }
    if (new Date() > quiz.expiresAt) {
        quiz.status = 'expired';
        await quiz.save();
        throw new Error('Quiz has expired');
    }
    const questions = quiz.metadata?.questions || [];
    const question = questions[questionIndex];
    if (!question) {
        throw new Error('Invalid question index');
    }
    const correct = answer === question.correctAnswer;
    const coinsEarned = correct ? question.coins : 0;
    // Update quiz metadata
    const answers = quiz.metadata?.answers || [];
    answers.push({
        questionIndex,
        answer,
        correct,
        coinsEarned,
        timeSpent
    });
    quiz.metadata = {
        ...quiz.metadata,
        answers,
        score: (quiz.metadata?.score ?? 0) + coinsEarned,
        correctAnswers: (quiz.metadata?.correctAnswers ?? 0) + (correct ? 1 : 0),
        currentQuestion: questionIndex + 1
    };
    // Check if quiz is complete
    const completed = (quiz.metadata.currentQuestion ?? 0) >= (quiz.metadata.totalQuestions ?? 0);
    if (completed) {
        quiz.status = 'completed';
        quiz.completedAt = new Date();
        quiz.reward = { coins: quiz.metadata.score ?? 0 };
        // Award coins
        if ((quiz.metadata.score ?? 0) > 0) {
            await CoinTransaction_1.CoinTransaction.createTransaction(quiz.user.toString(), 'earned', quiz.metadata.score ?? 0, 'quiz_game', `Earned ${quiz.metadata.score ?? 0} coins from Quiz (${quiz.difficulty ?? 'easy'})`, { quizId: quiz._id });
        }
    }
    await quiz.save();
    return {
        correct,
        coinsEarned,
        currentScore: quiz.metadata.score ?? 0,
        correctAnswer: question.correctAnswer,
        completed
    };
}
/**
 * Get quiz progress
 */
async function getQuizProgress(quizId) {
    const quiz = await MiniGame_1.MiniGame.findById(quizId);
    if (!quiz) {
        throw new Error('Quiz not found');
    }
    return {
        quizId: quiz._id,
        status: quiz.status,
        difficulty: quiz.difficulty,
        currentQuestion: quiz.metadata?.currentQuestion || 0,
        totalQuestions: quiz.metadata?.totalQuestions || 0,
        score: quiz.metadata?.score || 0,
        correctAnswers: quiz.metadata?.correctAnswers || 0,
        answers: quiz.metadata?.answers || [],
        completedAt: quiz.completedAt,
        expiresAt: quiz.expiresAt
    };
}
/**
 * Complete quiz (submit all answers)
 */
async function completeQuiz(quizId) {
    const quiz = await MiniGame_1.MiniGame.findById(quizId);
    if (!quiz) {
        throw new Error('Quiz not found');
    }
    if (quiz.status === 'completed') {
        return getQuizProgress(quizId);
    }
    // Force complete the quiz
    quiz.status = 'completed';
    quiz.completedAt = new Date();
    quiz.reward = { coins: quiz.metadata?.score || 0 };
    // Award coins if any
    if (quiz.metadata?.score && quiz.metadata.score > 0) {
        await CoinTransaction_1.CoinTransaction.createTransaction(quiz.user.toString(), 'earned', quiz.metadata.score, 'quiz_game', `Earned ${quiz.metadata.score} coins from Quiz (${quiz.difficulty})`, { quizId: quiz._id });
    }
    await quiz.save();
    return getQuizProgress(quizId);
}
/**
 * Get quiz statistics for user
 */
async function getQuizStats(userId) {
    const quizzes = await MiniGame_1.MiniGame.find({
        user: userId,
        gameType: 'quiz',
        status: 'completed'
    });
    const totalQuizzes = quizzes.length;
    let totalCoinsEarned = 0;
    let totalQuestionsAnswered = 0;
    let totalCorrectAnswers = 0;
    const difficultyStats = {
        easy: { played: 0, coins: 0, accuracy: 0 },
        medium: { played: 0, coins: 0, accuracy: 0 },
        hard: { played: 0, coins: 0, accuracy: 0 }
    };
    quizzes.forEach(quiz => {
        const coins = quiz.reward?.coins || 0;
        const correct = quiz.metadata?.correctAnswers || 0;
        const total = quiz.metadata?.totalQuestions || 0;
        const difficulty = quiz.difficulty || 'easy';
        totalCoinsEarned += coins;
        totalQuestionsAnswered += total;
        totalCorrectAnswers += correct;
        if (difficulty in difficultyStats) {
            difficultyStats[difficulty].played += 1;
            difficultyStats[difficulty].coins += coins;
            difficultyStats[difficulty].accuracy =
                ((difficultyStats[difficulty].accuracy * (difficultyStats[difficulty].played - 1)) +
                    (total > 0 ? (correct / total) * 100 : 0)) / difficultyStats[difficulty].played;
        }
    });
    const overallAccuracy = totalQuestionsAnswered > 0
        ? (totalCorrectAnswers / totalQuestionsAnswered) * 100
        : 0;
    return {
        totalQuizzes,
        totalCoinsEarned,
        totalQuestionsAnswered,
        totalCorrectAnswers,
        overallAccuracy: Math.round(overallAccuracy * 100) / 100,
        difficultyStats
    };
}
/**
 * Get quiz history
 */
async function getQuizHistory(userId, limit = 10) {
    const quizzes = await MiniGame_1.MiniGame.find({
        user: userId,
        gameType: 'quiz',
        status: 'completed'
    })
        .sort({ completedAt: -1 })
        .limit(limit);
    return quizzes.map(q => ({
        id: q._id,
        difficulty: q.difficulty,
        score: q.metadata?.score ?? 0,
        correctAnswers: q.metadata?.correctAnswers ?? 0,
        totalQuestions: q.metadata?.totalQuestions ?? 0,
        accuracy: (q.metadata?.totalQuestions ?? 0) > 0
            ? Math.round(((q.metadata?.correctAnswers ?? 0) / (q.metadata?.totalQuestions ?? 1)) * 100)
            : 0,
        coinsEarned: q.reward?.coins ?? 0,
        completedAt: q.completedAt
    }));
}
exports.default = {
    startQuiz,
    submitAnswer,
    getQuizProgress,
    completeQuiz,
    getQuizStats,
    getQuizHistory
};
