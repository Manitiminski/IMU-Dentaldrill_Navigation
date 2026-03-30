// ui-handler.js
// Handles UI interactions and update UI elements based on user input and application state.
// Triggers events and passes data to the main module.

//===================================
// IMPORTS
//===================================

// EXTERNAL LIBRARIES //
// - None

// PROJECT MODULES //
import * as Constants from './constants.js';
import * as Debug from './utils/_debug.js';


//===================================
// GLOBAL CONSTANTS & VARIABLES
//===================================

// Event handler function to communicate with the main module - Provided as parameter in init()
let eventHandler;

let inputLogElement, resultsLogElement;
let inputLogAutoscroll, resultsLogAutoscroll;
let inputLogTimestamp, resultsLogTimestamp;
let inputLogClearButton, resultsLogClearButton;


// DOM ELEMENTS //

// Overall structural elements
let accordions

// More detailed elements of important structures - Might redefine this at some point
let connectButton, baudRateSelect, angleTypeSelect;
let inputLog, inputLog_autoscrollOption, inputLog_timestampOption, inputLog_clearButton;
let resultsLog, resultsLog_autoscrollOption, resultsLog_timestampOption, resultsLog_clearButton;

let calibrationButtons = {};

// Section - Environment Settings
// Stores all the input elements for the environment settings, so for shapes, colors, positions and orientations
let environment_section;
let environment_settingsInputs = {};

let drillerModelShapeSelect, refModelShapeSelect;
let sliders, sliderInputs;

let threeViewCanvas;
let errorMessage_webgl;
//let logTabButtons, logPanels;
let results_pitchToWorld, results_rollToWorld;
let results_pitchToRef, results_rollToRef, results_accuracy;
let targetViewContainer;
let calibrationLabels = {};


// Microcontroller Caption and Color Mapping
const calibrationMap = {
    0: { caption: "Uncalibrated", color: "#CC0000" },
    1: { caption: "Partially Calibrated", color: "#FF6600" },
    2: { caption: "Mostly Calibrated", color: "#FFCC00" },
    3: { caption: "Fully Calibrated", color: "#009900" }
};



//===================================
// INITIALIZATION
//===================================
export function init(handler) {
    eventHandler = handler;

    // Initialize DOM elements
    connectButton = document.getElementById('btn-connect');
    baudRateSelect = document.getElementById('baudrate');
    angleTypeSelect = document.getElementById('angle-type');

    drillerModelShapeSelect = document.getElementById('driller-model-shape');
    refModelShapeSelect = document.getElementById('ref-model-shape');

    results_pitchToWorld = document.getElementById('pitch-to-world');
    results_rollToWorld = document.getElementById('roll-to-world');
    results_pitchToRef = document.getElementById('pitch-to-ref');
    results_rollToRef = document.getElementById('roll-to-ref');
    results_accuracy = document.getElementById('accuracy');

    targetViewContainer = document.getElementById('target-svg-container');

    inputLog = document.getElementById('input-log');
    inputLog_autoscrollOption = document.getElementById('input-log__autoscroll');
    inputLog_timestampOption = document.getElementById('input-log__timestamp');
    inputLog_clearButton = document.getElementById('input-log__clear');

    calibrationButtons = {
        quick: document.getElementById('btn-calibr-quick'),
        long: document.getElementById('btn-calibr-long'),
        zRotation: document.getElementById('btn-calibr-zrotation')
    }

    resultsLog = document.getElementById('results-log');
    resultsLog_autoscrollOption = document.getElementById('results-log__autoscroll');
    resultsLog_timestampOption = document.getElementById('results-log__timestamp');
    resultsLog_clearButton = document.getElementById('results-log__clear');

    accordions = document.querySelectorAll('.accordion-section');
    environment_section = document.getElementById('env-settings-section');

    sliders = document.querySelectorAll('.slider');
    sliderInputs = document.querySelectorAll('.slider-input');

    //logTabButtons = document.querySelectorAll('.tab-button');
    //logPanels = document.querySelectorAll('.log-panel');

    calibrationLabels = {
        system: document.getElementById('calValue_system'),
        gyro: document.getElementById('calValue_gyro'),
        accel: document.getElementById('calValue_accelometer'),
        mag: document.getElementById('calValue_magnetometer')
    }



    threeViewCanvas = document.getElementById('canvas');
    // Error message element within the animation container, to be shown if WebGL is not supported
    errorMessage_webgl = document.querySelector('.animation-container .error-message');


    // Get lists for select dropdowns
    let baudRates = Constants.BAUDRATES;
    let angleTypes = Constants.ANGLE_TYPES;

    let drillerModelShapes = Constants.DRILLER_SHAPES;
    let refModelShapes = Constants.REFERENCE_SHAPES;

    // Populate select dropdowns
    populateSelectDropdown(baudRateSelect, baudRates);
    populateSelectDropdown(angleTypeSelect, angleTypes);
    populateSelectDropdown(drillerModelShapeSelect, drillerModelShapes);
    populateSelectDropdown(refModelShapeSelect, refModelShapes, true);

    // Set up section related UI functionalities
    setupAccordionHandlers();
    //setupLogTabSwitching();


    // Set up other UI functionalities
    //setupSliderHandlers();
    setupEnvoironmentSettingsInputElements();

    // Set up event listeners
    setupButtonHandlers();

    // Set up resize handler
    setupResizeHandler();

    // Check for WebGL support
    if (!isWebGLAvailable()) {
        showErrorMessage(errorMessage_webgl);
    }
    else {
        hideErrorMessage(errorMessage_webgl);
    }
}



