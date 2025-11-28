import { Document, Model } from 'mongoose';
/**
 * Quiz Question Interface
 *
 * Represents a quiz question that users can answer to earn coins
 * Used in the quiz game feature for user engagement and gamification
 */
export interface IQuizQuestion extends Document {
    question: string;
    options: string[];
    correctAnswer: number;
    category: 'general' | 'shopping' | 'fashion' | 'food' | 'technology' | 'entertainment' | 'sports' | 'lifestyle';
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    explanation?: string;
    imageUrl?: string;
    tags?: string[];
    isActive: boolean;
    usageCount: number;
    correctAnswerCount: number;
    incorrectAnswerCount: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Interface for static methods
 */
export interface IQuizQuestionModel extends Model<IQuizQuestion> {
    getRandomQuestions(count: number, category?: string, difficulty?: string): Promise<IQuizQuestion[]>;
    getQuestionsByDifficulty(difficulty: string, limit?: number): Promise<IQuizQuestion[]>;
    getQuestionsByCategory(category: string, limit?: number): Promise<IQuizQuestion[]>;
    updateQuestionStats(questionId: string, isCorrect: boolean): Promise<void>;
    getQuestionAccuracyRate(questionId: string): Promise<number>;
}
export declare const QuizQuestion: IQuizQuestionModel;
export default QuizQuestion;
