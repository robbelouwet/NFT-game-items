require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
	networks: {
		ropsten: {
			provider: (_) =>
				new HDWalletProvider(
					process.env.ROPSTEN_MNEMONIC,
					`https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`
					//derivationPath: "m/44'/60'/0'/0/", // = default, maar toon voor learning purposes
					//addressIndex: 0, // = default, pak het eerste address uit de wallet
				),
			network_id: 3,
			gas: 5500000,
			confirmations: 2,
			timeoutBlocks: 200,
			skipDryRun: true,
		},
		geth: {
			host: "localhost",
			port: 8545,
			network_id: 3,
			gas: 4700000,
		},
		development: {
			// host is waar het development network runt
			// dus localhost waar ganache runt op p 7545
			host: "127.0.0.1",
			port: 7545,
			network_id: "*", // Match any network id
			websockets: true
		},
	},
	compilers: {
		solc: {
			version: "0.7.0",
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
};
