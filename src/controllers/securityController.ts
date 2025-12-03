// Security Controller
// Handles device verification, fraud detection, and security checks

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import AuditLog from '../models/AuditLog';

// In-memory storage for blacklisted devices/IPs (in production, use Redis)
const blacklist = {
  devices: new Set<string>(),
  ips: new Set<string>()
};

// In-memory storage for suspicious activity tracking
const suspiciousActivity = new Map<string, {
  count: number;
  lastReported: Date;
  reasons: string[];
}>();

// Device trust scores (in production, use Redis or database)
const deviceTrustScores = new Map<string, {
  score: number;
  lastVerified: Date;
  verificationCount: number;
}>();

// Multi-account tracking
const deviceUserMap = new Map<string, Set<string>>();
const ipUserMap = new Map<string, Set<string>>();

// Helper: Calculate trust score based on device info
const calculateTrustScore = (
  deviceId: string,
  userId: string,
  isNewDevice: boolean,
  suspiciousFlags: string[]
): number => {
  let score = 100;

  // Deduct for new device
  if (isNewDevice) score -= 20;

  // Deduct for suspicious flags
  score -= suspiciousFlags.length * 15;

  // Deduct if device used by multiple accounts
  const usersOnDevice = deviceUserMap.get(deviceId);
  if (usersOnDevice && usersOnDevice.size > 1) {
    score -= (usersOnDevice.size - 1) * 25;
  }

  // Bonus for verified device history
  const deviceHistory = deviceTrustScores.get(deviceId);
  if (deviceHistory && deviceHistory.verificationCount > 5) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
};

// Verify device fingerprint
export const verifyDevice = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { deviceId, platform, osVersion, appVersion, deviceModel, deviceName } = req.body;

  console.log('🔒 [SECURITY] Verifying device:', { userId, deviceId: deviceId?.substring(0, 10) + '...' });

  try {
    const suspiciousFlags: string[] = [];

    // Check if device is blacklisted
    if (blacklist.devices.has(deviceId)) {
      return sendSuccess(res, {
        passed: false,
        isBlacklisted: true,
        isSuspicious: true,
        trustScore: 0,
        flags: ['Device is blacklisted'],
        deviceFingerprint: { id: deviceId }
      });
    }

    // Track device-user relationship
    if (!deviceUserMap.has(deviceId)) {
      deviceUserMap.set(deviceId, new Set());
    }
    const usersOnDevice = deviceUserMap.get(deviceId)!;
    const isNewDevice = !usersOnDevice.has(userId);
    usersOnDevice.add(userId);

    // Check for multiple accounts on same device
    if (usersOnDevice.size > 3) {
      suspiciousFlags.push('Multiple accounts detected on device');
    }

    // Get or create trust score entry
    const existingTrust = deviceTrustScores.get(deviceId);
    const trustScore = calculateTrustScore(deviceId, userId, isNewDevice, suspiciousFlags);

    // Update trust score
    deviceTrustScores.set(deviceId, {
      score: trustScore,
      lastVerified: new Date(),
      verificationCount: (existingTrust?.verificationCount || 0) + 1
    });

    const isSuspicious = trustScore < 50 || suspiciousFlags.length > 0;

    // Log verification
    await AuditLog.log({
      merchantId: new Types.ObjectId('000000000000000000000000'),
      merchantUserId: new Types.ObjectId(userId),
      action: 'device_verification',
      resourceType: 'Security',
      resourceId: new Types.ObjectId(),
      details: {
        changes: {
          deviceId: deviceId?.substring(0, 20),
          platform,
          trustScore,
          isSuspicious,
          flagsCount: suspiciousFlags.length
        }
      },
      ipAddress: (req.ip || '0.0.0.0') as string,
      userAgent: (req.headers['user-agent'] || 'unknown') as string
    });

    console.log('✅ [SECURITY] Device verified:', { trustScore, isSuspicious });

    sendSuccess(res, {
      passed: trustScore >= 30 && !blacklist.devices.has(deviceId),
      isBlacklisted: false,
      isSuspicious,
      trustScore,
      flags: suspiciousFlags,
      deviceFingerprint: {
        id: deviceId,
        platform,
        osVersion,
        appVersion,
        deviceModel,
        deviceName,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [SECURITY] Device verification error:', error);
    // Return safe defaults on error
    sendSuccess(res, {
      passed: true,
      isBlacklisted: false,
      isSuspicious: false,
      trustScore: 70,
      flags: [],
      deviceFingerprint: { id: deviceId }
    });
  }
});

// Check if device/IP is blacklisted
export const checkBlacklist = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId, ip } = req.body;
  const clientIp = ip || req.ip || req.socket.remoteAddress;

  console.log('🔒 [SECURITY] Checking blacklist:', { deviceId: deviceId?.substring(0, 10), ip: clientIp });

  try {
    const isDeviceBlacklisted = deviceId ? blacklist.devices.has(deviceId) : false;
    const isIpBlacklisted = clientIp ? blacklist.ips.has(clientIp as string) : false;

    sendSuccess(res, {
      isBlacklisted: isDeviceBlacklisted || isIpBlacklisted,
      deviceBlacklisted: isDeviceBlacklisted,
      ipBlacklisted: isIpBlacklisted,
      reason: isDeviceBlacklisted ? 'Device blocked' : (isIpBlacklisted ? 'IP blocked' : null)
    });

  } catch (error) {
    console.error('❌ [SECURITY] Blacklist check error:', error);
    sendSuccess(res, {
      isBlacklisted: false,
      deviceBlacklisted: false,
      ipBlacklisted: false,
      reason: null
    });
  }
});

