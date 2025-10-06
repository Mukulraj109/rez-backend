import { Server as SocketIOServer } from 'socket.io';
import { RealTimeService } from './merchantservices/RealTimeService';
declare const app: import("express-serve-static-core").Express;
declare global {
    var io: SocketIOServer;
    var realTimeService: RealTimeService;
}
declare function startServer(): Promise<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>>;
export { app, startServer };
