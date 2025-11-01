interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    difficulty: 'easy' | 'medium' | 'hard';
    coins: number;
    category: string;
}
/**
 * Start a new quiz session
 */
export declare function startQuiz(userId: string, difficulty: 'easy' | 'medium' | 'hard', questionCount?: number): Promise<{
    quizId: string;
    questions: Array<Omit<QuizQuestion, 'correctAnswer' | 'coins'>>;
    timeLimit: number;
    totalQuestions: number;
}>;
/**
 * Submit answer for a quiz question
 */
export declare function submitAnswer(quizId: string, questionIndex: number, answer: number, timeSpent: number): Promise<{
    correct: boolean;
    coinsEarned: number;
    currentScore: number;
    correctAnswer: number;
    explanation?: string;
    completed: boolean;
}>;
/**
 * Get quiz progress
 */
export declare function getQuizProgress(quizId: string): Promise<any>;
/**
 * Complete quiz (submit all answers)
 */
export declare function completeQuiz(quizId: string): Promise<any>;
/**
 * Get quiz statistics for user
 */
export declare function getQuizStats(userId: string): Promise<any>;
/**
 * Get quiz history
 */
export declare function getQuizHistory(userId: string, limit?: number): Promise<any[]>;
declare const _default: {
    startQuiz: typeof startQuiz;
    submitAnswer: typeof submitAnswer;
    getQuizProgress: typeof getQuizProgress;
    completeQuiz: typeof completeQuiz;
    getQuizStats: typeof getQuizStats;
    getQuizHistory: typeof getQuizHistory;
};
export default _default;
