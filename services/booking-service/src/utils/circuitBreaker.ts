import CircuitBreaker from 'opossum';

export interface BreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
}

export function createCircuitBreaker(requestFunction: (...args: any[]) => Promise<any>, options?: BreakerOptions) {
  const breakerOptions = {
    timeout: options?.timeout || 3000, // 3 seconds timeout
    errorThresholdPercentage: options?.errorThresholdPercentage || 50, // 50% failure rate triggers circuit
    resetTimeout: options?.resetTimeout || 10000, // 10 seconds before trying again
  };

  const breaker = new CircuitBreaker(requestFunction, breakerOptions);

  breaker.on('open', () => console.warn(`[CircuitBreaker] 🔴 OPEN - Service failing.`));
  breaker.on('halfOpen', () => console.warn(`[CircuitBreaker] 🟡 HALF-OPEN - Testing service recovery.`));
  breaker.on('close', () => console.log(`[CircuitBreaker] 🟢 CLOSED - Service healthy.`));
  
  return breaker;
}
