// main.js
// Main entry point for the application
// This file is responsible for instantiating all modules and wiring them together

// ARCHITECTURE //
// Approach used for module communication in this project:
// 1. Loose Coupling: Modules do not directly call each other's functions
// 2. Centralized Event Handling: Modules emit events that are handled by the main module
// 3. Event-Driven Architecture: Modules are event-driven and do not depend on each other


//===================================
// IMPORTS
//===================================

// EXTERNAL LIBRARIES //
// - None

// PROJECT MODULES //
import * as UI from './ui-handler.js';
import * as Microcontroller from './microcontroller.js';
import * as Logger from './logger.js';
import * as Calculations from './calculations.js';
import * as ThreeView from './three-view.js';
// import * as FileManager from './file-manager.js';
import * as AccuracyTarget from './accuracy-target-view.js';


import * as Debug from './utils/_debug.js';


//===================================
// GLOBAL CONSTANTS & VARIABLES
//===================================
// Debugger
const debugLog_mc_eventData = Debug.createTimedLogger(1000, '[MC EVENT DATA]: ');
const debugLog_calc_eventData = Debug.createTimedLogger(500, '[CALC RESULTS]: ');



//===================================
// INITIALIZATION
//===================================
function init() {
    UI.init(handleEvents_UI);
    Microcontroller.init(handleEvents_microcontroller);
    // Logger.init();
    Calculations.init(handleEvents_calc);

    const myCanvas = UI.getThreeViewCanvas();
    ThreeView.init(myCanvas);

    const targetViewContainer = UI.getTargetViewContainer();
    AccuracyTarget.init(targetViewContainer);
}


//===================================
// UI - EVENT HANDLERS AND METHODS
//===================================
// UI Event Handler
function handleEvents_UI(event, data) {
    switch (event) {
        case 'CONNECT_CLICKED':
            const baudRate = UI.getBaudRate();
            Microcontroller.connect(baudRate);
            break;
        case 'DISCONNECT_CLICKED':
            Microcontroller.disconnect();
            break;
        case 'ENV_SETTINGS_CHANGED':
            // Example data object
            /*         {
                        "group": "driller-model",
                        "describes": "position",
                        "data": {
                          "x": 11,
                          "y": 0,
                          "z": 0
                        }
                      } */

            handleEnvSettingsChange(data.group, data.describes, data.data);
            break;
        // ... other UI events
        case 'CALIBRATE_CLICKED':
            // Start calibration
            Calculations.startCalibration(data);
            break;
    }
}

// Function to handle changes in settings
function handleEnvSettingsChange(group, describes, data) {
    // Group represents something like 'driller-model', 'ref-model', 'target' or 'background'
    // Describes represents what kind of data is being changed, e.g. 'position', 'orientation', 'color', 'shape'
    // Since it does not depend on the group but more on the type of data (=describes), we switch on describes

    // Translate the group names from UI to the names used in the ThreeView module
    const groupNamesMapping = {
        'driller-model': 'driller',
        'ref-model': 'reference',
        'target': 'target',
        'background': 'background'
    };
    group = groupNamesMapping[group];

    switch (describes) {
        case 'position': {
            // Can currently only happen for ref-model (later maybe also for driller-model)

            // Data must be must be in the form of {x: number, y: number, z: number}

            // updateModel(
            // Trigger update in ThreeView module
            ThreeView.updateModel_pose(group, 'position', data);
            break;
        }
        case 'orientation': {
            let newOrientation = data;
            // Can currently only happen for target vector (later maybe also for ref-model)
            // Most important if target changes - Affects calculations and thus the results
            if (group === 'target') {
                // Data expected to be spherical coordinates of {inclination: number, azimuth: number}
                Calculations.updateOrientation('target_sphere', newOrientation);
            }
            else {
                console.warn('Orientation change for group not yet implemented: ', group);
            }
            break;
        }
        case 'color': {
            // Update the color of the group
            ThreeView.updateModel_appearance(group, 'color', data);
            break;
        }
        case 'shape': {
            // Update the shape for a model
            ThreeView.updateModel_appearance(group, 'shape', data);
            break;
        }
        default:
            console.warn('Unknown setting change: ', group, describes, data);
            break;
    }
}


