const Collectible = artifacts.require('Collectible')
const bundle = require('../bundle').main
const toBN = require('web3').utils.toBN

module.exports = async function (deployer) {
  // first, bundle the root contract with its imports to a new Bundle.sol file
  //await bundle()

  // then deploy that new Bundle.sol file
  await deployer.deploy(Collectible, toBN('100000000000000000')) // 0.1 ether
}
