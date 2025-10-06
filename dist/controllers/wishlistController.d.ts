import { Request, Response } from 'express';
export declare const getUserWishlists: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const createWishlist: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getWishlistById: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const addToWishlist: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const removeFromWishlist: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const updateWishlistItem: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteWishlist: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPublicWishlists: (req: Request, res: Response, next: import("express").NextFunction) => void;
