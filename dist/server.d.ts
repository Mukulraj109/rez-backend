import './workers/exportWorker';
declare const app: import("express-serve-static-core").Express;
declare global {
    var io: any;
    var realTimeService: any;
}
declare function startServer(): Promise<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>>;
export { app, startServer };
