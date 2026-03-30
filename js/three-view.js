// three-view.js

//===================================
// IMPORTS
//===================================

// EXTERNAL LIBRARIES //
import * as THREE from 'three';
import { OrbitControls } from 'orbitcontrols';
import { OBJLoader } from 'objloader';
import { STLLoader } from 'stlloader';

// PROJECT MODULES //
import * as Constants from './constants.js';


//===================================
// GLOBAL CONSTANTS & VARIABLES
//===================================

// Private variables for most basic elements
let scene, camera, renderer, controls;
// Loaders for different model types
let stlLoader, objLoader;

// Object to hold models (wrapped in Object3D for easier manipulation)
let models = {
    driller: null,
    reference: null,
    target: null
};

// State object to hold model orientation and position
const modelState = {
    driller: {
        position: null,
        orientation: null,
        shape: {
            path: null,
            initialRotation: null
        },
        color: null,
        positionChanged: false,
        orientationChanged: false,
        shapeChanged: false,
        colorChanged: false
    },
    reference: {
        position: null,
        orientation: null,
        shape: {
            path: null,
            initialRotation: null
        },
        color: null,
        positionChanged: false,
        orientationChanged: false,
        shapeChanged: false,
        colorChanged: false
    },
    target: {
        orientation: null,
        color: null,
        orientationChanged: false,
        colorChanged: false
    },
    background: {
        color: null,
        colorChanged: false
    }
};

// Flag for animation loop
let isAnimationOn = false;
const frameRate = 1 / 30; // 30 FPS


// Default camera position
const DEFAULT_CAMERA_POSITION = { x: 30, y: 70, z: 120 };


//===================================
// INITIALIZATION
//===================================
export function init(canvas) {
    // Initialize all basic elements
    scene = setupScene();
    renderer = setupRenderer(canvas);
    camera = setupCamera(canvas);
    controls = setupControls(camera, canvas);


    // Event listeners
    window.addEventListener('resize', updateCanvasSize(canvas));

    // Init loaders. Used by the _createModelFromFile function
    stlLoader = new STLLoader();
    objLoader = new OBJLoader();

    // Setup model states - Ensures all state properties have correct object types (Vector3, Quaternion)
    setupModelStates();

    // Set basic model states - The initial setup before user interaction
    //setModelStates_default();
    setModelStates_testing();


    // For testing already turn animation loop on
    isAnimationOn = true; // Set flag to true to start animating

    // Start the animation loop
    startAnimationLoop(); // Start rendering loop here
}



//===================================
// SETUP FUNCTIONS
//===================================
function setupScene() {
    // Create local scene object
    const scene = new THREE.Scene();

    // Background color
    scene.background = new THREE.Color('grey');

    // Hemispheric light
    {
        const skyColor = 0xB1E1FF;  // light blue
        const groundColor = 0x666666;  // black
        const intensity = 0.5;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    // Directional light
    {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(0, 10, 0);
        light.target.position.set(-5, 0, 0);
        scene.add(light);
        scene.add(light.target);
    }

    // Axes & grid
    {
        // Axes
        const axesLength = 40;
        const axesHelper = new THREE.AxesHelper(axesLength);
        // Make the lines a bit more transparent, and the should be dotted
        axesHelper.material.transparent = true;
        axesHelper.material.opacity = 0.5;
        scene.add(axesHelper);

        // Grid
        const size = 100;
        const divisions = 20;
        const gridHelper = new THREE.GridHelper(size, divisions)
        //scene.add(gridHelper);
    }

    // Orientation Circles
    {
        const radius = 15;
        const segments = 64;
        const circleGeometry = new THREE.CircleGeometry(radius, segments);

        const xCircleMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
        const yCircleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
        const zCircleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.1, side: THREE.DoubleSide });

        const xCircle = new THREE.Line(circleGeometry, xCircleMaterial);
        const yCircle = new THREE.Line(circleGeometry, yCircleMaterial);
        const zCircle = new THREE.Line(circleGeometry, zCircleMaterial);

        // Rotate the circles to be in the correct orientation
        // X goes from left to rigth
        xCircle.rotation.y = Math.PI / 2;
        // Y goes from bottom to top
        yCircle.rotation.x = Math.PI / 2;
        // Z goes from back to front
        // zCircle already in the correct orientation

        scene.add(xCircle);
        scene.add(yCircle);
        scene.add(zCircle);
    }

    // Return local scene object
    return scene;
}