// Report suspicious activity
export const reportSuspicious = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { type, details } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress;

  console.log('⚠️ [SECURITY] Suspicious activity reported:', { userId, type });

  try {
    const key = `${userId}_${type}`;
    const existing = suspiciousActivity.get(key);

    if (existing) {
      existing.count += 1;
      existing.lastReported = new Date();
      if (details?.reason && !existing.reasons.includes(details.reason)) {
        existing.reasons.push(details.reason);
      }
    } else {
      suspiciousActivity.set(key, {
        count: 1,
        lastReported: new Date(),
        reasons: details?.reason ? [details.reason] : []
      });
    }

    // Auto-blacklist if too many reports
    const activity = suspiciousActivity.get(key)!;
    if (activity.count >= 10) {
      if (details?.deviceId) {
        blacklist.devices.add(details.deviceId);
        console.log('🚫 [SECURITY] Device auto-blacklisted:', details.deviceId?.substring(0, 10));
      }
    }

    // Log the report
    await AuditLog.log({
      merchantId: new Types.ObjectId('000000000000000000000000'),
      merchantUserId: new Types.ObjectId(userId),
      action: 'suspicious_activity_reported',
      resourceType: 'Security',
      resourceId: new Types.ObjectId(),
      details: {
        changes: {
          type,
          reportCount: activity.count,
          ...details
        }
      },
      ipAddress: (clientIp || '0.0.0.0') as string,
      userAgent: (req.headers['user-agent'] || 'unknown') as string
    });

    sendSuccess(res, {
      reported: true,
      reportId: `report_${Date.now()}`,
      totalReports: activity.count
    });

  } catch (error) {
    console.error('❌ [SECURITY] Report suspicious error:', error);
    sendSuccess(res, {
      reported: true,
      reportId: `report_${Date.now()}`,
      totalReports: 1
    });
  }
});

