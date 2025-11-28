import mongoose, { Document, Types } from 'mongoose';
export declare enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    FILE = "FILE",
    LOCATION = "LOCATION",
    PRODUCT = "PRODUCT",
    ORDER = "ORDER",
    SYSTEM = "SYSTEM"
}
export declare enum MessageStatus {
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    READ = "READ",
    FAILED = "FAILED"
}
export declare enum SenderType {
    CUSTOMER = "CUSTOMER",
    STORE = "STORE",
    SYSTEM = "SYSTEM"
}
export interface IMessageMethods {
    markAsDelivered(): Promise<IMessage>;
    markAsRead(): Promise<IMessage>;
}
export interface IMessageModel extends mongoose.Model<IMessage, {}, IMessageMethods> {
    getUnreadCount(conversationId: Types.ObjectId, userId: Types.ObjectId): Promise<number>;
    markConversationAsRead(conversationId: Types.ObjectId, userId: Types.ObjectId): Promise<any>;
}
export interface IMessage extends Document, IMessageMethods {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    senderType: SenderType;
    type: MessageType;
    content: string;
    status: MessageStatus;
    attachments?: {
        url: string;
        type: string;
        name?: string;
        size?: number;
        thumbnail?: string;
    }[];
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    product?: {
        id: Types.ObjectId;
        name: string;
        price: number;
        image?: string;
    };
    order?: {
        id: Types.ObjectId;
        orderNumber: string;
    };
    metadata?: Record<string, any>;
    sentAt: Date;
    deliveredAt?: Date;
    readAt?: Date;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Message: IMessageModel;
