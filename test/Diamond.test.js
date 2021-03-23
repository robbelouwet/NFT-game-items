const { assert } = require("chai");

const Diamond = artifacts.require("./Diamond.sol");

require("chai").use(require("chai-as-promised")).should();

contract("Diamond", (accounts) => {
	let contract;

	describe("deployment", async () => {
		it("deploys successfully", async () => {
			contract = await Diamond.deployed();
			const address = contract.address;
			assert.notEqual(address, "");
			assert.notEqual(address, 0x0);
			assert.notEqual(address, null);
			assert.notEqual(address, undefined);
		});
	});

	describe("mining", async () => {
		it("mines -111", async () => {
			const output_hash = await contract.mine("appel");
			console.log("output_hash: ", output_hash);
		});
	});
});
