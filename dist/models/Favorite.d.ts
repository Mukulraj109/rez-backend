import mongoose, { Document, Model } from 'mongoose';
export interface IFavorite extends Document {
    _id: string;
    user: mongoose.Types.ObjectId;
    store: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IFavoriteModel extends Model<IFavorite> {
    isStoreFavorited(userId: string, storeId: string): Promise<boolean>;
    getUserFavorites(userId: string, page?: number, limit?: number): Promise<{
        favorites: any[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalFavorites: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
}
export declare const Favorite: IFavoriteModel;
export default Favorite;
