const Collectible = artifacts.require("Collectible");
const bundle = require('../bundle').main

module.exports = async function (deployer) {
	// first, bundle the root contract with its imports to a new Bundle.sol file
	//await bundle()

	// then deploy that new Bundle.sol file
	await deployer.deploy(Collectible);
};
