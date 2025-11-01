import { Document, Types } from 'mongoose';
export interface INotificationPreferences {
    push: {
        enabled: boolean;
        orderUpdates: boolean;
        promotions: boolean;
        recommendations: boolean;
        priceAlerts: boolean;
        deliveryUpdates: boolean;
        paymentUpdates: boolean;
        securityAlerts: boolean;
        chatMessages: boolean;
    };
    email: {
        enabled: boolean;
        newsletters: boolean;
        orderReceipts: boolean;
        weeklyDigest: boolean;
        promotions: boolean;
        securityAlerts: boolean;
        accountUpdates: boolean;
    };
    sms: {
        enabled: boolean;
        orderUpdates: boolean;
        deliveryAlerts: boolean;
        paymentConfirmations: boolean;
        securityAlerts: boolean;
        otpMessages: boolean;
    };
    inApp: {
        enabled: boolean;
        showBadges: boolean;
        soundEnabled: boolean;
        vibrationEnabled: boolean;
        bannerStyle: 'BANNER' | 'ALERT' | 'SILENT';
    };
}
export interface IPrivacySettings {
    profileVisibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    showActivity: boolean;
    showPurchaseHistory: boolean;
    allowMessaging: boolean;
    allowFriendRequests: boolean;
    dataSharing: {
        shareWithPartners: boolean;
        shareForMarketing: boolean;
        shareForRecommendations: boolean;
        shareForAnalytics: boolean;
        sharePurchaseData: boolean;
    };
    analytics: {
        allowUsageTracking: boolean;
        allowCrashReporting: boolean;
        allowPerformanceTracking: boolean;
        allowLocationTracking: boolean;
    };
}
export interface ISecuritySettings {
    twoFactorAuth: {
        enabled: boolean;
        method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP';
        backupCodes: string[];
        lastUpdated?: Date;
    };
    biometric: {
        fingerprintEnabled: boolean;
        faceIdEnabled: boolean;
        voiceEnabled: boolean;
        availableMethods: ('FINGERPRINT' | 'FACE_ID' | 'VOICE')[];
    };
    sessionManagement: {
        autoLogoutTime: number;
        allowMultipleSessions: boolean;
        rememberMe: boolean;
    };
    loginAlerts: boolean;
}
export interface IDeliveryPreferences {
    defaultAddressId?: Types.ObjectId;
    deliveryInstructions?: string;
    deliveryTime: {
        preferred: 'ASAP' | 'SCHEDULED';
        workingDays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
    };
    contactlessDelivery: boolean;
    deliveryNotifications: boolean;
}
export interface IPaymentPreferences {
    defaultPaymentMethodId?: Types.ObjectId;
    autoPayEnabled: boolean;
    paymentPinEnabled: boolean;
    biometricPaymentEnabled: boolean;
    transactionLimits: {
        dailyLimit: number;
        weeklyLimit: number;
        monthlyLimit: number;
        singleTransactionLimit: number;
    };
}
export interface IAppPreferences {
    startupScreen: 'HOME' | 'EXPLORE' | 'LAST_VIEWED';
    defaultView: 'CARD' | 'LIST' | 'GRID';
    autoRefresh: boolean;
    offlineMode: boolean;
    dataSaver: boolean;
    highQualityImages: boolean;
    animations: boolean;
    sounds: boolean;
    hapticFeedback: boolean;
}
export interface IGeneralSettings {
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    theme: 'light' | 'dark' | 'auto';
}
export interface ICourierPreferences {
    preferredCourier: 'any' | 'delhivery' | 'bluedart' | 'ekart' | 'dtdc' | 'fedex';
    deliveryTimePreference: {
        weekdays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
        preferredTimeSlot: {
            start: string;
            end: string;
        };
        avoidWeekends: boolean;
    };
    deliveryInstructions: {
        contactlessDelivery: boolean;
        leaveAtDoor: boolean;
        signatureRequired: boolean;
        callBeforeDelivery: boolean;
        specificInstructions?: string;
    };
    alternateContact?: {
        name: string;
        phone: string;
        relation: string;
    };
    courierNotifications: {
        smsUpdates: boolean;
        emailUpdates: boolean;
        whatsappUpdates: boolean;
        callUpdates: boolean;
    };
}
export interface IUserSettings extends Document {
    user: Types.ObjectId;
    general: IGeneralSettings;
    notifications: INotificationPreferences;
    privacy: IPrivacySettings;
    security: ISecuritySettings;
    delivery: IDeliveryPreferences;
    payment: IPaymentPreferences;
    preferences: IAppPreferences;
    courier: ICourierPreferences;
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserSettings: any;
