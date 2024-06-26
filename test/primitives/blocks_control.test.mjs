import chai from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";

import Runtime from "../../src/engine/runtime.mjs";
import Sprite from "../../src/sprites/sprite.mjs";
import RenderedTarget from "../../src/sprites/rendered-target.mjs";
import Thread from "../../src/engine/thread.mjs";

import extractCallsSpy from "../fixtures/extract-calls-spy.mjs";

chai.use(sinonChai);
const { expect } = chai;

let runtime = null;
let sprite = null;
let target = null;
let sprite2 = null;
let target2 = null;
let spriteClone = null;
let targetClone = null;
let thread = null;
let threadClone = null;
let spy = null;

// before tests, add two sounds and an audio engine
before(async () => {
    runtime = new Runtime();
    sprite = new Sprite(runtime);
    target = new RenderedTarget(sprite, runtime);
    runtime.addTarget(target);
    thread = new Thread(target, () => {});

    sprite2 = new Sprite(null, runtime);
    sprite2.name = "target2";
    target2 = new RenderedTarget(sprite2, runtime);
    target2.id = "target2";
    target2.isOriginal = true;
    runtime.addTarget(target2);

    spriteClone = new Sprite(null, runtime);
    targetClone = new RenderedTarget(spriteClone, runtime);
    targetClone.id = "targetClone";
    targetClone.isOriginal = false;
    runtime.addTarget(targetClone);
    threadClone = new Thread(targetClone, () => {});

    spy = sinon.spy();
});

beforeEach(async () => {
    spy.resetHistory();
});

describe("Runtime Exec Primitives", () => {
    describe("Control Blocks", () => {
        describe("Clone", () => {
            it("Myself", async () => {
                const targetCount = runtime.targets.length;

                const { result } = await thread.executeBlock("control_create_clone_of", { CLONE_OPTION: "myself" }, "test_token");

                expect(result).to.equal(undefined);

                expect(runtime.targets.length).to.equal(targetCount + 1);
            });

            it("Other", async () => {
                const targetCount = runtime.targets.length;

                const { result } = await thread.executeBlock("control_create_clone_of", { CLONE_OPTION: "target2" }, "test_token");

                expect(result).to.equal(undefined);
                expect(runtime.targets.length).to.equal(targetCount + 1);
            });
            /*
            it("Delete", async () => {
                const targetCount = runtime.targets.length;

                const { result } = await threadClone.executeBlock("control_delete_this_clone", { CLONE_OPTION: "target2" }, "test_token");

                expect(result).to.equal(undefined);
                expect(runtime.targets.length).to.equal(targetCount);
            }); */
        });
    });
});