//===================================
// SETUP EVENT LISTENERS & HANDLERS
//===================================

// BUTTON HANDLERS //

function setupButtonHandlers() {

    // Connect button, connect / disconnect
    connectButton.addEventListener('click', () => {
        if (connectButton.textContent === 'Connect') {
            eventHandler('CONNECT_CLICKED');
        } else {
            eventHandler('DISCONNECT_CLICKED');
        }
    });

    // Calibration buttons
    calibrationButtons.quick.addEventListener('click', () => eventHandler('CALIBRATE_CLICKED', 'QUICK'));
    calibrationButtons.long.addEventListener('click', () => eventHandler('CALIBRATE_CLICKED', 'LONG'));
    calibrationButtons.zRotation.addEventListener('click', () => eventHandler('CALIBRATE_CLICKED', 'Z_ROTATION'));


    inputLog_clearButton.addEventListener('click', () => handleClearInputLogs);
    resultsLog_clearButton.addEventListener('click', () => handleClearResultsLogs);
    // Add more event listeners as needed
}



// ACCORDION HANDLERS //

function setupAccordionHandlers() {
    accordions.forEach((accordion) => {
        const header = accordion.querySelector('.accordion-header');
        const content = accordion.querySelector('.accordion-content');
        const toggleButton = accordion.querySelector('.accordion-toggle');

        header.addEventListener('click', () => {
            const isExpanded = content.getAttribute('data-expanded') === 'true';
            toggleAccordion(content, toggleButton, !isExpanded);
        });
    });
}

function toggleAccordion(content, toggleButton, expand) {
    content.style.display = expand ? 'flex' : 'none';
    content.setAttribute('data-expanded', expand.toString());
    toggleButton.textContent = expand ? 'Collapse' : 'Expand';
}


// LOG TAB SWITCHING //
function setupLogTabSwitching() {
    logTabButtons.forEach(button => {
        button.addEventListener('click', handleLogTabClick);
    });
}

// Handler for tab click events
function handleLogTabClick(event) {
    const targetId = event.target.getAttribute('data-target');

    // Remove active class from all buttons and panels
    logTabButtons.forEach(btn => btn.classList.remove('active'));
    logPanels.forEach(panel => panel.classList.remove('active'));

    // Add active class to clicked button and corresponding panel
    event.target.classList.add('active');
    document.getElementById(targetId).classList.add('active');
}



// ENVOIRONMENT SETTINGS INPUT ELEMENTS - GROUPING AND HANDLERS //

// Sets up all input elements for environment settings section
function setupEnvoironmentSettingsInputElements() {

    // 0. GET ALL INPUT ELEMENTS
    // Select all input elements within the environment section,
    // store in object with structure properties
    const inputElements = Array.from(environment_section.querySelectorAll('input, select'))
        .map(element => ({
            element,
            group: element.dataset.group,
            describes: element.dataset.describes,
            axis: element.dataset.axis || null,
            type: element.type
        }));

    // 1. STRUCTURE PREPARATION
    // Initialize the environment settings structure object, holding all input elements
    // in hierarchical order
    inputElements.forEach(item => {
        const { element, group, describes, axis, type } = item;

        // Initialize group and describes in the storage object
        if (!environment_settingsInputs[group]) {
            environment_settingsInputs[group] = {};
        }
        if (!environment_settingsInputs[group][describes]) {
            environment_settingsInputs[group][describes] = {};
        }

        // If the element has an axis, store it under the respective axis key
        if (axis) {
            // Initialize the axis object if it doesn't exist yet
            environment_settingsInputs[group][describes][axis] = environment_settingsInputs[group][describes][axis] || {};
            if (type === 'range') {
                environment_settingsInputs[group][describes][axis].slider = element;
            } else if (type === 'number') {
                environment_settingsInputs[group][describes][axis].input = element;
            }
        }
        // If no axis, store the element directly under the describes key
        else {
            environment_settingsInputs[group][describes] = element;
        }
    });

    // 2. SYNCHRONIZATION OF SLIDER-INPUT PAIRS
    // Must be done before other event listeners are attached !!!
    // Searches for slider-input pairs and sets up synchronization by attaching event listeners
    syncSliderInputs(environment_settingsInputs);


    // 3. ATTACH EVENT LISTENERS
    // Go through all input elements again and attach event listeners
    inputElements.forEach(item => {
        const { element, group, describes, axis, type } = item;

        // Attach event listeners to input elements
        element.addEventListener('input', () => handleSettingsChange(group, describes, eventHandler));
    });
}