// Function to update dropdowns
// // Currently not needed and not working!!!
function updateDropdowns() {
    const drillerModels = FileManager.getDrillerModels();
    const refModels = FileManager.getRefModels();

    UI.populateSelectDropdown(document.getElementById('driller-model'), drillerModels);
    UI.populateSelectDropdown(document.getElementById('ref-model'), refModels);
}


//===================================
// MICROCONTROLLER - EVENT HANDLERS AND METHODS
//===================================
// Microcontroller Event Handler
function handleEvents_microcontroller(event, data) {
    switch (event) {
        case 'CONNECTED':
            UI.updateConnectionStatus(true);
            console.log('Connected to microcontroller');
            // Logger.logInput('Connected to microcontroller');
            break;

        case 'DISCONNECTED':
            UI.updateConnectionStatus(false);
            UI.updateCalibrationStatus(null);
            console.log('Disconnected from microcontroller');
            //Logger.logInput('Disconnected from microcontroller');
            break;

        case 'DATA_RECEIVED_QUATERNION':
            // Currently only one microcontroller is used - only driller sensor
            // Microcontroller for world sensor / world sensor quaternion is not yet implemented.
            // TODO: Implement world sensor quaternion, and update logic to allow two microcontrollers

            // For testing - World sensor quaternion always default
            //const quat_worldSensor = { x: 0, y: 0, z: 0, w: 1 }; // Placeholder for now
            //Calculations.updateOrientation('world_sensor', quat_worldSensor);

            // Inform calculations module about new drill sensor quaternion
            const quat_drillerSensor = data;
            Calculations.updateOrientation('driller_sensor', quat_drillerSensor);
            break;

        case 'DATA_RECEIVED_CALIBRATION':
            UI.updateCalibrationStatus(data);
            break;

        case 'DATA_RECEIVED_UNKNOWN':
            console.log('Unknown data received: ', data);
            break;

        case 'CONNECTION_ERROR':
        case 'READ_ERROR':
            console.log(`Error: ${data}`);
            // UI.showError(data);
            // Logger.logInput(`Error: ${data}`);
            break;
    }
}


//===================================
// LOGGER - EVENT HANDLERS AND METHODS
//===================================

// Logger Event Handler
//... other logger events
//


//===================================
// CALCULATIONS - EVENT HANDLERS AND METHODS
//===================================
// Calculations Event Handler
function handleEvents_calc(event, data) {
    switch (event) {
        case 'DRILLER_TO_WORLD_QUATERNION':
            // Update the 3D model rotation
            ThreeView.updateModel_pose('driller', 'orientation', data);

            // Maybe update logger
            // TODO: Logger.logDrillerQuaternion(data);
            break;

        case 'TARGET_SPHERICAL_TO_VECTOR':
            // Update the target vector in the 3D view
            ThreeView.updateModel_pose('target', 'orientation', data);
            break;

        case 'ACCURACY_DATA':
            // The long calculations for accuracy are done
            // Update UI with the results
            UI.updateAccuracyResults(data);

            // Update accuracy target view
            AccuracyTarget.update(data, 'world');

            //console.log('Accuracy percentage: ', data.accuracy);

            // Update logger
            // TODO: Logger.logAccuracyResults(data);
            break;

        case 'CALIBRATION_FINISHED':
            // Calibration finished
            // Inform UI and provide offset data
            // TODO: Update UI with calibration data

            // Update logger
            // TODO: Logger.logCalibrationResults(data);
            break;

        default:
            console.warn('Unknown calculation event: ', event, data);
            break;
    }
}


//===================================
// THREE VIEW - EVENT HANDLERS AND METHODS
//===================================

// Three View Event Handler
//... No events coming from Three View module


//===================================
// FILE MANAGER - EVENT HANDLERS AND METHODS
//===================================

// File Manager Event Handler
//... other file manager events


//===================================
// ACCURACY TARGET VIEW - EVENT HANDLERS AND METHODS
//===================================

// Target View Event Handler
//... No events coming from Target View module



//===================================
//===================================
//===================================


//===================================
// APP INITIALIZATION
//===================================

document.addEventListener('DOMContentLoaded', init);