function setupRenderer(canvas) {
    // Create local renderer object
    const renderer = new THREE.WebGLRenderer({ canvas });

    // Set to client size in order to be more responsive.
    // Allows to resize the canvas and the renderer in case the window is resized.
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Return local renderer object
    return renderer;
}

function setupCamera(canvas) {
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;

    // Create local camera object
    const camera = new THREE.PerspectiveCamera(
        40, // Field of view
        aspectRatio, // Aspect ratio
        0.1, // Near clipping plane
        500 // Far clipping plane
    );

    camera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);

    // Return local camera object
    return camera;
}

function setupControls(camera, canvas) {
    // Create local controls object
    const controls = new OrbitControls(camera, canvas);

    controls.enableDamping = true; // Smooth controls
    controls.dampingFactor = 0.25; // Control the damping effect
    controls.enableZoom = true; // Allow zooming in and out

    // Return local controls object
    return controls;
}

function setupModelStates() {
    // Initialize Vector3 and Quaternion objects if they don't exist

    // For driller model
    if (!modelState.driller.position) modelState.driller.position = new THREE.Vector3();
    if (!modelState.driller.orientation) modelState.driller.orientation = new THREE.Quaternion();

    // For reference model
    if (!modelState.reference.position) modelState.reference.position = new THREE.Vector3();
    if (!modelState.reference.orientation) modelState.reference.orientation = new THREE.Quaternion();

    // For target model
    if (!modelState.target.orientation) modelState.target.orientation = new THREE.Quaternion();
}

// Setting basic model states with default values
function setModelStates_default() {
    // ATTENTION: All pose values loaded from constants.js are in global coordinate system, not Three.js
    // Global coordinate system is Z up, thus they must be transformed to Three.js coordinate system

    // Transforms and set initial position and orientation for all models

    // DRILLER MODEL
    // Shape
    const drillerShape = {
        path: `${Constants.DRILLER_SHAPES_PATH}bunny.obj`,
        initialRotation: Constants.MODELS_INITIAL_ORIENTATIONS_EULER_DEGREES['bunny.obj']
    };

    modelState.driller.shape = drillerShape;
    modelState.driller.shapeChanged = true;
    // Position
    const drillerPos = Constants.transformCoordinates(Constants.DRILLER_START_POSITION, 'Z_TO_Y', 'VECTOR');
    modelState.driller.position.set(drillerPos.x, drillerPos.y, drillerPos.z);
    modelState.driller.positionChanged = true;
    // Orientation
    const drillerOrient = Constants.transformCoordinates(Constants.DRILLER_START_ORIENTATION, 'Z_TO_Y', 'QUATERNION');
    modelState.driller.orientation.set(drillerOrient.x, drillerOrient.y, drillerOrient.z, drillerOrient.w);
    modelState.driller.orientationChanged = true;
    // Color
    const drillerColor = 0xcccccc;
    modelState.driller.color = drillerColor;
    modelState.driller.colorChanged = true;

    // VECTOR MODEL
    // Orientation
    const targetOrient = Constants.transformCoordinates(Constants.TARGET_START_ORIENTATION, 'Z_TO_Y', 'QUATERNION');
    modelState.target.orientation.set(targetOrient.x, targetOrient.y, targetOrient.z, targetOrient.w);
    modelState.target.orientationChanged
    // Color
    const targetColor = 0x0000ff;
    modelState.target.color = targetColor;
    modelState.target.colorChanged = true;

    // BACKGROUND
    // Color
    const backgroundColor = 'grey';
    modelState.background.color = backgroundColor;
    modelState.background.colorChanged = true;
}

