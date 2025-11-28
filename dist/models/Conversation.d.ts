import mongoose, { Document, Types } from 'mongoose';
export declare enum ConversationStatus {
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED",
    BLOCKED = "BLOCKED"
}
export interface IBusinessHours {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    timezone?: string;
}
export interface IConversationMethods {
    updateLastMessage(message: {
        content: string;
        senderId: Types.ObjectId;
        senderType: string;
        timestamp: Date;
        type: string;
    }): Promise<IConversation>;
    markAsRead(): Promise<IConversation>;
    archive(): Promise<IConversation>;
    unarchive(): Promise<IConversation>;
    block(): Promise<IConversation>;
    unblock(): Promise<IConversation>;
}
export interface IConversationModel extends mongoose.Model<IConversation, {}, IConversationMethods> {
    getOrCreate(customerId: Types.ObjectId, storeId: Types.ObjectId, storeData: {
        storeName: string;
        storeImage?: string;
    }, customerData: {
        customerName: string;
        customerImage?: string;
    }): Promise<IConversation>;
    getTotalUnreadCount(customerId: Types.ObjectId): Promise<number>;
    getConversationsSummary(customerId: Types.ObjectId, status?: ConversationStatus): Promise<{
        totalConversations: number;
        unreadCount: number;
        activeConversations: number;
    }>;
}
export interface IConversation extends Document, IConversationMethods {
    customerId: Types.ObjectId;
    storeId: Types.ObjectId;
    storeName: string;
    storeImage?: string;
    customerName: string;
    customerImage?: string;
    lastMessage?: {
        content: string;
        senderId: Types.ObjectId;
        senderType: string;
        timestamp: Date;
        type: string;
    };
    status: ConversationStatus;
    unreadCount: number;
    totalMessages: number;
    businessHours?: IBusinessHours;
    metadata?: Record<string, any>;
    archivedAt?: Date;
    blockedAt?: Date;
    lastActivityAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Conversation: IConversationModel;
