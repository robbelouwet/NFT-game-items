const Diamond = artifacts.require("Diamond");

module.exports = function (deployer) {
	deployer.deploy(Diamond);
};