// Sets up synchronization between slider and input pairs
function syncSliderInputs(input_groupObj) {
    // Traverse through entire tree to find lowest level object of axis.
    // Currently only axis objects can have pairs.

    // Go through each group
    Object.keys(input_groupObj).forEach(group => {
        // If group contains describes, go through each describes
        Object.keys(input_groupObj[group]).forEach(describes => {
            // If describes contains axis, go through each axis
            Object.keys(input_groupObj[group][describes]).forEach(axis => {
                // Get all elements (probably 2) for the current group, describes and axis
                const pair = input_groupObj[group][describes][axis];

                // Check if it is a pair of slider and input
                // If yes, add event listeners to each of the pairs to update the other
                if (pair.slider && pair.input) {
                    pair.slider.addEventListener('input', () => {
                        pair.input.value = pair.slider.value;
                    });

                    pair.input.addEventListener('input', () => {
                        pair.slider.value = pair.input.value;
                    });
                }
            });
        });
    });
}



// Handle changes in settings - To trigger events in the main module
function handleSettingsChange(group, describes, eventHandler) {
    let updatedData;

    let obj = environment_settingsInputs[group][describes];

    // obj may be the HTML element or an object with deeper structure - the axis
    // Check if obj is HTML element
    if (obj instanceof HTMLElement) {
        // Handle single value (dropdowns for shapes, color pickers)
        updatedData = obj.value;
    } else {
        // Handle axes object
        updatedData = {};

        Object.keys(obj).forEach(axis => {
            // Get any element representing the axis. They should be synched anyway.
            const element = obj[axis].slider || obj[axis].input;
            // Add the value to the updated data object with the axis as key
            updatedData[axis] = parseFloat(element.value);
        });
    }

    // Emit ENV_SETTINGS_CHANGED event with group, describes, and updated data
    eventHandler('ENV_SETTINGS_CHANGED', { group, describes, data: updatedData });
}



// RESIZE HANDLER //

function setupResizeHandler() {
    window.addEventListener('resize', () => {
        fitCanvasToContainer(threeViewCanvas);
        // Everything else in UI module that needs to react to window resize

        eventHandler('WINDOW_RESIZED');
    });

    // Trigger initial resize
    fitCanvasToContainer(threeViewCanvas);
}



//===================================
// UI UTILITY FUNCTIONS
//===================================

// SELECT DROPDOWN POPULATION //

/**
 * Populates a select dropdown with options from a provided array or dictionary.
 * 
 * This function accepts an HTML select element and an array or an object (dictionary) 
 * containing the options to be displayed in the dropdown. 
 * It handles both simple arrays and objects with keys and values.
 * Text content is beautified - Capitalizing first letter and removing file extensions if applicable.
 *
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {Array|Object} optionsList - Simple array or an object where keys are the options and their values are the display text.
 */
function populateSelectDropdown(selectElement, optionsList, allowEmpty = false) {
    // Clear the existing options
    selectElement.innerHTML = '';

    // Check if optionsList is an array or an object (dictionary)
    let isArray = Array.isArray(optionsList);
    let valueList, textContentList;

    if (isArray) {
        valueList = optionsList;
        textContentList = optionsList;
    } else {
        valueList = Object.keys(optionsList);
        textContentList = Object.values(optionsList);
    }

    // Add empty option if allowed
    if (allowEmpty) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '- Select -';
        selectElement.appendChild(emptyOption);
    }

    // Create and append option elements to the select element
    valueList.forEach((value, index) => {
        const optionElement = document.createElement('option');
        optionElement.value = value;

        // Beautify the textContent if necessary
        const textContent = textContentList[index];
        if (typeof textContent === 'string') {
            const parts = textContent.split('.');
            const displayText = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            optionElement.textContent = displayText;
        }
        else {
            optionElement.textContent = textContent;
        }

        selectElement.appendChild(optionElement);
    }
    );
}


