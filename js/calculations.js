// calculations.js


//===================================
// IMPORTS
//===================================

// EXTERNAL LIBRARIES //
import * as THREE from 'three';

// PROJECT MODULES //
import * as Constants from './constants.js';
import * as Throttle from './utils/throttle.js';
import * as Debug from './utils/_debug.js';


//===================================
// GLOBAL CONSTANTS & VARIABLES
//===================================

// Event handler function to communicate with the main module - Provided as parameter in init()
let eventHandler;


// Orientation storage
const orientationObjects = {
    world_sensor: new THREE.Quaternion(),
    driller_sensor: new THREE.Quaternion(),
    offset: new THREE.Quaternion(),
    driller_world: new THREE.Quaternion(),
    target_world: new THREE.Vector3()
};

// Flags for calculations - to prevent multiple instances of the same calculation
const isCalculating = {
    drillerToWorld: false,
    sphericalToVector: false,
    accuracyResults: false,
    calibration: false,
    longCalibration: false
};

// Calibration types
const CALIBRATION_TYPES = {
    QUICK: 'QUICK',
    LONG: 'LONG',
    Z_ROTATION: 'Z_ROTATION'
};

// Timer for long calibration
let longCalibrationTimer = null;

const THROTTLE_INTERVALS = {
    drillerToWorld: 1000 / 30, // 30 fps
    sphericalToVector: 10, // ms
    accuracyResults: 10 // ms
};

// For Accuracy results
const ACCURACY_RANGE_OF_INTEREST = 30; // degrees


// DEBUGGING //
// Timed debug logger
const _debugLog_calcResults = Debug.createTimedLogger(500, '[CALC RESULTS]: ');

// Mock data
// const _mockdata = ['world_sensor', x: 0.9355, y: 0.2816, z: -0.2136, w: -0.0031];

// Make some local functions available globally for debugging
// Comment out before deployment !!
window._calculations = {
    updateOrientation: updateOrientation,
    getQuaternionFromEuler: getQuaternionFromEuler,
    //mockdata: _mockdata
};



//===================================
// INITIALIZATION
//===================================
export function init(handler) {
    eventHandler = handler;

    // Initialize all quaternions
    orientationObjects.world_sensor = new THREE.Quaternion();
    orientationObjects.driller_sensor = new THREE.Quaternion();
    orientationObjects.offset = new THREE.Quaternion();
    orientationObjects.driller_world = new THREE.Quaternion();
    orientationObjects.target_world = new THREE.Vector3();

    // Reset flags
    for (let key in isCalculating) {
        isCalculating[key] = false;
    }
}


//===================================
// UPDATE & CALIBRATION FUNCTIONS - EXTERNAL
//===================================

// UPDATE ORIENTATION DATA //

// Update orientation data for a specific type
export function updateOrientation(type, data) {
    switch (type) {
        case 'world_sensor':
        case 'driller_sensor': {
            const quat = data instanceof THREE.Quaternion ? data : new THREE.Quaternion(data.x, data.y, data.z, data.w);
            orientationObjects[type].copy(quat);
            // Start calculation for driller-to-world quaternion conversion
            startCalc_drillerToWorldQuaternion();
            break;
        }

        case 'target_sphere': {
            if (data.inclination !== undefined && data.azimuth !== undefined) {
                // Start calculation for converting spherical coordinates to a vector
                // Data directly passed cause it is not necessary to store it in state handler
                startCalc_sphereToVector(data);
            } else {
                console.error('Invalid data format for target sphere');
            }
            break;
        }

        case 'target_world': {
            const vector = data instanceof THREE.Vector3 ? data : new THREE.Vector3(data.x, data.y, data.z);
            orientationObjects.target_world.copy(vector);
            // Start calculation for accuracy results
            startCalc_accuracyResults();
            break;
        }

        case 'driller_world': {
            const quat = data instanceof THREE.Quaternion ? data : new THREE.Quaternion(data.x, data.y, data.z, data.w);
            orientationObjects.driller_world.copy(quat);
            // Start calculation for accuracy results
            startCalc_accuracyResults();
            break;

        }

        default:
            console.error('Invalid orientation type:', type);
    }
}


