const bundle = require("../bundle").main;
const toBN = require("web3").utils.toBN;

module.exports = async function (deployer) {
	// Bundle the root contract with its imports to a new Bundle.sol file
	// for code verifying purposes
	await bundle();

	// Deploy Bundle.sol
	const bundleContract = artifacts.require("LootBox"); // the artifact itself is LootBox ofcourse
	await deployer.deploy(bundleContract, toBN("100000000000000000")); // 0.1 ether
};
