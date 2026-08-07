/**
 * MockChainAdapter - simulates blockchain for development/testing
 * Provides an HTTP endpoint to inject mock payments
 */
import { PaymentListener, PaymentEvent } from './payment-listener.js';
export interface MockPayment {
    address: string;
    amount: bigint;
    txHash: string;
    fromAddress?: string;
}
export declare class MockChainAdapter implements PaymentListener {
    private running;
    private callbacks;
    private transactions;
    private watchedAddresses;
    private confirmationCounter;
    watchAddress(_address: string): Promise<void>;
    getConfirmations(txHash: string): Promise<number>;
    onDeposit(callback: (event: PaymentEvent) => Promise<void>): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    /**
     * Simulate a deposit (call this from your mock payment endpoint)
     * This is the "dev-only HTTP endpoint" mentioned in CLAUDE.md
     */
    simulateDeposit(payment: MockPayment): Promise<void>;
    /**
     * Simulate a chain reorg (reverse a transaction)
     */
    simulateReorg(txHash: string): Promise<void>;
    /**
     * Get all transactions (for testing)
     */
    getTransactions(): Array<{
        hash: string;
        confirmations: number;
        event: PaymentEvent;
    }>;
    /**
     * Clear all state (for testing)
     */
    reset(): void;
}
export declare function getMockChainAdapter(): MockChainAdapter;
export declare function resetMockChainAdapter(): void;
//# sourceMappingURL=mock-chain-adapter.d.ts.map