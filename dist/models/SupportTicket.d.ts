import { Document, Types } from 'mongoose';
export interface ITicketMessage {
    sender: Types.ObjectId;
    senderType: 'user' | 'agent' | 'system';
    message: string;
    attachments: string[];
    timestamp: Date;
    isRead: boolean;
}
export interface IRelatedEntity {
    type: 'order' | 'product' | 'transaction' | 'none';
    id?: Types.ObjectId;
}
export interface ITicketRating {
    score: number;
    comment: string;
    ratedAt: Date;
}
export interface ISupportTicket extends Document {
    ticketNumber: string;
    user: Types.ObjectId;
    subject: string;
    category: 'order' | 'payment' | 'product' | 'account' | 'technical' | 'delivery' | 'refund' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
    relatedEntity: IRelatedEntity;
    messages: ITicketMessage[];
    assignedTo?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    closedAt?: Date;
    resolution?: string;
    rating?: ITicketRating;
    attachments: string[];
    tags: string[];
    internalNotes: string[];
    responseTime?: number;
    resolutionTime?: number;
}
export declare const SupportTicket: any;