// Verify captcha token
export const verifyCaptcha = asyncHandler(async (req: Request, res: Response) => {
  const { token, action } = req.body;

  console.log('🔒 [SECURITY] Verifying captcha:', { action });

  try {
    // In production, verify token with reCAPTCHA or hCaptcha API
    // For now, accept all tokens with basic validation

    const isValidFormat = token && token.length > 20;

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production:
    // const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    //   method: 'POST',
    //   body: `secret=${RECAPTCHA_SECRET}&response=${token}`
    // });
    // const data = await response.json();

    const simulatedScore = isValidFormat ? 0.9 : 0.3;

    sendSuccess(res, {
      success: isValidFormat,
      score: simulatedScore,
      action: action || 'submit',
      challengeTs: new Date().toISOString(),
      hostname: 'rezapp.com'
    });

  } catch (error) {
    console.error('❌ [SECURITY] Captcha verification error:', error);
    sendSuccess(res, {
      success: true, // Fail open to not block users
      score: 0.5,
      action: action || 'submit',
      challengeTs: new Date().toISOString(),
      hostname: 'rezapp.com'
    });
  }
});

// Get IP information
export const getIpInfo = asyncHandler(async (req: Request, res: Response) => {
  const { ip } = req.body;
  const clientIp = ip || req.ip || req.socket.remoteAddress || 'unknown';

  console.log('🔒 [SECURITY] Getting IP info:', { ip: clientIp });

  try {
    // In production, use IP geolocation service (ipinfo.io, maxmind, etc.)
    // For now, return simulated data

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simple VPN/proxy detection heuristics
    const isVpn = false; // In production, check against VPN IP databases
    const isProxy = false;
    const isTor = false;

    sendSuccess(res, {
      ip: clientIp,
      country: 'IN',
      countryName: 'India',
      region: 'MH',
      regionName: 'Maharashtra',
      city: 'Mumbai',
      timezone: 'Asia/Kolkata',
      isp: 'Sample ISP',
      isVpn,
      isProxy,
      isTor,
      isDatacenter: false,
      riskScore: isVpn || isProxy || isTor ? 70 : 10
    });

  } catch (error) {
    console.error('❌ [SECURITY] IP info error:', error);
    sendSuccess(res, {
      ip: clientIp,
      country: 'UNKNOWN',
      isVpn: false,
      isProxy: false,
      isTor: false,
      riskScore: 0
    });
  }
});

// Check for multi-account patterns
export const checkMultiAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { deviceId, ip } = req.body;
  const clientIp = ip || req.ip || req.socket.remoteAddress;

  console.log('🔒 [SECURITY] Checking multi-account:', { userId });

  try {
    const warnings: string[] = [];
    let riskScore = 0;

    // Check device-user relationship
    if (deviceId) {
      const usersOnDevice = deviceUserMap.get(deviceId);
      if (usersOnDevice && usersOnDevice.size > 1) {
        const otherUsers = usersOnDevice.size - 1;
        warnings.push(`Device used by ${otherUsers} other account(s)`);
        riskScore += otherUsers * 20;
      }
    }

    // Check IP-user relationship
    if (clientIp) {
      if (!ipUserMap.has(clientIp as string)) {
        ipUserMap.set(clientIp as string, new Set());
      }
      const usersOnIp = ipUserMap.get(clientIp as string)!;
      usersOnIp.add(userId);

      if (usersOnIp.size > 2) {
        const otherUsers = usersOnIp.size - 1;
        warnings.push(`IP used by ${otherUsers} other account(s)`);
        riskScore += otherUsers * 10;
      }
    }

    const isMultiAccount = warnings.length > 0;
    const riskLevel = riskScore >= 60 ? 'high' : (riskScore >= 30 ? 'medium' : 'low');

    sendSuccess(res, {
      isMultiAccount,
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      warnings,
      deviceAccounts: deviceId ? (deviceUserMap.get(deviceId)?.size || 1) : 1,
      ipAccounts: clientIp ? (ipUserMap.get(clientIp as string)?.size || 1) : 1
    });

  } catch (error) {
    console.error('❌ [SECURITY] Multi-account check error:', error);
    sendSuccess(res, {
      isMultiAccount: false,
      riskScore: 0,
      riskLevel: 'low',
      warnings: [],
      deviceAccounts: 1,
      ipAccounts: 1
    });
  }
});
