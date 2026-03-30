// file-manager.js

import * as constants from './constants.js';
const fs = require('fs');
const path = require('path');

export function getDrillerModels() {
    path = constants.DRILLER_MODELS_PATH;

    // Look for all files ending with '.stl' in directory
    // Return list of filenames without extension

    const files = fs.readdirSync(path).filter(file => path.extname(file) === '.stl');
    const drillerModels = files.map(file => path.basename(file, '.stl'));

    return drillerModels;




    // Logic to fetch driller models from the local directory
    return ['Model A', 'Model B', 'Model C']; // Example static return for demonstration
}

export function getRefModels() {
    // Logic to fetch reference models
    return ['Ref Model 1', 'Ref Model 2']; // Example static return for demonstration
}

// Function to save logs (if needed)
export function saveLog(logData) {
    // Logic to save log data, potentially using local storage or similar
}
