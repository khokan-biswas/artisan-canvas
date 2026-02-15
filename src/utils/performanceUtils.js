/**
 * Performance Optimization Utilities
 */

/**
 * Debounce function to limit API calls (e.g., for Search bars)
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 */
export const debounce = (func, delay = 500) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function to limit function calls (e.g., for Scroll events)
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Formats a raw number into a readable currency string
 * Usage: formatPrice(1500) -> "$1,500.00"
 */
export const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

/**
 * Generates a random session ID (useful for guest carts if needed)
 */
export const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};