// CALIBRATION //

// Start calibration of a specific type
export function startCalibration(type, timeout = 5000) {
    if (!isCalculating.calibration) {
        isCalculating.calibration = true;
        setTimeout(() => {
            performCalibration(type, timeout);
        }, 0);
    }
    else {
        console.error('Calibration already running');
    }
}

// Stops and finalizes calibration if running - Only for long calibration
export function stopCalibration() {
    if (isCalculating.longCalibration) {
        clearTimeout(longCalibrationTimer);
        finalizeLongCalibration();
    }
}



//===================================
// ASYNC CALCULATION FUNCTIONS
//===================================

// THROTTLING & QUEUING //

// Throttles and queues the calculation of the driller-to-world quaternion
const startCalc_drillerToWorldQuaternion = Throttle.throttle(async () => {
    if (!isCalculating.drillerToWorld) {
        isCalculating.drillerToWorld = true;
        try {
            const drillerWorld = await convertDrillerToWorldQuaternion();
            updateOrientation('driller_world', drillerWorld);
            eventHandler('DRILLER_TO_WORLD_QUATERNION', drillerWorld);
        } finally {
            isCalculating.drillerToWorld = false;
        }
    }
}, THROTTLE_INTERVALS.drillerToWorld); // e.g. 30 fps

// Throttles and queues the calculation of the spherical coordinates to a vector
const startCalc_sphereToVector = Throttle.throttle(async (sphericalCoords) => {
    if (!isCalculating.sphericalToVector) {
        isCalculating.sphericalToVector = true;
        try {
            const targetVector = await convertSphericalToVector(sphericalCoords);
            updateOrientation('target_world', targetVector);
            eventHandler('TARGET_SPHERICAL_TO_VECTOR', targetVector);
        } finally {
            isCalculating.sphericalToVector = false;
        }
    }
}, THROTTLE_INTERVALS.sphericalToVector); // e.g. 10 ms

// Throttles and queues the calculation of the accuracy results
const startCalc_accuracyResults = Throttle.throttle(async () => {
    if (!isCalculating.accuracyResults) {
        isCalculating.accuracyResults = true;
        try {
            const accuracyResults = await calculateAccuracyResults();
            eventHandler('ACCURACY_DATA', accuracyResults);
        } finally {
            isCalculating.accuracyResults = false;
        }
    }
}, THROTTLE_INTERVALS.accuracyResults); // e.g. 10 ms



// CALCULATION FUNCTIONS //



const ROLL_OFFSET = 0.43; // degrees = Pitch
const PITCH_OFFSET = 0.0; // degrees = -Roll
const YAW_OFFSET = 0.0; // degrees

const missalignment = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
            THREE.MathUtils.degToRad(PITCH_OFFSET),
            THREE.MathUtils.degToRad(ROLL_OFFSET),
            THREE.MathUtils.degToRad(YAW_OFFSET),
            'YXZ' // Rotation order: Yaw (Y), Pitch (X), Roll (Z)
        )
    ).invert();

    
// Converts driller sensor data to world reference frame, including calibration offset
async function convertDrillerToWorldQuaternion() {
    const driller_raw = orientationObjects.driller_sensor.clone();


    // Apply both, the offset and the missalignment to the driller quaternion
    const driller_raw_with_missalignment = driller_raw.multiply(missalignment);
    const driller_calibrated = orientationObjects.offset.clone().multiply(driller_raw_with_missalignment);


    // Apply offset between driller and world, determined during calibration
    //const driller_calibrated = driller_raw.multiply(orientationObjects.offset);

    // Convert driller quaternion to use world as reference frame
    const worldInverse = orientationObjects.world_sensor.clone().invert();
    const driller_world = worldInverse.multiply(driller_calibrated);

    // Return new quaternion with world as reference frame
    return driller_world;
}

