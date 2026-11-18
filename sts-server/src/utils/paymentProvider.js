import crypto from 'crypto';

// Simulated licensed third-party payment provider (A11/A12).
// STS only records the outcome; card/bank details never touch this system.
// Strategy pattern (ODD 5.2.1): the clearing strategy is selected by payment method.
const strategies = {
  card: { name: 'CardNet MY', successRate: 0.95 },
  fpx: { name: 'FPX Gateway', successRate: 0.92 },
  duitnow: { name: 'DuitNow QR', successRate: 0.98 },
};

export const processPayment = ({ amount, method = 'card' }) => {
  const strategy = strategies[method] || strategies.card;
  const transactionRef = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  // Deterministic-ish simulation: ~5% failure so the failed path is exercised
  const successful = crypto.randomInt(100) < strategy.successRate * 100;
  return {
    successful,
    transactionRef,
    provider: strategy.name,
    processedAt: new Date(),
  };
};

export const processRefund = ({ amount, method = 'card' }) => {
  const transactionRef = `RFD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  return { successful: true, transactionRef, processedAt: new Date() };
};
