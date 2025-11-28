import mongoose, { Document, Model } from 'mongoose';
export interface IMenuItem {
    _id?: any;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    image?: string;
    category: string;
    isAvailable: boolean;
    preparationTime?: string;
    nutritionalInfo?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
    };
    dietaryInfo?: {
        isVegetarian?: boolean;
        isVegan?: boolean;
        isGlutenFree?: boolean;
        isNutFree?: boolean;
    };
    spicyLevel?: number;
    allergens?: string[];
    tags?: string[];
}
export interface IMenuCategory {
    _id?: any;
    name: string;
    description?: string;
    displayOrder: number;
    items: IMenuItem[];
}
export interface IMenu extends Document {
    storeId: mongoose.Types.ObjectId;
    categories: IMenuCategory[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    getMenuItem(categoryId: string, itemId: string): IMenuItem | null;
    addMenuItem(categoryId: string, itemData: IMenuItem): Promise<this>;
    updateMenuItem(categoryId: string, itemId: string, updateData: Partial<IMenuItem>): Promise<this>;
    deleteMenuItem(categoryId: string, itemId: string): Promise<this>;
}
export interface IMenuModel extends Model<IMenu> {
    findByStoreId(storeId: string): Promise<IMenu | null>;
}
declare const Menu: IMenuModel;
export default Menu;
