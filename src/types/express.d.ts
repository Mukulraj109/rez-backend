declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
  }
  
  // Global services
  var CrossAppSyncService: any;
  var io: any;
  var realTimeService: any;
}

export {};
