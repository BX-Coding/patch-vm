import safeUid from "../util/safe-uid.mjs";
import BlockUtility from "./block-utility.mjs";
import WorkerMessages from "../worker/worker-messages.mjs";

/**
 * A thread is just a queue of all the block operations requested by the worker
 * @constructor
 */
class Thread {
    /**
     * How rapidly we try to step threads by default, in ms.
     */
    static get THREAD_STEP_INTERVAL() {
        return 1000 / 60;
    }

    constructor(target, script, triggerEventId, triggerEventOption) {
        this.target = target;

        if (target.runtime) {
            this.runtime = target.runtime;
            this.worker = target.runtime.pyatchWorker;
        } else {
            throw new Error("Targets must include a runtime to be used in threads");
        }

        this.status = 0;

        /**
         * A unique ID for this target.
         * @type {string}
         */
        this.id = safeUid();

        this.blockUtility = new BlockUtility(this.target, this.runtime, this);

        this.script = script;
        this.triggerEvent = triggerEventId;
        this.triggerEventOption = triggerEventOption;

        this.loadPromise = this.loadThread(this.script);

        this.interruptThread = false;
        this.running = false;
    }

    async loadThread(script) {
        // Confirm worker is loaded
        await this.runtime.workerLoadPromise;

        // Reset Error Messages
        this.runtime.compileTimeErrors = this.runtime.compileTimeErrors.filter((error) => error.threadId !== this.id);
        this.runtime.runtimeErrors = this.runtime.runtimeErrors.filter((error) => error.threadId !== this.id);

        // Stop the current running thread
        const wasRunning = this.running;
        if (this.running) {
            await this.stopThread();
        }

        const success = await this.worker.loadThread(this.id, script, this.runtime._globalVariables);

        // Restart the thread if it was running
        if (wasRunning) {
            await this.startThread();
        }

        return success;
    }

    async startThread() {
        const success = await this.loadPromise;
        // If the thread is already running, restart it
        if (this.running) {
            await this.stopThread();
        }
        if (success) {
            this.interruptThread = false;
            this.runtime.runtimeErrors = this.runtime.runtimeErrors.filter((error) => error.threadId !== this.id);
            this.running = true;
            await this.worker.startThread(this.id, this.executeBlock);
            this.running = false;
        }
    }

    async stopThread() {
        this.interruptThread = true;
        await this.worker.stopThread(this.id);
        this.running = false;
    }

    async updateThreadScript(script) {
        await this.loadThread(script);
        this.script = script;
    }

    async updateThreadTriggerEvent(triggerEventId) {
        this.triggerEvent = triggerEventId;
    }

    async updateThreadTriggerEventOption(triggerEventOption) {
        this.triggerEventOption = triggerEventOption;
    }

    async executePrimitive(blockFunction, args, util) {
        const tick = async (resolve) => {
            if (this.status === Thread.STATUS_YIELD_TICK || this.status === Thread.STATUS_RUNNING) {
                this.status = Thread.STATUS_RUNNING;
                const result = await blockFunction(args, util);

                if (this.status === Thread.STATUS_YIELD_TICK) {
                    setTimeout(tick.bind(this, resolve), Thread.THREAD_STEP_INTERVAL);
                } else {
                    resolve(result);
                }
            }
        };
        const returnValue = await new Promise(tick);
        return returnValue;
    }

    executeBlock = async (opcode, args) => {
        if (this.interruptThread) {
            return { id: "InterruptThread" };
        }
        this.status = Thread.STATUS_RUNNING;
        const blockFunction = this.runtime.getOpcodeFunction(opcode);
        const result = await this.executePrimitive(blockFunction, args, this.blockUtility);
        return { id: "ResultValue", result };
    };

    done() {
        return this.status === Thread.STATUS_DONE;
    }

    /**
     * Thread status for initialized or running thread.
     * This is the default state for a thread - execution should run normally,
     * stepping from block to block.
     * @const
     */
    static get STATUS_RUNNING() {
        return 0;
    }

    /**
     * Threads are in this state when a primitive is waiting on a promise;
     * execution is paused until the promise changes thread status.
     * @const
     */
    static get STATUS_PROMISE_WAIT() {
        return 1;
    }

    /**
     * Thread status for yield.
     * @const
     */
    static get STATUS_YIELD() {
        return 2;
    }

    /**
     * Thread status for a single-tick yield. This will be cleared when the
     * thread is resumed.
     * @const
     */
    static get STATUS_YIELD_TICK() {
        return 3;
    }

    /**
     * Thread status for a finished/done thread.
     * Thread is in this state when there are no more blocks to execute.
     * @const
     */
    static get STATUS_DONE() {
        return 4;
    }

    /**
     * Thread is done with everything in its block queue
     * Idling waiting for a new message
     * @const
     */
    static get STATUS_IDLE() {
        return 5;
    }

    /**
     * Get the status of this thread.
     */
    getStatus() {
        return this.status;
    }

    /**
     * Set the status of this thread.
     */
    setStatus(newStatus) {
        this.status = newStatus;
    }

    yield() {
        this.setStatus(Thread.STATUS_YIELD);
    }

    yieldTick() {
        this.setStatus(Thread.STATUS_YIELD_TICK);
    }

    endThread() {
        this.setStatus(Thread.STATUS_DONE);
    }
}

export default Thread;
