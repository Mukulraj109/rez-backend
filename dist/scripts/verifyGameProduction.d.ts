/**
 * Game Production Readiness Verification Script
 *
 * This script verifies that all game-related features are production-ready:
 * 1. Models are properly defined and exported
 * 2. Database connection works
 * 3. Seed data exists (QuizQuestions, TriviaQuestions)
 * 4. Static methods work correctly
 * 5. Cron jobs are initialized
 */
interface VerificationReport {
    timestamp: string;
    environment: string;
    database: {
        connected: boolean;
        uri: string;
        connectionTime: number;
    };
    models: {
        QuizQuestion: {
            exists: boolean;
            exported: boolean;
            totalCount: number;
            activeCount: number;
            categories: Record<string, number>;
            difficulties: Record<string, number>;
        };
        TriviaQuestion: {
            exists: boolean;
            exported: boolean;
            totalCount: number;
            activeCount: number;
            categories: Record<string, number>;
            difficulties: Record<string, number>;
        };
        GameSession: {
            exists: boolean;
            exported: boolean;
            totalCount: number;
            statusBreakdown: Record<string, number>;
            gameTypeBreakdown: Record<string, number>;
        };
    };
    staticMethods: {
        QuizQuestion: {
            getRandomQuestions: {
                tested: boolean;
                success: boolean;
                sampleSize: number;
                error?: string;
            };
            getQuestionsByDifficulty: {
                tested: boolean;
                success: boolean;
                error?: string;
            };
            getQuestionsByCategory: {
                tested: boolean;
                success: boolean;
                error?: string;
            };
        };
        TriviaQuestion: {
            getRandomTrivia: {
                tested: boolean;
                success: boolean;
                sampleSize: number;
                error?: string;
            };
            getTriviaByCategory: {
                tested: boolean;
                success: boolean;
                error?: string;
            };
        };
        GameSession: {
            expireSessions: {
                tested: boolean;
                success: boolean;
                error?: string;
            };
        };
    };
    cronJobs: {
        sessionCleanup: {
            file: string;
            exists: boolean;
        };
        coinExpiry: {
            file: string;
            exists: boolean;
        };
    };
    productionReady: boolean;
    issues: string[];
    recommendations: string[];
}
declare function verifyGameProduction(): Promise<VerificationReport>;
export { verifyGameProduction };
