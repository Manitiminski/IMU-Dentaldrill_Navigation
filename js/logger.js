// logger.js

let inputLogs = [];   // Array to store input logs
let resultsLogs = []; // Array to store results logs

/**
 * Logs a message to the input log.
 * @param {String} message - The message to log.
 */
export function logInput(message) {
    const timestamp = new Date().toISOString();
    inputLogs.push({ message, timestamp });
}

/**
 * Logs a message to the results log.
 * @param {String} message - The message to log.
 */
export function logResult(message) {
    const timestamp = new Date().toISOString();
    resultsLogs.push({ message, timestamp });
}

/**
 * Retrieves all input logs.
 * @returns {Array} An array of input log entries [{ message, timestamp }].
 */
export function getInputLogs() {
    return inputLogs;
}

/**
 * Retrieves all results logs.
 * @returns {Array} An array of results log entries [{ message, timestamp }].
 */
export function getResultsLogs() {
    return resultsLogs;
}

/**
 * Clears all input logs.
 */
export function clearInputLogs() {
    inputLogs = [];
}

/**
 * Clears all results logs.
 */
export function clearResultsLogs() {
    resultsLogs = [];
}
