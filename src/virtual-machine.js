let _TextEncoder;
if (typeof TextEncoder === 'undefined') {
    _TextEncoder = import('text-encoding').TextEncoder;
} else {
    /* global TextEncoder */
    _TextEncoder = TextEncoder;
}
import EventEmitter from 'events';

import { Runtime } from './engine/runtime';

import 'canvas-toBlob';

const WorkerMessages = require('./worker/WorkerMessages.js');

const RESERVED_NAMES = ['_mouse_', '_stage_', '_edge_', '_myself_', '_random_'];

const CORE_EXTENSIONS = [
    // 'motion',
    // 'looks',
    // 'sound',
    // 'events',
    // 'control',
    // 'sensing',
    // 'operators',
    // 'variables',
    // 'myBlocks'
];

/**
 * Handles connections between blocks, stage, and extensions.
 * @constructor
 */
export default class VirtualMachine extends EventEmitter {
    constructor () {
        super();

        /**
         * VM runtime, to store blocks, I/O devices, sprites/targets, etc.
         * @type {!Runtime}
         */
        this.runtime = new Runtime();

        this.python_worker = null;
    }

    /**
     * Start running the VM - do this before anything else.
     */
    start () {
        this.runtime.start();
    }

    /**
     * Quit the VM, clearing any handles which might keep the process alive.
     * Do not use the runtime after calling this method. This method is meant for test shutdown.
     */
    quit () {
        this.runtime.quit();
    }

    /**
     * "Green flag" handler - start all threads starting with a green flag.
     */
    greenFlag () {
        this.runtime.greenFlag();
    }

    /**
     * Stop all threads and running activities.
     */
    stopAll () {
        this.runtime.stopAll();
    }

    /**
     * Clear out current running project data.
     */
    clear () {
        this.runtime.dispose();
    }

    /**
     * Set the audio engine for the VM/runtime
     * @param {!AudioEngine} audioEngine The audio engine to attach
     */
    attachAudioEngine (audioEngine) {
        this.runtime.attachAudioEngine(audioEngine);
    }

    /**
     * Set the renderer for the VM/runtime
     * @param {!RenderWebGL} renderer The renderer to attach
     */
    attachRenderer (renderer) {
        this.runtime.attachRenderer(renderer);
    }

    /**
     * @returns {RenderWebGL} The renderer attached to the vm
     */
    get renderer () {
        return this.runtime && this.runtime.renderer;
    }

    /**
     * Set the storage module for the VM/runtime
     * @param {!ScratchStorage} storage The storage module to attach
     */
    attachStorage (storage) {
        this.runtime.attachStorage(storage);
    }

    /**
     * Set the worker for the VM/runtime
     * @param {!Worker} worker The worker to attach
     */
    attachWorker (worker) {
        this.python_worker = worker;
        this.python_worker.addEventListener('message', function (event) {
            this._onWorkerMessage(event.data);
        });
        this.python_worker.postMessage({id: WorkerMessages.FromVM.VMConnected});
    }

    /**
     * Handles a message from the python worker.
     * @param {object} message The message from the worker.
     * @private
     */
    _onWorkerMessage (message) {
        const {id, targetID, op_code, args, token} = message;
        if (id === WorkerMessages.ToVM.BlockOP) {
            returnVal = this.runtime.exec_block_primitive(targetID, op_code, args, token);
            returnVal.then((value) => {
                this._postResultValue(message, value);                
            });
        }
    }

    /**
     * Post a ResultValue message to a worker in reply to a particular message.
     * The outgoing message's reply token will be copied from the provided message.
     * @param {Worker} worker The worker to receive the ResultValue message.
     * @param {Object} message The originating message to which this is a reply.
     * @param {*} value The value to send as a result.
     * @private
     */
    _postResultValue (message, value) {
        this.python_worker.postMessage({id: WorkerMessages.FromVM.ResultValue, value: value, token: message.token});
    }

    // ---------------------------------------------------------------------
    // Linking Python Files
    // ---------------------------------------------------------------------
    
}
