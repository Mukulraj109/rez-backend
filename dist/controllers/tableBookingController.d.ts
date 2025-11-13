import { Request, Response } from 'express';
export declare const createTableBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUserTableBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTableBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStoreTableBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cancelTableBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const checkAvailability: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