// Converts spherical coordinates to a vector
async function convertSphericalToVector(sphericalCoords) {
    const { inclination, azimuth } = sphericalCoords;

    // Convert angles to radians
    const inclinationRad = THREE.MathUtils.degToRad(inclination);
    const azimuthRad = THREE.MathUtils.degToRad(azimuth);

    // Calculate vector components
    const x = Math.sin(inclinationRad) * Math.cos(azimuthRad);
    const y = Math.sin(inclinationRad) * Math.sin(azimuthRad);
    const z = Math.cos(inclinationRad);

    // Create and return new vector
    return new THREE.Vector3(x, y, z).normalize();
}


// Calculates accuracy results
async function calculateAccuracyResults() {
    const drillerWorld = orientationObjects.driller_world.clone();
    const targetVector = orientationObjects.target_world.clone();

    // Accuracy Results From Perspective of the World //
    const worldRelative = calculateWorldRelativeAccuracy(drillerWorld, targetVector);

    // Accuracy Results From Perspective of the Driller //
    const drillerRelative = calculateDrillerRelativeAccuracy(drillerWorld, targetVector);

    // Calculate overall accuracy percentage
    const accuracy = calculateOverallAccuracy(worldRelative.pitch, worldRelative.roll);

    // Return results
    return {
        worldPerspective: worldRelative,
        drillerPerspective: drillerRelative,
        accuracy: accuracy
    };
}

// Calculates the accuracy results from the perspective of the world
function calculateWorldRelativeAccuracy(drillerWorld, targetVector) {
    // Transform driller quaternion to a vector/axes in the world space 
    // and compare to target vector in world space

    // Driller's z-axis in world space
    const drillerZ = new THREE.Vector3(0, 0, 1).applyQuaternion(drillerWorld);

    // Calculate the rotation needed to align drillerZ with targetVector
    const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(drillerZ, targetVector);

    // Convert quaternion to Euler angles (in radians)
    const euler = new THREE.Euler().setFromQuaternion(rotationQuaternion, 'YXZ');

    // Extract pitch and roll in degrees
    const pitch = THREE.MathUtils.radToDeg(euler.x);
    const roll = THREE.MathUtils.radToDeg(euler.y);

    // Return pitch and roll in degrees
    return {
        pitch: pitch,
        roll: roll
    };
}

// Calculates the accuracy results from the perspective of the driller
function calculateDrillerRelativeAccuracy(drillerWorld, targetVector) {
    // Transform target vector to reference frame of the driller
    const drillerInverse = drillerWorld.clone().invert();
    const target_driller = targetVector.clone().applyQuaternion(drillerInverse);

    // Calculate the rotation needed to align driller's forward (z-axis) with the target
    const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), target_driller);

    // Convert quaternion to Euler angles (in radians)
    const euler = new THREE.Euler().setFromQuaternion(rotationQuaternion, 'YXZ');

    // Extract pitch and roll in degrees
    const pitch = THREE.MathUtils.radToDeg(euler.y);
    const roll = THREE.MathUtils.radToDeg(euler.x);

    // Return pitch and roll in degrees
    return {
        pitch: pitch,
        roll: roll
    };
}

// Calculates the overall accuracy percentage
function calculateOverallAccuracy(pitch, roll) {
    // Calculate the percentage of alignment
    const angularDeviation = Math.sqrt(pitch ** 2 + roll ** 2);

    // Calculate accuracy percentage using quadratic function
    let accuracy = Math.max(0, 100 * (1 - (angularDeviation / ACCURACY_RANGE_OF_INTEREST) ** 2));

    // Round to two decimal places
    return Math.round(accuracy * 100) / 100;
}



//===================================
// ASYNC CALIBRATION FUNCTIONS
//===================================

// Perform calibration of a specific type
async function performCalibration(type, timeout) {
    let result;
    try {
        switch (type) {
            case CALIBRATION_TYPES.QUICK:
                result = await quickCalibration();
                break;
            case CALIBRATION_TYPES.LONG:
                result = await longCalibration(timeout);
                break;
            case CALIBRATION_TYPES.Z_ROTATION:
                result = await zRotationCalibration();
                break;
            default:
                console.error('Invalid calibration type');
                return;
        }

        if (result) {
            orientationObjects.offset.copy(result);
            eventHandler('CALIBRATION_FINISHED', { type, offset: result });
        }
    } finally {
        isCalculating.calibration = false;
    }
}

