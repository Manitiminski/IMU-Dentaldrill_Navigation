// microcontroller.js
// Handles microcontroller connection and data processing.
// Triggers events based on data received, and passes data to main module.


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

// Event handler used to communicate with the main module
let eventHandler;

let port;
let reader;
let inputDone;

// DEBUGGING //
// Timed debug logger for data input
const _debugLog_dataInput = Debug.createTimedLogger(1000, '[DATA INPUT]: ');

// Mock data
// const _mockdata = 'Calibration: 3, 3, 0, 2\r';
// const _mockdata = 'Orientation: 4.44, 31.44, -29.94\r';
// const _mockdata = 'Quaternion: 0.9355, 0.2816, -0.2136, -0.0031\r';

// Make some local functions available globally for debugging
// Comment out before deployment !!
// window._microcontroller = {
//     connect: connect,
//     disconnect: disconnect,
//     processData: processData,
//     mockdata: _mockdata
// };



//===================================
// INITIALIZATION
//===================================
export function init(handler) {
    eventHandler = handler;
}


export async function connect(baudRate) {
    // Guard - Close existing connection
    // Should never happen, but just in case
    if (port) {
        await disconnect();
    }

    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: parseInt(baudRate) });

        const decoder = new TextDecoderStream();
        inputDone = port.readable.pipeTo(decoder.writable);

        const transformer = new TransformStream(new LineBreakTransformer());
        const inputStream = decoder.readable.pipeThrough(transformer);

        reader = inputStream.getReader();
        readLoop();

        eventHandler('CONNECTED');
    } catch (error) {
        console.error('Connection error:', error);
        eventHandler('CONNECTION_ERROR', error);
    }
}


export async function disconnect() {
    try {
        // Cancel reader if it exists
        if (reader) {
            await reader.cancel();
            await inputDone.catch(() => { });
            reader = null;
            inputDone = null;
        }

        // Close port if it exists
        if (port) {
            // Just in case, cancel and release locks before closing

            // Handle readable stream
            if (port.readable) {
                await port.readable.cancel();
                if (port.readable.locked) {
                    await port.readable.getReader().releaseLock();
                }
            }

            // Handle writable stream
            if (port.writable) {
                await port.writable.abort();
                if (port.writable.locked) {
                    await port.writable.getWriter().releaseLock();
                }
            }

            // Close port
            await port.close().catch(e => console.warn('Error closing port:', e));
        }
    } catch (error) {
        console.error('Disconnect error:', error);
    } finally {
        port = null;
        eventHandler('DISCONNECTED');
    }
}



async function readLoop() {
    while (true) {
        try {
            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                break;
            }
            if (value) {
                processData(value);
            }
        } catch (error) {
            console.error('Read loop error:', error);
            await disconnect();
            break;
        }
    }
}

function processData(data) {

    //// REGEX ////
    // Regex to match data type and values. Lines are received one after each other.
    // Each line can be one data type with values.
    //
    // Example data:
    // 'Orientation: 226.94, 22.87, 152.81'
    // 'Quaternion: 0.2832, -0.8755, -0.3784, -0.1003'
    // 'Calibration: 3, 3, 0, 2'
    //
    // Regex explanation:
    // First group matches the data type
    // Second group matches digits, minus symbol, commas and spaces, till end of line
    // Thus, ensures all numbers are matched, no matter how many.
    const regex = /^(\w+):\s*([-\d.,\s]+)$/;
    const match = data.match(regex);

    if (match) {
        // Extract data type and values from match
        // First element is always the full match, so skip it
        const [, dataType, valuesString] = match;
        // Split string and convert to numbers
        const values = valuesString.split(',').map(x => +x);

        let dataObj;
        switch (dataType) {
            case 'Orientation':
                //// Apply conversion to obj with correct keys
                //const dataObj = Constants.createDataObject(values, 'BNO055_ADAFRUIT', 'EULER_ANGLES');
                //eventHandler('DATA_RECEIVED_ORIENTATION', dataObj);

                // Do Nothing - Orientation data is not used currently
                break;
            case 'Quaternion':
                dataObj = Constants.createDataObject(values, 'BNO055_ADAFRUIT', 'QUATERNION');
                eventHandler('DATA_RECEIVED_QUATERNION', dataObj);
                break;
            case 'Calibration':
                dataObj = Constants.createDataObject(values, 'BNO055_ADAFRUIT', 'CALIBRATION');
                eventHandler('DATA_RECEIVED_CALIBRATION', dataObj);
                break;
            default:
                eventHandler('DATA_RECEIVED_UNKNOWN', data);
        }
    } else {
        eventHandler('DATA_RECEIVED_UNKNOWN', data);
    }
}



class LineBreakTransformer {
    constructor() {
        this.container = "";
    }

    transform(chunk, controller) {
        this.container += chunk;
        const lines = this.container.split("\n");
        this.container = lines.pop();

        lines.forEach((line) => controller.enqueue(line));
    }

    flush(controller) {
        controller.enqueue(this.chunks);
    }
}