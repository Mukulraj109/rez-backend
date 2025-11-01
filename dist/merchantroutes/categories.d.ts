declare global {
    namespace Express {
        interface Request {
            merchantId?: string;
            merchant?: any;
        }
    }
}
declare const router: any;
export default router;
