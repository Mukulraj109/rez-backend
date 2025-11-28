import { Request, Response, NextFunction } from 'express';

/**
 * IP Blocker Middleware
 * Blocks IPs that have been flagged for suspicious activity
 *
 * Features:
 * - In-memory blocked IPs set (can be moved to database/Redis for production)
 * - Manual IP blocking/unblocking functions
 * - Automatic blocking after multiple violations (future enhancement)
 */

// Blocked IPs list (can be moved to database later for persistence)
const blockedIPs: Set<string> = new Set();

// Violation tracking (for automatic blocking)
const violationTracker: Map<string, { count: number; lastViolation: Date }> = new Map();

// Configuration
const MAX_VIOLATIONS = 10; // Block IP after this many violations
const VIOLATION_WINDOW = 3600000; // 1 hour in milliseconds
const VIOLATION_RESET_TIME = 86400000; // Reset violations after 24 hours

/**
 * IP Blocker Middleware
 * Checks if the requesting IP is blocked
 */
export const ipBlocker = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

  if (blockedIPs.has(clientIP)) {
    console.log(`🚫 Blocked request from IP: ${clientIP}`);
    return res.status(403).json({
      success: false,
      error: 'Your IP has been blocked due to suspicious activity. Please contact support if you believe this is a mistake.'
    });
  }

  next();
};

/**
 * Manually block an IP address
 * @param ip IP address to block
 * @param reason Optional reason for blocking
 */
export const blockIP = (ip: string, reason?: string): void => {
  blockedIPs.add(ip);
  console.log(`🚫 Blocked IP: ${ip}${reason ? ` - Reason: ${reason}` : ''}`);
};

/**
 * Unblock an IP address
 * @param ip IP address to unblock
 */
export const unblockIP = (ip: string): void => {
  const wasBlocked = blockedIPs.delete(ip);
  if (wasBlocked) {
    console.log(`✅ Unblocked IP: ${ip}`);
  } else {
    console.log(`⚠️ IP was not in blocklist: ${ip}`);
  }
};

/**
 * Get list of all blocked IPs
 * @returns Array of blocked IP addresses
 */
export const getBlockedIPs = (): string[] => {
  return Array.from(blockedIPs);
};

/**
 * Check if an IP is blocked
 * @param ip IP address to check
 * @returns true if blocked, false otherwise
 */
export const isIPBlocked = (ip: string): boolean => {
  return blockedIPs.has(ip);
};

/**
 * Record a violation for an IP
 * Automatically blocks IP if violations exceed threshold
 * @param ip IP address that violated a rule
 * @param violationType Type of violation
 */
export const recordViolation = (ip: string, violationType: string): void => {
  const now = new Date();
  const record = violationTracker.get(ip);

  if (!record) {
    // First violation
    violationTracker.set(ip, { count: 1, lastViolation: now });
    console.log(`⚠️ First violation recorded for IP ${ip}: ${violationType}`);
  } else {
    // Check if we should reset violations (24 hours passed)
    const timeSinceLastViolation = now.getTime() - record.lastViolation.getTime();

    if (timeSinceLastViolation > VIOLATION_RESET_TIME) {
      // Reset violations
      violationTracker.set(ip, { count: 1, lastViolation: now });
      console.log(`🔄 Violations reset for IP ${ip}. New violation: ${violationType}`);
    } else {
      // Increment violations
      record.count++;
      record.lastViolation = now;
      violationTracker.set(ip, record);
      console.log(`⚠️ Violation #${record.count} for IP ${ip}: ${violationType}`);

      // Auto-block if threshold exceeded
      if (record.count >= MAX_VIOLATIONS) {
        blockIP(ip, `Automatic block: ${record.count} violations - Last: ${violationType}`);
        console.log(`🚨 IP ${ip} automatically blocked after ${record.count} violations`);
      }
    }
  }
};

/**
 * Get violation count for an IP
 * @param ip IP address
 * @returns Violation count and last violation time
 */
export const getViolations = (ip: string): { count: number; lastViolation: Date } | null => {
  return violationTracker.get(ip) || null;
};

/**
 * Clear all violations for an IP
 * @param ip IP address
 */
export const clearViolations = (ip: string): void => {
  violationTracker.delete(ip);
  console.log(`🧹 Cleared violations for IP: ${ip}`);
};

/**
 * Middleware to record violations when rate limit is hit
 * Use this in conjunction with rate limiters
 */
export const recordRateLimitViolation = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  recordViolation(clientIP, 'Rate Limit Exceeded');
  next();
};

/**
 * Clear blocked IPs (admin function)
 * WARNING: Use with caution
 */
export const clearAllBlockedIPs = (): void => {
  const count = blockedIPs.size;
  blockedIPs.clear();
  console.log(`🧹 Cleared all ${count} blocked IPs`);
};

/**
 * Get IP blocker statistics
 * @returns Statistics object
 */
export const getIPBlockerStats = () => {
  return {
    blockedIPsCount: blockedIPs.size,
    blockedIPs: Array.from(blockedIPs),
    trackedIPsCount: violationTracker.size,
    violations: Array.from(violationTracker.entries()).map(([ip, data]) => ({
      ip,
      violations: data.count,
      lastViolation: data.lastViolation
    }))
  };
};

// Export configuration for transparency
export const ipBlockerConfig = {
  MAX_VIOLATIONS,
  VIOLATION_WINDOW,
  VIOLATION_RESET_TIME
};
