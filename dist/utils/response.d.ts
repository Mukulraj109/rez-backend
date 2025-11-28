import { Response } from 'express';
export interface APIResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    meta?: {
        pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
        timestamp?: string;
        version?: string;
    };
    errors?: Array<{
        field?: string;
        message: string;
    }>;
}
export declare const sendSuccess: <T>(res: Response, data?: T, message?: string, statusCode?: number, meta?: APIResponse["meta"]) => Response;
export declare const sendError: (res: Response, message?: string, statusCode?: number, errors?: Array<{
    field?: string;
    message: string;
}> | any) => Response;
export declare const sendPaginated: <T>(res: Response, data: T[], page: number, limit: number, total: number, message?: string) => Response;
export declare const sendCreated: <T>(res: Response, data: T, message?: string) => Response;
export declare const sendNoContent: (res: Response) => Response;
export declare const sendNotFound: (res: Response, message?: string) => Response;
export declare const sendBadRequest: (res: Response, message?: string) => Response;
export declare const sendValidationError: (res: Response, errors: Array<{
    field: string;
    message: string;
}>, message?: string) => Response;
export declare const sendUnauthorized: (res: Response, message?: string) => Response;
export declare const sendForbidden: (res: Response, message?: string) => Response;
export declare const sendConflict: (res: Response, message?: string) => Response;
export declare const sendTooManyRequests: (res: Response, message?: string) => Response;
export declare const sendInternalError: (res: Response, message?: string) => Response;
export declare const sendServiceUnavailable: (res: Response, message?: string) => Response;
