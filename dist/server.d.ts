/// <reference types="node" />
export declare function createServer(): {
    app: import("express-serve-static-core").Express;
    server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
};