// WEBGL SUPPORT //
function isWebGLAvailable() {
    try {
        // Create some random canvas element. If WebGL is supported, it will return a context.
        const test_canvas = document.createElement('canvas');
        // Check the context of the canvas
        return !!window.WebGLRenderingContext && (test_canvas.getContext('webgl') || test_canvas.getContext('experimental-webgl'));
    } catch (e) {
        return false;
    }
}



//===================================
// UPDATE UI ELEMENTS - EXTERNAL
//===================================


export function updateConnectionStatus(isConnected) {
    connectButton.textContent = isConnected ? 'Disconnect' : 'Connect';
}

export function updateAccuracyResults(accuracyData) {
    const worldPerspective = accuracyData.worldPerspective;
    const drillerPerspective = accuracyData.drillerPerspective;

    // Update UI with calculation results
    // This might involve updating various elements depending on your UI structure

    // Update results labels with calculation results
    results_pitchToWorld.textContent = worldPerspective.pitch.toFixed(2) + '°';
    results_rollToWorld.textContent = worldPerspective.roll.toFixed(2) + '°';
    results_pitchToRef.textContent = drillerPerspective.pitch.toFixed(2) + '°';
    results_rollToRef.textContent = drillerPerspective.roll.toFixed(2) + '°';

    // Accuracy Percentage may not exist
    if (accuracyData.accuracy !== null && accuracyData.accuracy !== undefined) {
        results_accuracy.textContent = accuracyData.accuracy.toFixed(2) + '%';
    } else {
        results_accuracy.textContent = '-';
    }
}



// LOGGING FUNCTIONALITY //


export function updateInputLog(logs) {
    inputLogElement.innerHTML = logs.map(log => formatLogEntry(log, inputLogTimestamp.checked)).join('');

    if (inputLogAutoscroll.checked) {
        inputLogElement.scrollTop = inputLogElement.scrollHeight;
    }
}

export function updateResultsLog(logs) {
    resultsLogElement.innerHTML = logs.map(log => formatLogEntry(log, resultsLogTimestamp.checked)).join('');

    if (resultsLogAutoscroll.checked) {
        resultsLogElement.scrollTop = resultsLogElement.scrollHeight;
    }
}

function formatLogEntry(log, showTimestamp) {
    return showTimestamp
        ? `<p><span class="timestamp">${log.timestamp}:</span> ${log.message}</p>`
        : `<p>${log.message}</p>`;
}




// MICROCONTROLLER CALIBRATION INFO //

export function updateCalibrationStatus(dataObj) {

    // Check if calibration object is provided
    const isValidData = dataObj && typeof dataObj === 'object';

    // Go through each calibration label and update it
    Object.keys(calibrationLabels).forEach(key => {
        const element = calibrationLabels[key];

        if (isValidData) {
            // Set values and apply color coding
            const calInfo = calibrationMap[dataObj[key]];
            element.textContent = calInfo.caption;
            element.style.color = calInfo.color;
        }
        else {
            // Reset labels if no calibration values provided
            element.textContent = '-';
            // Reset to default color
            element.style.color = '';
        }

    });
}


// CANVAS //
function fitCanvasToContainer(canvas) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

// ERROR MESSAGE HANDLING //
function showErrorMessage(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

function hideErrorMessage(element) {
    if (element) {
        element.classList.add('hidden');
    }
}



//===================================
// GETTERS
//===================================

export function getBaudRate() {
    const selectedRate = baudRateSelect.value;
    if (!selectedRate || isNaN(selectedRate)) {
        throw new Error('No baud rate selected!');
    }

    return parseInt(selectedRate);
}

export function getThreeViewCanvas() {
    return threeViewCanvas;
}

export function getTargetViewContainer() {
    return targetViewContainer;
}

export function getLog(type) {
    return type === 'input' ? inputLog : resultsLog;
}

// Return the a desired value from the environment settings
export function getEnvSettings(group, describes) {
    // group can be 'ref-model', 'driller-model', 'target', 'background'
    // describes can be 'position', 'orientation', 'color', 'shape'
    const dataObj = environment_settingsInputs[group][describes];

    if (typeof dataObj === 'object') {
        return Object.keys(dataObj).reduce((dataObject, axis) => {
            dataObject[axis] = parseFloat(dataObj[axis].input.value);
            return dataObject;
        }, {});
    } else {
        return dataObj.value;
    }
}