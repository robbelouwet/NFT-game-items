const { assert } = require("chai");

const Collectible = artifacts.require("./Collectible.sol");

let tryCatch = require("./exceptions.js").tryCatch;
let errTypes = require("./exceptions.js").errTypes;

require("chai").use(require("chai-as-promised")).should();

contract("Collectible", (accounts) => {
	let collectible;

	describe("deployment", async () => {
		it("collectible deployed successfully", async () => {
			collectible = await Collectible.deployed();
			//console.log(collectible);
			const address = collectible.address;
			assert.notEqual(address, "");
			assert.notEqual(address, 0x0);
			assert.notEqual(address, null);
			assert.notEqual(address, undefined);
		});
	});

	describe("Adding Tiers", async () => {
		it("adding 3-8 with buffer 3", async () => {
			// it's cheaper to store the exponent than to later on calculate expensive log2(x) operations
			await collectible.newTier("normal", 3, 3); //the challenge mask is 2^3-1
			await collectible.newTier("common", 4, 3);
			await collectible.newTier("uncommon", 5, 3);
			await collectible.newTier("Legendary", 7, 3);
			await collectible.newTier("Exotic", 8, 3);
		});

		it("Adding with mask=0 fails", async () => {
			await tryCatch(
				collectible.newTier("Impossible", 0, 3),
				errTypes.revert
			);
		});

		it("adding duplicate tier masks fails", async () => {
			await tryCatch(
				collectible.newTier("normal", 3, 3),
				errTypes.revert
			);
		});

		it("adding duplicate tier names fails", async () => {
			await tryCatch(
				collectible.newTier("normal", 9, 3),
				errTypes.revert
			);
		});

		it("Tier buffer overflow increments buffer size", async () => {
			await collectible.newTier("Impossible", 1, 1);

			// now we add 3 items, but this tier's blueprint buffer has a size of 1.
			// with 1 bit it can hold 2 id's, not 3
			// a check is implemented, this tier will automatically increase its buffer size
			await collectible.addTierBlueprint(1, 3, 5, "Sword"); // tier_id, buffer_size, max_supply, name
			await collectible.addTierBlueprint(1, 3, 5, "Pickaxe");
			await collectible.addTierBlueprint(1, 3, 5, "Axe");

			// the tier's buffer size should've automatically incremented
			const size = await collectible.getTierBufferSize(1);
			assert.equal(size, 2);
		});

		it("Adding blueprints", async () => {
			await collectible.addTierBlueprint(3, 3, 5, "Sword"); // tier_id, blueprint buffer_size, max_supply, name
			await collectible.addTierBlueprint(3, 3, 5, "Pickaxe");
			await collectible.addTierBlueprint(3, 3, 5, "Axe");
		});
	});

	describe("mining", async () => {
		it('mine "normal" successfully', async () => {
			// appelss outputs a hash ending with a 7, which is the target mask of category 'normal', hence we should win
			const output_hash = await collectible.mine("appelssssssssss");

			console.log("output_hash: ", output_hash.tx);
		});

		it('mine "normal" successfully, different challenge', async () => {
			// we mine the same tier, but a different item (both challenges result in a hash ending with a 7)
			await collectible.mine("appelsss");
			const output_hash = await collectible.mine("appelss");

			console.log("output_hash: ", output_hash.tx);
		});

		it("mine same exact item 2 times", async () => {
			// "banaa" ends with a 7, so it's a normal tier
			// mine 2 times the exact same challenge (without blockhash)
			// should result in mining the exact same item_id 2 times
			// should return a VMError
			await collectible.mine("banaa");
			await tryCatch(collectible.mine("banaa"), errTypes.revert);
		});
	});
});
