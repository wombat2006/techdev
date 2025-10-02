export declare const config: {
    server: {
        port: number;
        nodeEnv: string;
    };
    huggingface: {
        apiKey: string;
        baseUrl: string;
        timeout: number;
        retryAttempts: number;
    };
    openrouter: {
        apiKey: string;
        baseUrl: string;
    };
    redis: {
        url: string;
        token: string;
    };
    database: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    };
    logging: {
        level: string;
        filePath: string;
    };
    costManagement: {
        monthlyBudgetLimit: number;
        alertThreshold: number;
    };
    embeddingModels: {
        model1: string;
        model2: string;
        model3: string;
        model4: string;
        model5: string;
    };
    wallBounce: {
        enableTimeout: boolean;
        timeoutMs: number;
        minProviders: number;
    };
};
export declare const validateEnvironment: () => void;
export default config;
