import RenderedTarget from "./rendered-target.mjs";
import { loadSoundFromAsset } from "../import/load-sound.mjs";
import { loadCostumeFromAsset } from "../import/load-costume.mjs";
import StringUtil from "../util/string-util.mjs";
import StageLayering from "../engine/stage-layering.mjs";

class Sprite {
    /**
     * Sprite to be used on the Scratch stage.
     * All clones of a sprite have shared blocks, shared costumes, shared variables,
     * shared sounds, etc.
     * @param {Runtime} runtime Reference to the runtime.
     * @constructor
     */
    constructor(runtime) {
        this.runtime = runtime;
        /**
         * Human-readable name for this sprite (and all clones).
         * @type {string}
         */
        this.name = "";
        /**
         * List of costumes for this sprite.
         * Each entry is an object, e.g.,
         * {
         *      skinId: 1,
         *      name: "Costume Name",
         *      bitmapResolution: 2,
         *      rotationCenterX: 0,
         *      rotationCenterY: 0
         * }
         * @type {Array.<!Object>}
         */
        this.costumes_ = [];
        /**
         * List of sounds for this sprite.
         */
        this.sounds = [];
        /**
         * List of clones for this sprite, including the original.
         * @type {Array.<!RenderedTarget>}
         */
        this.clones = [];

        this.soundBank = null;
        if (this.runtime && this.runtime.audioEngine) {
            this.soundBank = this.runtime.audioEngine.createBank();
        }
    }

    /**
     * Add an array of costumes, taking care to avoid duplicate names.
     * @param {!Array<object>} costumes Array of objects representing costumes.
     */
    set costumes(costumes) {
        this.costumes_ = [];
        for (const costume of costumes) {
            this.addCostumeAt(costume, this.costumes_.length);
        }
    }

    /**
     * Get full costume list
     * @return {object[]} list of costumes. Note that mutating the returned list will not
     *     mutate the list on the sprite. The sprite list should be mutated by calling
     *     addCostumeAt, deleteCostumeAt, or setting costumes.
     */
    get costumes() {
        return this.costumes_;
    }

    /**
     * Add a costume at the given index, taking care to avoid duplicate names.
     * @param {!object} costumeObject Object representing the costume.
     * @param {!int} index Index at which to add costume
     */
    addCostumeAt(costumeObject, index) {
        if (!costumeObject.name) {
            costumeObject.name = "";
        }
        const usedNames = this.costumes_.map((costume) => costume.name);
        costumeObject.name = StringUtil.unusedName(costumeObject.name, usedNames);
        this.costumes_.splice(index, 0, costumeObject);
    }

    /**
     * Delete a costume by index.
     * @param {number} index Costume index to be deleted
     * @return {?object} The deleted costume
     */
    deleteCostumeAt(index) {
        return this.costumes.splice(index, 1)[0];
    }

    /**
     * Create a clone of this sprite.
     * @param {string=} optLayerGroup Optional layer group the clone's drawable should be added to
     * Defaults to the sprite layer group
     * @returns {!RenderedTarget} Newly created clone.
     */
    createClone(optLayerGroup) {
        const newClone = new RenderedTarget(this, this.runtime);
        newClone.isOriginal = this.clones.length === 0;
        this.clones.push(newClone);
        newClone.initAudio();
        if (newClone.isOriginal) {
            // Default to the sprite layer group if optLayerGroup is not provided
            const layerGroup = typeof optLayerGroup === 'string' ? optLayerGroup : StageLayering.SPRITE_LAYER;
            newClone.initDrawable(layerGroup);
            if (this.runtime) {
                this.runtime.fireTargetWasCreated(newClone);
            }
        } else {
            this.runtime.fireTargetWasCreated(newClone, this.clones[0]);
        }
        return newClone;
    }

    /**
     * Disconnect a clone from this sprite. The clone is unmodified.
     * In particular, the clone's dispose() method is not called.
     * @param {!RenderedTarget} clone - the clone to be removed.
     */
    removeClone(clone) {
        this.runtime.fireTargetWasRemoved(clone);
        const cloneIndex = this.clones.indexOf(clone);
        if (cloneIndex >= 0) {
            this.clones.splice(cloneIndex, 1);
        }
    }

    duplicate() {
        const newSprite = new Sprite(null, this.runtime);

        const allNames = this.runtime.targets.map((t) => t.sprite.name);
        newSprite.name = StringUtil.unusedName(this.name, allNames);

        const assetPromises = [];

        newSprite.costumes = this.costumes_.map((costume) => {
            const newCostume = { ...costume };
            assetPromises.push(loadCostumeFromAsset(newCostume, this.runtime));
            return newCostume;
        });

        newSprite.sounds = this.sounds.map((sound) => {
            const newSound = { ...sound };
            const soundAsset = sound.asset;
            assetPromises.push(loadSoundFromAsset(newSound, soundAsset, this.runtime, newSprite.soundBank));
            return newSound;
        });

        return Promise.all(assetPromises).then(() => newSprite);
    }

    dispose() {
        if (this.soundBank) {
            this.soundBank.dispose();
        }
    }
}

export default Sprite;
