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

export class MockChainAdapter implements PaymentListener {
  private running: boolean = false;
  private callbacks: Array<(event: PaymentEvent) => Promise<void>> = [];
  private transactions: Map<string, { confirmations: number; event: PaymentEvent }> = new Map();
  private watchedAddresses: Set<string> = new Set();
  private confirmationCounter: Map<string, number> = new Map();

  async watchAddress(_address: string): Promise<void> {
    this.watchedAddresses.add(_address);
  }

  async getConfirmations(txHash: string): Promise<number> {
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

  onDeposit(callback: (event: PaymentEvent) => Promise<void>): void {
    this.callbacks.push(callback);
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
    this.callbacks = [];
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Simulate a deposit (call this from your mock payment endpoint)
   * This is the "dev-only HTTP endpoint" mentioned in CLAUDE.md
   */
  async simulateDeposit(payment: MockPayment): Promise<void> {
    if (!this.running) {
      throw new Error('MockChainAdapter is not running');
    }

    if (!this.watchedAddresses.has(payment.address)) {
      throw new Error(`Address ${payment.address} is not being watched`);
    }

    const event: PaymentEvent = {
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
      } catch (error) {
        console.error('Error in payment callback:', error);
      }
    }
  }

  /**
   * Simulate a chain reorg (reverse a transaction)
   */
  async simulateReorg(txHash: string): Promise<void> {
    this.transactions.delete(txHash);
    this.confirmationCounter.delete(txHash);
  }

  /**
   * Get all transactions (for testing)
   */
  getTransactions(): Array<{ hash: string; confirmations: number; event: PaymentEvent }> {
    return Array.from(this.transactions.entries()).map(([hash, data]) => ({
      hash,
      confirmations: data.confirmations,
      event: data.event,
    }));
  }

  /**
   * Clear all state (for testing)
   */
  reset(): void {
    this.transactions.clear();
    this.confirmationCounter.clear();
    this.watchedAddresses.clear();
  }
}

// Global singleton instance for testing
let globalInstance: MockChainAdapter | null = null;

export function getMockChainAdapter(): MockChainAdapter {
  if (!globalInstance) {
    globalInstance = new MockChainAdapter();
  }

  return globalInstance;
}

export function resetMockChainAdapter(): void {
  if (globalInstance) {
    globalInstance.reset();
  }

  globalInstance = null;
}
