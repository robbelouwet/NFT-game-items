const Collectible = artifacts.require("./Collectible.sol");
//const Distributor = artifacts.require("./Distributor.sol");

module.exports = async function (deployer) {
	await deployer.deploy(Collectible);
};
