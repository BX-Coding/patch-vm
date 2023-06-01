import chai from "chai";
import sinonChai from "sinon-chai";
import Runtime from "../../src/engine/runtime.mjs";
import Sprite from "../../src/sprites/sprite.mjs";
import RenderedTarget from "../../src/sprites/rendered-target.mjs";
import BlockUtility from "../../src/engine/block-utility.mjs";
import Thread from "../../src/engine/thread.mjs";

chai.use(sinonChai);
const { expect } = chai;

let runtime = null;
let sprite = null;
let target = null;
let thread = null;

// before tests, add two sounds and an audio engine
before(async () => {
    runtime = new Runtime();
    sprite = new Sprite(null, runtime);
    target = new RenderedTarget(sprite, runtime);
    runtime.addTarget(target);
    thread = new Thread(target, () => {});
});

describe("Runtime Exec Primitives", () => {
    describe("Sound Blocks", () => {
        it("Play Sound", async () => {
            const returnValue = await thread.executeBlock("sound_play", { SOUND_MENU: "meow" }, "test_token");

            expect(returnValue).to.equal(undefined);
        });

        it("Stop All Sounds", async () => {
            const returnValue = await thread.executeBlock("sound_stopallsounds", {}, "test_token");

            expect(returnValue).to.equal(undefined);
        });

        it("Set Sound Effect To", async () => {
            const returnValue = await thread.executeBlock("sound_seteffectto", { EFFECT: "pitch", VALUE: 120 }, "test_token");

            expect(target.getCustomState("Scratch.sound").effects.pitch).to.equal(120);
            expect(returnValue).to.equal(undefined);
        });

        it("Change Sound Effect By", async () => {
            const returnValue = await thread.executeBlock("sound_changeeffectby", { EFFECT: "pan", VALUE: -50 }, "test_token");

            expect(target.getCustomState("Scratch.sound").effects.pan).to.equal(-50);
            expect(returnValue).to.equal(undefined);
        });

        it("Clear Sound Effects", async () => {
            const retVal1 = await thread.executeBlock("sound_seteffectto", { EFFECT: "pitch", VALUE: 120 }, "test_token");

            expect(target.getCustomState("Scratch.sound").effects.pitch).to.equal(120);

            const retVal2 = await thread.executeBlock("sound_cleareffects", {}, "test_token");

            expect(target.getCustomState("Scratch.sound").effects.pitch).to.equal(0);
            expect(retVal1).to.equal(undefined);
            expect(retVal2).to.equal(undefined);
        });

        it("Set Volume To", async () => {
            const returnValue = await thread.executeBlock("sound_setvolumeto", { VOLUME: 50 }, "test_token");

            expect(target.volume).to.equal(50);
            expect(returnValue).to.equal(undefined);
        });

        it("Change Volume By", async () => {
            const retVal1 = await thread.executeBlock("sound_setvolumeto", { VOLUME: 100 }, "test_token");

            const retVal2 = await thread.executeBlock("sound_changevolumeby", { VOLUME: -40 }, "test_token");

            expect(target.volume).to.equal(60);
            expect(retVal1).to.equal(undefined);
            expect(retVal2).to.equal(undefined);
        });
    });
});