// Setting all model states with some initial values, for testing
function setModelStates_testing() {
    setModelStates_default();

    // ATTENTION: All pose values loaded from constants.js are in global coordinate system, not Three.js
    // Global coordinate system is Z up, thus they must be transformed to Three.js coordinate system

    // REFERENCE MODEL
    // Shape
    const referenceShape = `${Constants.REFERENCE_SHAPES_PATH}mandibula.stl`;
    modelState.reference.shape = referenceShape;
    modelState.reference.shapeChanged = true;
    // Position
    const referencePos = Constants.transformCoordinates(Constants.REFERENCE_START_POSITION, 'Z_TO_Y', 'VECTOR');
    modelState.reference.position.set(referencePos.x, referencePos.y, referencePos.z);
    modelState.reference.positionChanged = true;
    // Orientation
    const referenceOrient = Constants.transformCoordinates(Constants.REFERENCE_START_ORIENTATION, 'Z_TO_Y', 'QUATERNION');
    modelState.reference.orientation.set(referenceOrient.x, referenceOrient.y, referenceOrient.z, referenceOrient.w);
    modelState.reference.orientationChanged = true;
    // Color
    const referenceColor = 0xD2A9A1;
    modelState.reference.color = referenceColor;
    modelState.reference.colorChanged = true;
}



//===================================
// UPDATE FUNCTIONS - EXTERNAL
//===================================

// Updates the size of the canvas, needed when the window is resized
export function updateCanvasSize(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (renderer) {
        renderer.setSize(width, height);
    }
    if (camera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}


// Updates the pose - position and orientation - of a model
export function updateModel_pose(name, property, dataObj) {
    // Can currently only handle normal objects, not Three.js objects
    // Convert THREE.js objects to plain objects with named variables
    if (dataObj instanceof THREE.Vector3) {
        dataObj = { x: dataObj.x, y: dataObj.y, z: dataObj.z };
    } else if (dataObj instanceof THREE.Quaternion) {
        dataObj = { x: dataObj.x, y: dataObj.y, z: dataObj.z, w: dataObj.w };
    }

    const state = modelState[name];

    // Guard - Check if state exists
    if (!state) {
        console.error('Invalid model name:', name);
        return;
    }

    // Convert dataObj's coordinate system to Three.js coordinate system
    // Just matter if 3-dimensional (vector) or 4-dimensional (quaternion)
    if (dataObj.w !== undefined) {
        // Is quaternion
        dataObj = Constants.transformCoordinates(dataObj, 'Z_TO_Y', 'QUATERNION');
    } else {
        // Is vector
        dataObj = Constants.transformCoordinates(dataObj, 'Z_TO_Y', 'VECTOR');
    }

    // Use built-in set method to update position or orientation
    if (property === 'position') {
        state.position.set(dataObj.x, dataObj.y, dataObj.z);
        state.positionChanged = true;
    } else if (property === 'orientation') {
        if (dataObj.w === undefined) {
            // Vector object given instead of quaternion
            const upVector = new THREE.Vector3(0, 1, 0);    // Y up
            const inputVector = new THREE.Vector3(dataObj.x, dataObj.y, dataObj.z).normalize();
            // Sets quaternion from a rotation of upVector to inputVector
            state.orientation.setFromUnitVectors(upVector, inputVector);
        } else {
            state.orientation.set(dataObj.x, dataObj.y, dataObj.z, dataObj.w);
        }
        state.orientationChanged = true;
    }
}


// Updates the appearance - color or shape - of a model
export function updateModel_appearance(name, property, dataObj) {
    // Name is the group name, property is the type of change, dataObj is the data object
    // Name can be 'driller-model', 'ref-model' or 'target'
    // Property can be 'color' or 'shape'

    // Guard - Check if name is valid
    const state = modelState[name];
    if (!state) {
        console.error('Invalid model name:', name);
        return;
    }

    // Guard - Check for any invalid combinations of name and property
    if (name === 'target' && property === 'shape') {
        console.error('Invalid model name / propterty combo:', name, property);
        return;
    }

    // For color changes
    if (property === 'color') {
        state.color = dataObj;
        state.colorChanged = true;
    }

    // For shape changes
    if (property === 'shape') {
        if (!dataObj) {
            // Any kind of null or undefined will set shape to null - For removing the model
            state.shape = null;
        } else {
            // Can handle both string and object types
            let path = typeof dataObj === 'string' ? dataObj : dataObj.path;
            const initialRotation = dataObj.initialRotation || null;
            // Make sure path is a full path, otherwise create path
            path = path.startsWith('/') ? path : `${name === 'driller' ? Constants.DRILLER_SHAPES_PATH : Constants.REFERENCE_SHAPES_PATH}${path}`;
            state.shape = {
                path: path,
                initialRotation: initialRotation
            };
        }
        state.shapeChanged = true;
    }
}


// Updates the background color of the scene
export function updateBackground(color) {
    scene.background = new THREE.Color(color);
}



//===================================
// ANIMATION LOOP
//===================================

// Function to animate the scene, called continuously by the renderer.
function animate() {
    // Update models based on their state
    ['driller', 'reference', 'target'].forEach(type => {
        _updateModel_appearance(type);
        _updateModel_pose(type);
    });
    // Update background based on its state
    _updateBackground();

    // Update controls. Must be called outside of the render loop due to damping.
    if (controls) {
        controls.update();
    }

    // Render the scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }

    // Continue animation loop only if animation flag still on
    if (isAnimationOn) {
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, frameRate * 1000);
    }
}



