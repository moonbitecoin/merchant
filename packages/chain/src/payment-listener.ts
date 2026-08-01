/**
 * PaymentListener interface - abstraction over blockchain implementations
 * This allows swapping different blockchain adapters (Bitcoin, Ethereum, etc.)
 * without changing the business logic
 */

export interface PaymentEvent {
  transactionHash: string;
  fromAddress: string;
  toAddress: string;
  amount: bigint;
  blockHeight: number;
  timestamp: number;
}

export interface PaymentListener {
  /**
   * Watch a deposit address for incoming payments
   * Should set up listener/subscription on first call per address
   */
  watchAddress(address: string): Promise<void>;

  /**
   * Get number of confirmations for a transaction
   * Returns 0 if not found, negative if reverted (chain reorg)
   */
  getConfirmations(txHash: string): Promise<number>;

  /**
   * Called when payment is detected
   * Listener will call this callback with payment details
   * Implementation must be async-safe
   */
  onDeposit(callback: (event: PaymentEvent) => Promise<void>): void;

  /**
   * Start listening for payments
   */
  start(): Promise<void>;

  /**
   * Stop listening
   */
  stop(): Promise<void>;

  /**
   * Check if listener is running
   */
  isRunning(): boolean;
}
