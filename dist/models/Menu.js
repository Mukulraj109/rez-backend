"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Menu Model - Restaurant/Store Menu System
const mongoose_1 = __importStar(require("mongoose"));
const MenuItemSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    image: { type: String },
    category: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    preparationTime: { type: String },
    nutritionalInfo: {
        calories: { type: Number },
        protein: { type: Number },
        carbs: { type: Number },
        fat: { type: Number },
    },
    dietaryInfo: {
        isVegetarian: { type: Boolean, default: false },
        isVegan: { type: Boolean, default: false },
        isGlutenFree: { type: Boolean, default: false },
        isNutFree: { type: Boolean, default: false },
    },
    spicyLevel: { type: Number, min: 0, max: 5, default: 0 },
    allergens: [{ type: String }],
    tags: [{ type: String }],
}, { _id: true });
const MenuCategorySchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    displayOrder: { type: Number, default: 0 },
    items: [MenuItemSchema],
}, { _id: true });
const MenuSchema = new mongoose_1.Schema({
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        unique: true,
        index: true,
    },
    categories: [MenuCategorySchema],
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for better query performance
MenuSchema.index({ storeId: 1, isActive: 1 });
MenuSchema.index({ 'categories.items.category': 1 });
MenuSchema.index({ 'categories.items.name': 'text' });
// Virtual for total items count
MenuSchema.virtual('totalItems').get(function () {
    return this.categories.reduce((total, category) => total + category.items.length, 0);
});
// Method to get menu item by ID
MenuSchema.methods.getMenuItem = function (categoryId, itemId) {
    const category = this.categories.find((c) => c._id?.toString() === categoryId);
    if (!category)
        return null;
    return category.items.find((i) => i._id?.toString() === itemId) || null;
};
// Method to add menu item
MenuSchema.methods.addMenuItem = function (categoryId, itemData) {
    const category = this.categories.find((c) => c._id?.toString() === categoryId);
    if (!category)
        throw new Error('Category not found');
    category.items.push(itemData);
    return this.save();
};
// Method to update menu item
MenuSchema.methods.updateMenuItem = function (categoryId, itemId, updateData) {
    const category = this.categories.find((c) => c._id?.toString() === categoryId);
    if (!category)
        throw new Error('Category not found');
    const item = category.items.find((i) => i._id?.toString() === itemId);
    if (!item)
        throw new Error('Menu item not found');
    Object.assign(item, updateData);
    return this.save();
};
// Method to delete menu item
MenuSchema.methods.deleteMenuItem = function (categoryId, itemId) {
    const category = this.categories.find((c) => c._id?.toString() === categoryId);
    if (!category)
        throw new Error('Category not found');
    const itemIndex = category.items.findIndex((item) => item._id?.toString() === itemId);
    if (itemIndex === -1)
        throw new Error('Menu item not found');
    category.items.splice(itemIndex, 1);
    return this.save();
};
// Static method to find menu by store ID
MenuSchema.statics.findByStoreId = function (storeId) {
    return this.findOne({ storeId, isActive: true });
};
const Menu = mongoose_1.default.model('Menu', MenuSchema);
exports.default = Menu;
