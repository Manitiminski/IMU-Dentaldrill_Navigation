// accuracy-target-view.js
// Handles the accuracy target SVG visualization

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

let svgContainer;
let crosshair;
let rings;

const MIN_ANGLE = -8;
const MAX_ANGLE = 8;
const SVG_SIZE = 200;
const SVG_CENTER = SVG_SIZE / 2;
const LARGEST_CIRCLE = 180;
const RING_COLORS = ['#00ff00', '#80ff00', '#ffff00', '#ff8000', '#ff0000'];

let updateInProgress = false;

//===================================
// INITIALIZATION
//===================================

export function init(container) {
    svgContainer = container;
    loadSVG();
}

// Initial load of the SVG file and places the svg within the HTML container
function loadSVG() {
    fetch('assets/assets_static/accuracy_target.svg')
        .then(response => response.text())
        .then(svgContent => {
            svgContainer.innerHTML = svgContent;
            initializeElements();
        });
}

// Initializes DOM elements and sets initial values
function initializeElements() {
    crosshair = document.getElementById('crosshair');
    rings = Array.from(document.querySelectorAll('.ring'));
}


//===================================
// UPDATE FUNCTIONS
//===================================

// Update the target view with the given data - Exported function, called from main.js
export async function update(data, perspective = 'world') {
    if (updateInProgress) {
        Debug.log('Update already in progress, skipping this update');
        return;
    }

    updateInProgress = true;

    try {
        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to the event loop

        let { pitch, roll } = data[`${perspective}Perspective`];

        // Cap the values to the defined range
        pitch = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, pitch));
        roll = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, roll));

        updateCrosshairPosition(pitch, roll);
        updateRingColors(pitch, roll);
    } finally {
        updateInProgress = false;
    }
}

// Update the crosshair position based on the pitch and roll values
function updateCrosshairPosition(pitch, roll) {

    const y = (roll / MAX_ANGLE) * LARGEST_CIRCLE / 2;
    const x = -(pitch / MAX_ANGLE) * LARGEST_CIRCLE / 2;
    crosshair.setAttribute('transform', `translate(${SVG_CENTER + x}, ${SVG_CENTER + y})`);
}


// Update the color of the target circles based on the pitch and roll values
function updateRingColors(pitch, roll) {
    // Get the distance from the center
    const distance = Math.sqrt(pitch ** 2 + roll ** 2);
    // Get ratio between distance and max distance
    const ratio = Math.min(distance / MAX_ANGLE, 1);

    const ringCount = rings.length;
    // Calculate the active ring index based on the distance from the center
    const activeRingIndex = Math.min(ringCount - 1, Math.floor(ratio * ringCount));

    rings.forEach((ring) => {
        // Remove all highlight classes
        ring.classList.remove(...Array.from(ring.classList).filter(cls => cls.startsWith('highlight-')));

        // Get the data-ring value
        const ringIndex = parseInt(ring.getAttribute('data-ring'));

        // Add the highlight class to the active ring, fill others with white
        if (ringIndex === activeRingIndex) {
            ring.classList.add(`highlight-${ringIndex}`);
        } else {
            ring.setAttribute('fill', 'white');
        }
    });
}

//===================================