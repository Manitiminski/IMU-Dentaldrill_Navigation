// _debug.js
// Contains debug functions to help with debugging the application.

// Function to log data to console with desired time interval and prefix
export function createTimedLogger(interval = 1000, prefix = '') {
    let lastLogTime = 0;
    return function (data) {
        const currentTime = Date.now();
        if (currentTime - lastLogTime >= interval) {
            console.log(`${prefix}${data}`);
            lastLogTime = currentTime;
        }
    };
}


// Function to create temporary debug functions which can be called from the console
export function createTempFunction(funcName, callback) {
    // Add function to window or global object, so it can be called from the console
    if (typeof window !== 'undefined') {
        window[funcName] = callback;
    } else if (typeof global !== 'undefined') {
        global[funcName] = callback;
    }
    console.log(`Temporary function '${funcName}' created. Call it using ${funcName}()`);
}
// Example usage:
// createTempFunction('debug_myButtonClick', () => {
//     console.log('Simulating button click...');
//     myButton.click();
//     // Your test logic here
// });



// Additional debug functions...
