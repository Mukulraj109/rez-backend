declare const app: any;
declare global {
    var io: any;
    var realTimeService: any;
}
declare function startServer(): Promise<any>;
export { app, startServer };
