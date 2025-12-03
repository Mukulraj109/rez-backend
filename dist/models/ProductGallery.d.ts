import mongoose, { Document, Types } from 'mongoose';
/**
 * Product Gallery Interface
 * Represents individual gallery items (images) for products
 */
export interface IProductGallery extends Document {
    productId: Types.ObjectId;
    merchantId: Types.ObjectId;
    url: string;
    publicId: string;
    type: 'image';
    category: string;
    title?: string;
    description?: string;
    tags?: string[];
    order: number;
    isVisible: boolean;
    isCover: boolean;
    variantId?: string;
    views: number;
    likes: number;
    shares: number;
    viewedBy: Types.ObjectId[];
    uploadedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
declare const ProductGallery: mongoose.Model<IProductGallery, {}, {}, {}, mongoose.Document<unknown, {}, IProductGallery, {}, {}> & IProductGallery & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default ProductGallery;