// Function to start the animation loop
export function startAnimationLoop() {
    isAnimationOn = true; // Set flag to true to start animating
    requestAnimationFrame(animate); // Start the animation loop with requestAnimationFrame
    console.log("Animation loop started.");
}

// Function to stop the animation loop
export function stopAnimationLoop() {
    isAnimationOn = false; // Set flag to false to stop animating
    console.log("Animation loop stopped.");
}


//===================================
// MODEL OBJECT MANAGEMENT
//===================================

// Loads a shape from a file and creates model wraped in an object3D, and returns it packaged in a promise (async)
function _createModelFromFile(path_shapeFile, options = {}) {
    const {
        color = 0xcccccc,
        initialRotation = null,
        initialPosition = null,
    } = options;

    const loader = path_shapeFile.endsWith('.stl') ? stlLoader : objLoader;

    return new Promise((resolve, reject) => {
        loader.load(path_shapeFile,
            (geometryOrRoot) => {
                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(color),
                    specular: 0x111111,
                    shininess: 200
                });

                let model;
                if (path_shapeFile.endsWith('.stl')) {
                    model = new THREE.Mesh(geometryOrRoot, material);
                } else {
                    model = geometryOrRoot;
                    model.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.material = material;
                        }
                    });
                }

                // Create a wrapper object to hold the model - Allows for easier manipulation
                const wrapper = new THREE.Object3D();
                wrapper.add(model);


                // Apply initial rotation to the model (within the wrapper)
                if (initialRotation) {
                    if (initialRotation instanceof THREE.Euler) {
                        model.rotation.copy(initialRotation);
                    } else if (initialRotation.x !== undefined && initialRotation.y !== undefined && initialRotation.z !== undefined) {
                        model.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
                    } else {
                        console.error('Invalid initial rotation object:', initialRotation);
                    }

                }

                // Apply initial position to the model (within the wrapper)
                if (initialPosition) {
                    if (initialPosition instanceof THREE.Vector3) {
                        model.position.copy(initialPosition);
                    } else if (initialPosition.x !== undefined && initialPosition.y !== undefined && initialPosition.z !== undefined) {
                        model.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
                    } else {
                        console.error('Invalid initial position object:', initialPosition);
                    }
                }

                resolve(wrapper);
            },
            undefined,
            (error) => reject(`Error loading model: ${error}`)
        );
    });
}


