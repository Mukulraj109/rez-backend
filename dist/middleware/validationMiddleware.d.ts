import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
/**
 * Generic validation middleware factory
 * Creates middleware to validate request data against a Joi schema
 *
 * @param schema - Joi validation schema
 * @param source - Where to validate from ('body', 'query', 'params', or 'all')
 * @returns Express middleware function
 */
export declare const validate: (schema: Joi.ObjectSchema, source?: "body" | "query" | "params" | "all") => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate request body
 */
export declare const validateBody: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate query parameters
 */
export declare const validateQuery: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate URL parameters
 */
export declare const validateParams: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate multiple sources at once
 */
export declare const validateAll: (schemas: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
}) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
declare const _default: {
    validate: (schema: Joi.ObjectSchema, source?: "body" | "query" | "params" | "all") => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateBody: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateQuery: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateParams: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateAll: (schemas: {
        body?: Joi.ObjectSchema;
        query?: Joi.ObjectSchema;
        params?: Joi.ObjectSchema;
    }) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
};
export default _default;
