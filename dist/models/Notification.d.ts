import mongoose, { Document, Types } from 'mongoose';
export interface INotificationData {
    orderId?: string;
    projectId?: string;
    transactionId?: string;
    storeId?: string;
    productId?: string;
    videoId?: string;
    userId?: string;
    amount?: number;
    imageUrl?: string;
    deepLink?: string;
    externalLink?: string;
    actionButton?: {
        text: string;
        action: 'navigate' | 'api_call' | 'external_link';
        target: string;
    };
    metadata?: {
        [key: string]: any;
    };
}
export interface IPushNotificationSettings {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    badge?: number;
    sound?: string;
    clickAction?: string;
    tag?: string;
    requireInteraction?: boolean;
    silent?: boolean;
    actions?: {
        action: string;
        title: string;
        icon?: string;
    }[];
}
export interface IDeliveryStatus {
    push?: {
        sent: boolean;
        sentAt?: Date;
        delivered: boolean;
        deliveredAt?: Date;
        clicked: boolean;
        clickedAt?: Date;
        failed: boolean;
        failureReason?: string;
    };
    email?: {
        sent: boolean;
        sentAt?: Date;
        delivered: boolean;
        deliveredAt?: Date;
        opened: boolean;
        openedAt?: Date;
        clicked: boolean;
        clickedAt?: Date;
        failed: boolean;
        failureReason?: string;
    };
    sms?: {
        sent: boolean;
        sentAt?: Date;
        delivered: boolean;
        deliveredAt?: Date;
        failed: boolean;
        failureReason?: string;
    };
    inApp: {
        delivered: boolean;
        deliveredAt: Date;
        read: boolean;
        readAt?: Date;
    };
}
export interface INotification extends Document {
    user: Types.ObjectId;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'promotional';
    category: 'order' | 'earning' | 'general' | 'promotional' | 'social' | 'security' | 'system' | 'reminder';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    data?: INotificationData;
    pushSettings?: IPushNotificationSettings;
    deliveryChannels: ('push' | 'email' | 'sms' | 'in_app')[];
    deliveryStatus: IDeliveryStatus;
    isRead: boolean;
    readAt?: Date;
    isArchived: boolean;
    archivedAt?: Date;
    deletedAt?: Date;
    expiresAt?: Date;
    scheduledAt?: Date;
    sentAt?: Date;
    batchId?: string;
    campaignId?: string;
    segmentId?: string;
    source: 'system' | 'admin' | 'automated' | 'campaign';
    createdBy?: Types.ObjectId;
    template?: string;
    variables?: {
        [key: string]: any;
    };
    createdAt: Date;
    updatedAt: Date;
    markAsRead(): Promise<void>;
    markAsDelivered(channel: string): Promise<void>;
    markAsClicked(channel: string): Promise<void>;
    archive(): Promise<void>;
    canBeDelivered(): boolean;
    getFormattedMessage(): string;
}
export declare const Notification: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
