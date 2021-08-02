const { assert } = require("chai");

const LootBox = artifacts.require("LootBox");
require("dotenv").config();
const Web3 = require("web3");
const web3 = new Web3(`http://localhost:7545`);
const toBN = require("web3").utils.toBN;

let tryCatch = require("../utils/exceptions.js").tryCatch;
let errTypes = require("../utils/exceptions.js").errTypes;
let eventPresent = require("../utils/parseTransaction").eventPresent;
let generateInput = require("../utils/parseTransaction").generateInput;

require("chai").use(require("chai-as-promised")).should();

/*
Inteded for testing on Ganache only
*/
contract("Lootbox", (accounts) => {
	let lootbox;

	describe("Deployment", async () => {
		it("Bundle deployed successfully", async () => {
			lootbox = await LootBox.deployed();
			//console.log(collectible);
			const address = lootbox.address;
			assert.notEqual(address, "");
			assert.notEqual(address, 0x0);
			assert.notEqual(address, null);
			assert.notEqual(address, undefined);
		});
	});

	describe("Setup tiers and blueprints testdata", async () => {
		it("Adding 3-8 tiers with buffer 3", async () => {
			// parameters: name, modulo_target, rarity
			await lootbox.addTier("normal", 0, 2);
			await lootbox.addTier("common", 0, 5);
			await lootbox.addTier("uncommon", 0, 20);
			await lootbox.addTier("Legendary", 0, 50);
			await lootbox.addTier("Exotic", 0, 100);
		});

		it('Add "Normal" items', async () => {
			// parameters: rarity of the tier, name, max instances (max supply)
			await lootbox.addBlueprint(2, "Sword", 5);
			await lootbox.addBlueprint(2, "Pickaxe", 5);
			await lootbox.addBlueprint(2, "Axe", 5);
		});

		it('Add "Common" items', async () => {
			// parameters: rarity of the tier, name, max instances (max supply)
			await lootbox.addBlueprint(5, "Sword", 5);
			await lootbox.addBlueprint(5, "Pickaxe", 5);
			await lootbox.addBlueprint(5, "Axe", 5);
		});

		it('Add "Uncommon" items', async () => {
			// parameters: rarity of the tier, name, max instances (max supply)
			await lootbox.addBlueprint(20, "Sword", 5);
			await lootbox.addBlueprint(20, "Pickaxe", 5);
			await lootbox.addBlueprint(20, "Axe", 5);
		});

		it('Add "Legendary" blueprints', async () => {
			// parameters: rarity of the tier, name, max instances (max supply)
			await lootbox.addBlueprint(50, "Flaming Sword", 10);
			await lootbox.addBlueprint(50, "Shadow Dagger", 10);
			await lootbox.addBlueprint(50, "Nexus", 10);
		});

		it('Add "Exotic" blueprints', async () => {
			// parameters: rarity of the tier, name, max instances (max supply)
			await lootbox.addBlueprint(100, "Flaming Sword", 10);
			await lootbox.addBlueprint(100, "Shadow Dagger", 10);
			await lootbox.addBlueprint(100, "Nexus", 10);
		});
	});

	describe("Mining", async () => {
		it("Mine nothing => challengeFailed", async () => {
			const input = generateInput(51, 1, 1);
			const _tx = await lootbox.mine(input);
			//console.log(_tx.tx)
			assert.isTrue(eventPresent("challengeFailed", _tx));
		});

		it('Mine "normal" item => minedSuccessfully', async () => {
			const input = generateInput(4, 2, 1);
			// we mine the same tier, but a different item (both challenges result in a hash ending with a 7)
			const _tx = await lootbox.mine(input);
			assert.isTrue(eventPresent("minedSuccessfully", _tx));
		});

		it('Mine another "normal" item, different blueprint => minedSuccessfully', async () => {
			const input = generateInput(4, 1, 1);
			// we mine the same tier, but a different item (both challenges result in a hash ending with a 7)
			const _tx = await lootbox.mine(input);
			assert.isTrue(eventPresent("minedSuccessfully", _tx));
		});

		it("Mine an existing blueprint, but different instance => minedSuccessfully", async () => {
			const input = generateInput(4, 1, 2);
			// we mine the same tier, but a different item (both challenges result in a hash ending with a 7)
			const _tx = await lootbox.mine(input);
			//console.log(_tx.tx)
			assert.isTrue(eventPresent("minedSuccessfully", _tx));
		});

		it('Mine a "Legendary" item => minedSuccessfully', async () => {
			const input = generateInput(50, 1, 1); // there is a tier with rarity 2, and 4 % 2 equals the tier's modulo target 0
			const _tx = await lootbox.mine(input);
			// console.log(_tx.receipt.logs)
			assert.isTrue(eventPresent("minedSuccessfully", _tx));
		});

		it('Mine an "Exotic" item => minedSuccessfully', async () => {
			const input = generateInput(100, 1, 1);
			const _tx = await lootbox.mine(input);
			assert.isTrue(eventPresent("minedSuccessfully", _tx));
			//console.log(_tx.tx)
		});

		it("Mine same exact item 2 times => challengeFailed", async () => {
			const input = generateInput(100, 1, 2);
			await lootbox.mine(input);
			const _tx = await lootbox.mine(input);
			assert.isTrue(eventPresent("challengeFailed", _tx));
		});
	});

	describe("Tiers", async () => {
		it("Adding with rarity=0 fails", async () => {
			await tryCatch(
				lootbox.addTier("Impossible", 0, 0),
				errTypes.revert
			);
		});

		it("Adding duplicate tier masks fails", async () => {
			await tryCatch(lootbox.addTier("normal", 0, 2), errTypes.revert);
		});

		it("Adding duplicate tier names fails", async () => {
			await tryCatch(lootbox.addTier("normal", 9, 3), errTypes.revert);
		});

		it("Getting tier items count of nonexistent tier", async () => {
			await tryCatch(
				lootbox.getTierBlueprintCount(25000),
				errTypes.revert
			);
		});
	});

	describe("Blueprints", async () => {
		it("Getting max supply of nonexistent tier fails", async () => {
			await tryCatch(
				lootbox.getBlueprintMaxSupply(25000, 0),
				errTypes.revert
			);
		});
		it("Getting max supply of nonexistent blueprint fails", async () => {
			await tryCatch(
				lootbox.getBlueprintMaxSupply(3, 2500),
				errTypes.revert
			);
		});
		it("Adding blueprint with buff size overflowing max supply fails", async () => {
			// tier_id, buffer_size, max_supply, name
			await tryCatch(
				lootbox.addBlueprint(3, "Dagger", 3),
				errTypes.revert
			);
		});
		it("Adding existing blueprint fails", async () => {
			await tryCatch(
				lootbox.addBlueprint(5, "Sword", 5),
				errTypes.revert
			);
		});
	});

	describe("Buy ticket", async () => {
		it("Buy 1 tickets and receive change back.", async () => {
			const amount = 1;
			const balance_before = await web3.eth.getBalance(lootbox.address);

			const tx = await lootbox.buyTicket.sendTransaction(
				"appel",
				amount,
				{
					from: accounts[0],
					value: toBN("5000000000000000000"), // 2 ETH, should receive 1 back,
				}
			);

			const balance_after = await web3.eth.getBalance(lootbox.address);
			const ticket_price = await lootbox.getTicketPrice();
			assert.equal(
				parseInt(balance_after),
				parseInt(balance_before) + amount * parseInt(ticket_price)
			);
		});

		it("Pop the only ticket we have", async () => {
			//await Promise.resolve(() => setTimeout(5000))
			const tx = await lootbox.popTicket(accounts[0]);
		});

		it("Pop a ticket we don't have", async () => {
			//await Promise.resolve(() => setTimeout(5000))
			await tryCatch(lootbox.popTicket(accounts[0]), errTypes.revert);
		});

		it("Buy 2 tickets with insufficient funds", async () => {
			const amount = 2;
			const tx = async () =>
				await lootbox.buyTicket.sendTransaction("appel", amount, {
					from: accounts[0],
					value: toBN("100000000000000000"),
				});

			await tryCatch(tx(), errTypes.revert);
		});
	});

	describe("Looting", async () => {
		it("First, buy 2 tickets and receive change back.", async () => {
			const amount = 2;
			const balance_before = await web3.eth.getBalance(lootbox.address);

			const tx = await lootbox.buyTicket.sendTransaction(
				"appel",
				amount,
				{
					from: accounts[0],
					value: toBN("500000000000000000"), // 2 ETH, should receive 1 back,
				}
			);

			const balance_after = await web3.eth.getBalance(lootbox.address);
			const ticket_price = await lootbox.getTicketPrice();
			assert.equal(
				parseInt(balance_after),
				parseInt(balance_before) + amount * parseInt(ticket_price)
			);
		});

		it("Loot first ticket", async () => {
			const _tx = await lootbox.loot({
				from: accounts[0],
			});
			// console.log("Loot 1: ", _tx.tx);
		});

		it("Loot second ticket", async () => {
			const _tx = await lootbox.loot({
				from: accounts[0],
			});
			// console.log("Loot 2: ", _tx.tx);
		});

		it("Loot third nonexistent ticket => fails", async () => {
			await tryCatch(
				lootbox.loot({
					from: accounts[0],
				}),
				errTypes.revert
			);
		});
	});
});
