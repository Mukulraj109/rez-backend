declare global {
    namespace Express {
        interface Request {
            merchantId?: string;
            merchant?: any;
        }
    }
}
declare const router: import("express-serve-static-core").Router;
export default router;
