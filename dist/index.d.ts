import express from 'express';
declare class TechSapoServer {
    private app;
    private server;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    private gracefulShutdown;
    start(): Promise<void>;
    getApp(): express.Application;
}
export declare function createServer(): {
    app: import("express-serve-static-core").Express;
    server: {
        close: (callback?: () => void) => void;
    };
};
export default TechSapoServer;