// Update the position & orientation of the models if changed
function _updateModel_pose(type) {
    // Appies same logic for driller, reference, and target models
    const state = modelState[type];
    const model = models[type];

    // Update model if exist
    if (model) {
        // Update orientation if it has changed
        if (state.orientationChanged) {
            model.quaternion.copy(state.orientation);
            state.orientationChanged = false; // Reset flag after updating
        }

        // Update position if it has changed
        if (state.positionChanged) {
            model.position.copy(state.position);
            state.positionChanged = false; // Reset flag after updating
        }
    }
}


// Updates appearance of model, including loading or removing it
function _updateModel_appearance(type) {
    if (type === 'target') {
        _updateTargetAppearance();
        return;
    }

    const state = modelState[type];
    let modelWrapper = models[type];    // Models are actully wrapped in Object3D objects

    // Remove model if exists and shape is set to null
    if (!state.shape) {
        state.shapeChanged = false;
        if (modelWrapper) {
            scene.remove(modelWrapper);
            models[type] = null;
        }
        return;
    }

    // Load new model if shape changed
    if (state.shapeChanged && state.shape) {
        // Reset flag in beginning to avoid multiple calls (async problem)
        state.shapeChanged = false;

        let path, initialRotation;

        // Check if shape is a string or an object holding the variables
        if (typeof state.shape === 'string') {
            path = state.shape;
            initialRotation = null;
        } else {
            ({ path, initialRotation } = state.shape);
        }

        // InitialRotation in state handler is provided in degrees, but Three.js uses radians
        // Convert to radians if provided

        if (initialRotation instanceof THREE.Euler) {
            // Already in radians
        } else if (initialRotation && initialRotation.x !== undefined && initialRotation.y !== undefined && initialRotation.z !== undefined) {
            initialRotation.x = THREE.MathUtils.degToRad(initialRotation.x);
            initialRotation.y = THREE.MathUtils.degToRad(initialRotation.y);
            initialRotation.z = THREE.MathUtils.degToRad(initialRotation.z);
        }


        // Create the model and add it to the scene
        _createModelFromFile(path, { color: state.color || 0xcccccc, initialRotation: initialRotation })
            .then(newWrapper => {
                if (modelWrapper) scene.remove(modelWrapper);
                models[type] = newWrapper;
                scene.add(newWrapper);
                newWrapper.position.copy(state.position);
                newWrapper.quaternion.copy(state.orientation);
                state.colorChanged = false;
            })
            .catch(error => {
                console.error(`Error loading & creating model: ${error}`);
            });
        return;
    }

    // Update color if changed
    if (state.colorChanged && modelWrapper) {
        const color = new THREE.Color(state.color);
        modelWrapper.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material.color.copy(color);
            }
        });
        state.colorChanged = false;
        return;
    }
}


// Updates appearance of target, and creates if it doesn't exist
function _updateTargetAppearance() {
    const state = modelState.target;
    let model = models.target;

    if (!model) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, Constants.TARGET_START_LENGTH, 0)
        ]);
        const color = new THREE.Color(state.color ? state.color : 0xff0000);
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 20
        });
        model = new THREE.Line(geometry, material);
        models.target = model;
        scene.add(model);
    }

    if (state.colorChanged) {
        const color = new THREE.Color(state.color);
        model.material.color.copy(color);
        state.colorChanged = false;
    }
}


// Updates the background appearance
function _updateBackground() {
    const state = modelState.background;
    if (state.colorChanged && state.color) {
        scene.background = new THREE.Color(state.color);
        state.colorChanged = false;
    }
}



//===================================
// UTILITY FUNCTIONS
//===================================

// The coordinate system in Three.js is with Y up, Z out of the screen, and X to the right.
// This is counter-intuitive for many users. The other modules, including UI and microcontroller
// use Z up, Y out of the screen, and X to the right.

// Convert coordinates from common system to Three.js system
export function convertCoordinatesToThreeJS(x, y, z) {
    return new THREE.Vector3(x, z, y);
}

// Convert quaternion from common system to Three.js system
export function convertQuaternionToThreeJS(x, y, z, w) {
    return new THREE.Quaternion(x, z, y, w);
}
