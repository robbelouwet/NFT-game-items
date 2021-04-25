const { assert } = require("chai");

const Collectible = artifacts.require("./Collectible.sol");

let tryCatch = require("./exceptions.js").tryCatch;
let errTypes = require("./exceptions.js").errTypes;
let eventPresent = require('./parseTransaction').eventPresent
let web3 = require('web3')

require("chai").use(require("chai-as-promised")).should();


/**
 * To test these tests, remove the blocknumber from the keccak256 call when hashing the challenge string in mine()
 */
contract("Collectible", () => {
	let collectible;

	describe("Deployment", async () => {
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

	describe("Setup tiers and blueprints testdata", async () => {
		it("Adding 3-8 tiers with buffer 3", async () => {
			// it's cheaper to store the exponent than to later on calculate expensive log2(x) operations
			// tier name, mask length, buffer size for blueprint supply
			await collectible.newTier("normal", 3, 3); //the challenge mask is 2^3-1
			await collectible.newTier("common", 4, 3);
			await collectible.newTier("uncommon", 5, 3);
			await collectible.newTier("Legendary", 7, 3);

			// Exotic tier, odds of 1/256 for mining this tier, this tier can have 8 blueprint items (2**3)
			await collectible.newTier("Exotic", 8, 3);
		});

		it("Add \"Normal\" items", async () => {
			// tier_id, buffer_size, max_supply, name
			await collectible.addTierBlueprint(3, 3, 5, "Sword");
			await collectible.addTierBlueprint(3, 3, 5, "Pickaxe");
			await collectible.addTierBlueprint(3, 3, 5, "Axe");
		})

		it("Add \"Exotic\" blueprints", async () => {
			// tier_id, buffer_size, max_supply, name
			// there can be at most 5 item_id's for each blueprint, so really rare
			await collectible.addTierBlueprint(8, 3, 5, "Flaming Sword"); 
			await collectible.addTierBlueprint(8, 3, 5, "Shadow Dagger");
			await collectible.addTierBlueprint(8, 3, 5, "Nexus");
		})
	})

	describe("Mining", async () => {

		it('Mine nothing => challengeFailed', async () => {
			const _tx = await collectible.mine("a")
			assert.isTrue(eventPresent("challengeFailed", _tx))
		})

		it('Mine a "normal" item => minedSuccessfully', async () => {
			// appelss outputs a hash ending with a 7, which is the target mask of category 'normal', hence we should win
			const _tx = await collectible.mine("appelssssssssss");
			assert.isTrue(eventPresent("minedSuccessfully", _tx))

			//console.log("output_hash: ", output_hash.tx);
		});

		it('Mine another "normal" item, different challenge => minedSuccessfully', async () => {
			// we mine the same tier, but a different item (both challenges result in a hash ending with a 7)
			await collectible.mine("appelsss");
			const _tx = await collectible.mine("appelss");
			assert.isTrue(eventPresent("minedSuccessfully", _tx))

			//console.log("output_hash: ", output_hash.tx);
		});

		it('Mine an "Exotic" item => minedSuccessfully', async () => {
			const _tx = await collectible.mine('aaaaaaaaaaaaaaaaaaaaaa')
			assert.isTrue(eventPresent("minedSuccessfully", _tx))
			//console.log(_tx.tx)
		})

		it("Mine same exact item 2 times => challengeFailed", async () => {
			// "banaa" ends with a 7, so it's a normal tier
			// mine 2 times the exact same challenge
			// should result in mining the exact same item_id 2 times (when excluding the blocknumber from the challenge hash)
			// should return a VMError, which is what we want
			await collectible.mine("banaa");
			const _tx = await collectible.mine("banaa");
			assert.isTrue(eventPresent("challengeFailed", _tx))
		});
	});

	describe("Tiers", async () => {

		it("Adding with mask=0 fails", async () => {
			await tryCatch(
				collectible.newTier("Impossible", 0, 3),
				errTypes.revert
			);
		});

		it("Adding duplicate tier masks fails", async () => {
			await tryCatch(
				collectible.newTier("normal", 3, 3),
				errTypes.revert
			);
		});

		it("Adding duplicate tier names fails", async () => {
			await tryCatch(
				collectible.newTier("normal", 9, 3),
				errTypes.revert
			);
		});

		it("Getting tier items count of nonexistent tier", async () => {
			await tryCatch(collectible.getTierItemsCount(25000), errTypes.revert)
		})
	});

	describe("Blueprints", async () => {

		it("Adding more blueprints than tier buffer can hold => buf size ++", async () => {
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

		it("Getting max supply of nonexistent tier fails", async () => {
			await tryCatch(collectible.getBlueprintMaxSupply(25000, 0), errTypes.revert);
		})

		it("Getting max supply of nonexistent blueprint fails", async () => {
			await tryCatch(collectible.getBlueprintMaxSupply(3, 2500), errTypes.revert);
		})

		it("Adding blueprint with buff size overflowing max supply fails", async () => {
			// tier_id, buffer_size, max_supply, name
			await tryCatch(collectible.addTierBlueprint(3, 3, 1, "Dagger"), errTypes.revert);
		})

		it("Adding existing blueprint fails", async () => {
			await tryCatch(collectible.addTierBlueprint(3, 3, 5, "Sword"), errTypes.revert);
		});
	})

	describe('Integration tests', () => {
		it('Mine & Transfer ')
	})
});
