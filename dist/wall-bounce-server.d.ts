/**
 * IT Infrastructure Support Tool with Wall-Bounce Analysis
 * 壁打ち分析必須システム - 複数LLMによる協調分析
 */
/// <reference types="node" />
import './config/node-deprecation-suppressor';
declare const app: import("express-serve-static-core").Express;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
export { app, server };
