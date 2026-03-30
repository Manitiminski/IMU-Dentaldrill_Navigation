// constants.js



//===================================
// IMPORTANT PATHS
//===================================

// PATHS FOR SHAPES
const THREEJS_SHAPES_PATH = `assets/3D_shapes/`;
export const DRILLER_SHAPES_PATH = `${THREEJS_SHAPES_PATH}drillers/`;
export const REFERENCE_SHAPES_PATH = `${THREEJS_SHAPES_PATH}reference_objects/`;



//===================================
// UI ELEMENTS & AVAILABLE OPTIONS
//===================================

// Baudrates and angle types for connection
export const BAUDRATES = [9600, 19200, 38400, 57600, 115200];
export const ANGLE_TYPES = ['Quaternion', 'Euler'];


// AVAILABLE DRILLER AND REFERENCE MODEL SHAPES
// Update the dictionaries to match the shapes available in asset folder!!
export const DRILLER_SHAPES = {
    'bunny.obj': 'Driller 1',
    // Add more if needed. Filename as key, display name as value
};
export const REFERENCE_SHAPES = {
    'testwürfel.stl': 'Test Cube',
    'mandibula.stl': 'Mandible',
    // Add more if needed. Filename as key, display name as value
};



//===================================
// DATA PROCESSING - ORDER OF DATA
//===================================

// Defines the order of values in data received or used by different sources
// E.g. BNO055 sensor provides a certain order for it's orientation data
export const DATA_ORDERS = {
    BNO055_ADAFRUIT: {
        CALIBRATION: ['system', 'gyro', 'accel', 'mag'],
        QUATERNION: ['w', 'x', 'y', 'z'],
        EULER_ANGLES: ['yaw', 'pitch', 'roll']  // Z, Y, X order
    },
    OTHER_SOURCE: {
        QUATERNIONS: ['x', 'y', 'z', 'w']
    }
};

// Maps simple array to object with keys according to provided order
export function createDataObject(values, sourceType, dataType) {
    const order = DATA_ORDERS[sourceType][dataType];
    const dataObject = {};

    order.forEach((key, index) => {
        dataObject[key] = values[index];
    });

    return dataObject;
}



//===================================
// COORDINATE SYSTEMS - TRANSFORMATIONS
//===================================
// Coordinate transforms for different systems
// Three.js uses Y-up coordinate system, while the project otherwise uses Z-up
export const COORDINATE_TRANSFORMS = {
    // Z-up to Y-up (e.g. Global system to Three.js)
    Z_TO_Y: {
        VECTOR: {
            x: (p) => p.x,
            y: (p) => p.z,
            z: (p) => p.y
        },
        QUATERNION: {
            x: (q) => q.x,
            y: (q) => q.z,
            z: (q) => -q.y,
            w: (q) => q.w
        }
    },
    // Y-up to Z-up (e.g. Three.js to Global system)
    Y_TO_Z: {
        VECTOR: {
            x: (p) => p.x,
            y: (p) => p.z,
            z: (p) => p.y
        },
        QUATERNION: {
            x: (q) => q.x,
            y: (q) => -q.z,
            z: (q) => q.y,
            w: (q) => q.w
        }
    }
};

// Function to transform the coordinate system of an object
export function transformCoordinates(obj, transformType, coordType) {
    const transform = COORDINATE_TRANSFORMS[transformType][coordType];
    const transformedObj = {};

    Object.keys(transform).forEach(key => {
        transformedObj[key] = transform[key](obj);
    });

    return transformedObj;
}




//===================================
// OBJECT START POSITIONS AND ROTATIONS
//===================================

// ATTENTION: The coordinates provided here are in the global coordinate system, not Three.js

// START POSITIONS FOR MODELS
export const DRILLER_START_POSITION = { x: 0, y: 0, z: 0 };
// Driller starts to look to the right in x-axis
export const DRILLER_START_ORIENTATION = { x: 0, y: 0, z: 0, w: 1 };

export const WORLD_DRILLER_START_OFFSET = { x: 0, y: 0, z: 0 };


// This here describes the mouth as reference object
export const REFERENCE_START_POSITION = { x: 0, y: 0, z: 0 };
export const REFERENCE_START_ORIENTATION = { x: 0, y: 0, z: 0, w: 1 };

// For target vector
export const TARGET_START_ORIENTATION = { x: 0, y: 0, z: 0, w: 1 };
export const TARGET_START_LENGTH = 70;


//===================================
// THREE.JS MODEL SETTINGS
//===================================
// Some models have a different coordinate system or scale compared to what is expected
// Uses the Three.js coordinate system (Y-up)
// Initial Orientations - Euler angles in degrees
export const MODELS_INITIAL_ORIENTATIONS_EULER_DEGREES = {
    'bunny.obj': { x: 0, y: 180, z: 0 },    // Turn around vertical axis
    'testwürfel.stl': { x: 0, y: 0, z: 0 },
    'mandibula.stl': { x: 0, y: 0, z: 0 }
};