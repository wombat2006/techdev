import express from 'express';
declare class TechSapoServer {
    private app;
    private server;
    private prometheusRegister;
    constructor();
    private initializeMiddleware;
    /**
     * 🏥 LLMヘルスチェック - 各プロバイダーの疎通状況
     */
    private setupHealthEndpoint;
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
