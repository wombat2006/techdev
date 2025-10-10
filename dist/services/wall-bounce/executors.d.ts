/**
 * Wall-Bounce Executors
 * 実行モード管理（Parallel/Sequential/Deep Sequential）
 */
import type { IWallBounceExecutor, IWallBounceProviderManager, IWallBounceInvoker, IWallBouncePromptBuilder, IWallBounceTaskAnalyzer, ExecuteOptions, WallBounceResult } from './types';
export declare class WallBounceExecutor implements IWallBounceExecutor {
    private providerManager;
    private invoker;
    private promptBuilder;
    private taskAnalyzer;
    constructor(providerManager: IWallBounceProviderManager, invoker: IWallBounceInvoker, promptBuilder: IWallBouncePromptBuilder, taskAnalyzer: IWallBounceTaskAnalyzer);
    /**
     * Get provider tier from configuration
     */
    private getProviderTier;
    /**
     * Wall-Bounceを実行（メインエントリーポイント）
     */
    execute(prompt: string, options: ExecuteOptions): Promise<WallBounceResult>;
    /**
     * Parallelモード実行
     */
    private executeParallel;
    /**
     * Sequentialモード実行（簡易版）
     */
    private executeSequential;
    /**
     * Deep Sequentialモード実行（3-6ラウンド Wall-Bounce）
     */
    private executeDeepSequential;
}
