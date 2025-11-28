import mongoose, { Document, Types } from 'mongoose';
/**
 * Store Gallery Interface
 * Represents individual gallery items (images/videos) for stores
 */
export interface IStoreGallery extends Document {
    storeId: Types.ObjectId;
    merchantId: Types.ObjectId;
    url: string;
    thumbnail?: string;
    publicId: string;
    type: 'image' | 'video';
    category: string;
    title?: string;
    description?: string;
    tags?: string[];
    order: number;
    isVisible: boolean;
    isCover: boolean;
    views: number;
    likes: number;
    shares: number;
    viewedBy: Types.ObjectId[];
    uploadedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
declare const StoreGallery: mongoose.Model<IStoreGallery, {}, {}, {}, mongoose.Document<unknown, {}, IStoreGallery, {}, {}> & IStoreGallery & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default StoreGallery;
