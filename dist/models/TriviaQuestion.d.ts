import { Document, Model } from 'mongoose';
/**
 * Trivia Question Interface
 *
 * Represents daily trivia questions for user engagement
 * Trivia differs from quiz in that it's more fact-based, often with interesting information
 * Used for daily challenges and casual knowledge sharing
 */
export interface ITriviaQuestion extends Document {
    question: string;
    options: string[];
    correctAnswer: number;
    category: 'history' | 'science' | 'geography' | 'pop_culture' | 'movies' | 'music' | 'art' | 'literature' | 'nature' | 'random';
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    funFact?: string;
    imageUrl?: string;
    sourceUrl?: string;
    tags?: string[];
    dateOfDay?: Date;
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
export interface ITriviaQuestionModel extends Model<ITriviaQuestion> {
    getDailyTrivia(date?: Date): Promise<ITriviaQuestion>;
    getRandomTrivia(count?: number, category?: string): Promise<ITriviaQuestion[]>;
    getTriviaByCategory(category: string, limit?: number): Promise<ITriviaQuestion[]>;
    updateTriviaStats(triviaId: string, isCorrect: boolean): Promise<void>;
    assignDailyTrivia(date: Date): Promise<ITriviaQuestion>;
}
export declare const TriviaQuestion: ITriviaQuestionModel;
export default TriviaQuestion;
