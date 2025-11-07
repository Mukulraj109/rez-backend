import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare const validate: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateQuery: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateParams: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const commonSchemas: {
    objectId: () => Joi.StringSchema<string>;
    pagination: () => {
        page: Joi.NumberSchema<number>;
        limit: Joi.NumberSchema<number>;
        sort: Joi.StringSchema<string>;
        search: Joi.StringSchema<string>;
    };
    phoneNumber: Joi.StringSchema<string>;
    email: Joi.StringSchema<string>;
    otp: Joi.StringSchema<string>;
    password: Joi.StringSchema<string>;
    coordinates: Joi.ArraySchema<number[]>;
    rating: Joi.NumberSchema<number>;
    price: Joi.NumberSchema<number>;
    quantity: Joi.NumberSchema<number>;
};
export declare const authSchemas: {
    sendOTP: Joi.ObjectSchema<any>;
    verifyOTP: Joi.ObjectSchema<any>;
    refreshToken: Joi.ObjectSchema<any>;
    updateProfile: Joi.ObjectSchema<any>;
};
export declare const productSchemas: {
    getProducts: Joi.ObjectSchema<any>;
};
export declare const cartSchemas: {
    addToCart: Joi.ObjectSchema<any>;
    updateCartItem: Joi.ObjectSchema<any>;
    applyCoupon: Joi.ObjectSchema<any>;
};
export declare const orderSchemas: {
    createOrder: Joi.ObjectSchema<any>;
};
export declare const reviewSchemas: {
    createReview: Joi.ObjectSchema<any>;
    replyToReview: Joi.ObjectSchema<any>;
};
export declare const notificationSchemas: {
    markAsRead: Joi.ObjectSchema<any>;
};
export declare const wishlistSchemas: {
    createWishlist: Joi.ObjectSchema<any>;
    addToWishlist: Joi.ObjectSchema<any>;
};
export declare const videoSchemas: {
    getVideos: Joi.ObjectSchema<any>;
};
export declare const validateBody: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export { Joi };