// Quick calibration - returns the offset between the world and driller sensor
async function quickCalibration() {
    // Get current orientations
    const worldQuat = orientationObjects.world_sensor.clone();
    const drillerQuat = orientationObjects.driller_sensor.clone();
    
    // Calculate offset

    const offset = drillerQuat.multiply(missalignment).invert();
    
    // IMPORTANT: Might not work if world changes too. Must be tested and maybe corrected!!!
   // Old probably wrong code:
    //const offset = worldQuat.invert();
    //const offset = worldInverse.multiply(drillerQuat);

    return offset;
}

// Long calibration - Measures rotation axes over time, then calculates the offset between the world and driller sensor
async function longCalibration(timeout) {
    isCalculating.longCalibration = true;
    const measurements = [];

    const collectMeasurements = () => {
        if (isCalculating.longCalibration) {
            // TODO: Implement the measurement collection logic for long calibration
        }
    };

    const startCalibration = new Promise((resolve) => {
        collectMeasurements();
        longCalibrationTimer = setTimeout(() => {
            if (isCalculating.longCalibration) {
                finalizeLongCalibration();
                resolve();
            }
        }, timeout);
    });

    await startCalibration;

    return calculateLongCalibrationResult(measurements);
}

// Finalize long calibration
function finalizeLongCalibration() {
    // TODO: Implement the finalization logic for long calibration
    isCalculating.longCalibration = false;
    clearTimeout(longCalibrationTimer);
    console.log('Long calibration finalized!');
    // eventHandler('LONG_CALIBRATION_ENDED');
}

// Calculate the calibration offset from the collected measurements
function calculateLongCalibrationResult(measurements) {
    // TODO: Implement the calculation logic for long calibration
    // This should process the collected measurements and return the calibration offset
    console.log('Long calibration calculation not yet implemented');
    return null;
}

// Z-rotation calibration - Only calibrates the rotation around the z-axis to align the driller with the world
async function zRotationCalibration() {
    const worldQuat = orientationObjects.world_sensor.clone();
    const drillerQuat = orientationObjects.driller_sensor.clone();
    const currentOffset = orientationObjects.offset.clone();

    // Calculate driller's orientation in world space
    const drillerWorldQuat = worldQuat.clone().invert().multiply(drillerQuat).multiply(currentOffset);

    // Align Z axes
    const zAxisAlignment = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1).applyQuaternion(drillerWorldQuat),
        new THREE.Vector3(0, 0, 1)
    );

    // Extract Z rotation
    const alignedDrillerQuat = zAxisAlignment.clone().invert().multiply(drillerWorldQuat);
    const zRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, new THREE.Euler().setFromQuaternion(alignedDrillerQuat, 'XYZ').z)
    );

    // Combine rotations and calculate new offset
    const newWorldToDrillerRotation = zRotation.multiply(zAxisAlignment);
    return worldQuat.clone().multiply(newWorldToDrillerRotation).multiply(drillerQuat.clone().invert());
}



//===================================
// SIMPLE CALCULATION FUNCTIONS
//===================================

// Get quaternion from vector
export function getQuaternionFromVector(vector, upLabel = 'z') {
    if (upLabel === 'z') {
        up = new THREE.Vector3(0, 0, 1);
    } else if (upLabel === 'y') {
        up = new THREE.Vector3(0, 1, 0);
    } else {
        console.error('Invalid up label:', upLabel);
        return;
    }

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, vector);

    return quaternion;
}

// Get quaternion from Euler angles
export function getQuaternionFromEuler(angles, unit = 'degrees', rotationOrder = 'XYZ') {
    let myAngles = [...angles];
    if (unit === 'degrees') {
        myAngles = myAngles.map(angle => THREE.MathUtils.degToRad(angle));
    }

    const euler = new THREE.Euler().fromArray(myAngles, rotationOrder);
    const quaternion = new THREE.Quaternion().setFromEuler(euler);

    return quaternion;
}