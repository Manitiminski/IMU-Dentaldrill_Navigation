/**
 * Throttle function
 * 
 * Ceates a throttled version of the provided function.
 * The throttled function will only execute at most once per every `delay` milliseconds,
 * regardless of how many times it is called.
 * 
 * Can be used to limit the rate at which a function can fire, which is useful for 
 * performance optimization, especially with event handlers that might fire rapidly
 * (e.g., scroll events, data streaming, etc.).
 * 
 * @param {Function} func - The function to throttle
 * @param {number} delay - The number of milliseconds to delay between function calls
 * @returns {Function} A new, throttled function
 * 
 * @example
 * // Create a throttled version of a function
 * const throttledHandler = throttle(function (data) {
 *     const a, b = data;
 *     const c = a + b;
 *     console.log('Calculated Result:', c);
 * }, 100);
 * 
 * // Use the throttled function
 * element.addEventListener('data_received', function(event) {
 *   throttledHandler(event.data);
 * });
 */
export function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = new Date().getTime();
        if (now - lastCall < delay) return;
        lastCall = now;
        return func.apply(this, args);
    };
}