import { Request, Response, NextFunction } from 'express';
/**
 * IP Blocker Middleware
 * Checks if the requesting IP is blocked
 */
export declare const ipBlocker: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Manually block an IP address
 * @param ip IP address to block
 * @param reason Optional reason for blocking
 */
export declare const blockIP: (ip: string, reason?: string) => void;
/**
 * Unblock an IP address
 * @param ip IP address to unblock
 */
export declare const unblockIP: (ip: string) => void;
/**
 * Get list of all blocked IPs
 * @returns Array of blocked IP addresses
 */
export declare const getBlockedIPs: () => string[];
/**
 * Check if an IP is blocked
 * @param ip IP address to check
 * @returns true if blocked, false otherwise
 */
export declare const isIPBlocked: (ip: string) => boolean;
/**
 * Record a violation for an IP
 * Automatically blocks IP if violations exceed threshold
 * @param ip IP address that violated a rule
 * @param violationType Type of violation
 */
export declare const recordViolation: (ip: string, violationType: string) => void;
/**
 * Get violation count for an IP
 * @param ip IP address
 * @returns Violation count and last violation time
 */
export declare const getViolations: (ip: string) => {
    count: number;
    lastViolation: Date;
} | null;
/**
 * Clear all violations for an IP
 * @param ip IP address
 */
export declare const clearViolations: (ip: string) => void;
/**
 * Middleware to record violations when rate limit is hit
 * Use this in conjunction with rate limiters
 */
export declare const recordRateLimitViolation: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Clear blocked IPs (admin function)
 * WARNING: Use with caution
 */
export declare const clearAllBlockedIPs: () => void;
/**
 * Get IP blocker statistics
 * @returns Statistics object
 */
export declare const getIPBlockerStats: () => {
    blockedIPsCount: number;
    blockedIPs: string[];
    trackedIPsCount: number;
    violations: {
        ip: string;
        violations: number;
        lastViolation: Date;
    }[];
};
export declare const ipBlockerConfig: {
    MAX_VIOLATIONS: number;
    VIOLATION_WINDOW: number;
    VIOLATION_RESET_TIME: number;
};
