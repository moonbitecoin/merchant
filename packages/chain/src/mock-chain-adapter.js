/**
 * MockChainAdapter - simulates blockchain for development/testing
 * Provides an HTTP endpoint to inject mock payments
 */
export class MockChainAdapter {
    constructor() {
        Object.defineProperty(this, "running", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "callbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "transactions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "watchedAddresses", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "confirmationCounter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    async watchAddress(_address) {
        this.watchedAddresses.add(_address);
    }
    async getConfirmations(txHash) {
        const tx = this.transactions.get(txHash);
        if (!tx) {
            return 0;
        }
        // Simulate block confirmations: increment every call
        const current = this.confirmationCounter.get(txHash) ?? 0;
        const next = Math.min(current + 1, 10); // Max 10 confirmations
        this.confirmationCounter.set(txHash, next);
        return next;
    }
    onDeposit(callback) {
        this.callbacks.push(callback);
    }
    async start() {
        this.running = true;
    }
    async stop() {
        this.running = false;
        this.callbacks = [];
    }
    isRunning() {
        return this.running;
    }
    /**
     * Simulate a deposit (call this from your mock payment endpoint)
     * This is the "dev-only HTTP endpoint" mentioned in CLAUDE.md
     */
    async simulateDeposit(payment) {
        if (!this.running) {
            throw new Error('MockChainAdapter is not running');
        }
        if (!this.watchedAddresses.has(payment.address)) {
            throw new Error(`Address ${payment.address} is not being watched`);
        }
        const event = {
            transactionHash: payment.txHash,
            fromAddress: payment.fromAddress ?? 'mock_sender',
            toAddress: payment.address,
            amount: payment.amount,
            blockHeight: Math.floor(Math.random() * 1000000), // Random block height
            timestamp: Math.floor(Date.now() / 1000),
        };
        // Store the transaction
        this.transactions.set(payment.txHash, {
            confirmations: 0,
            event,
        });
        this.confirmationCounter.set(payment.txHash, 0);
        // Call all registered callbacks
        for (const callback of this.callbacks) {
            try {
                await callback(event);
            }
            catch (error) {
                console.error('Error in payment callback:', error);
            }
        }
    }
    /**
     * Simulate a chain reorg (reverse a transaction)
     */
    async simulateReorg(txHash) {
        this.transactions.delete(txHash);
        this.confirmationCounter.delete(txHash);
    }
    /**
     * Get all transactions (for testing)
     */
    getTransactions() {
        return Array.from(this.transactions.entries()).map(([hash, data]) => ({
            hash,
            confirmations: data.confirmations,
            event: data.event,
        }));
    }
    /**
     * Clear all state (for testing)
     */
    reset() {
        this.transactions.clear();
        this.confirmationCounter.clear();
        this.watchedAddresses.clear();
    }
}
// Global singleton instance for testing
let globalInstance = null;
export function getMockChainAdapter() {
    if (!globalInstance) {
        globalInstance = new MockChainAdapter();
    }
    return globalInstance;
}
export function resetMockChainAdapter() {
    if (globalInstance) {
        globalInstance.reset();
    }
    globalInstance = null;
}
//# sourceMappingURL=mock-chain-adapter.js.map