import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare const validate: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => any;
export declare const validateQuery: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => any;
export declare const validateParams: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => any;
export declare const commonSchemas: {
    objectId: () => any;
    pagination: () => {
        page: any;
        limit: any;
        sort: any;
        search: any;
    };
    phoneNumber: any;
    email: any;
    otp: any;
    password: any;
    coordinates: any;
    rating: any;
    price: any;
    quantity: any;
};
export declare const authSchemas: {
    sendOTP: any;
    verifyOTP: any;
    refreshToken: any;
    updateProfile: any;
};
export declare const productSchemas: {
    getProducts: any;
};
export declare const cartSchemas: {
    addToCart: any;
    updateCartItem: any;
    applyCoupon: any;
};
export declare const orderSchemas: {
    createOrder: any;
};
export declare const reviewSchemas: {
    createReview: any;
    replyToReview: any;
};
export declare const notificationSchemas: {
    markAsRead: any;
};
export declare const wishlistSchemas: {
    createWishlist: any;
    addToWishlist: any;
};
export declare const videoSchemas: {
    getVideos: any;
};
export declare const validateBody: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => any;
export { Joi };
