const { assert } = require('chai')

const Collectible = artifacts.require('Collectible')
require('dotenv').config()
const Web3 = require('web3')
const web3 = new Web3(`http://localhost:7545`)
const toBN = require('web3').utils.toBN

let tryCatch = require('../utils/exceptions.js').tryCatch
let errTypes = require('../utils/exceptions.js').errTypes
let eventPresent = require('../utils/parseTransaction').eventPresent
let generateInput = require('../utils/parseTransaction').generateInput
let bundle = require('../bundle').main

require('chai').use(require('chai-as-promised')).should()
// await web3.eth.sendTransaction({to: accounts[0],from: accounts[6],value: web3.utils.toBN('99000000000000000000')})

/**
 * To test these tests, remove the blocknumber from the keccak256 call when hashing the challenge string in mine()
 */
contract('Collectible', (accounts) => {
  let collectible
  //   describe('Bundling', async () => {
  //     it('Bundle root contract successfully', async () => {
  //       await bundle()
  //     })
  //   })

  describe('Deployment', async () => {
    it('Bundle deployed successfully', async () => {
      collectible = await Collectible.deployed()
      //console.log(collectible);
      const address = collectible.address
      assert.notEqual(address, '')
      assert.notEqual(address, 0x0)
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })
  })

  describe('Setup tiers and blueprints testdata', async () => {
    it('Adding 3-8 tiers with buffer 3', async () => {
      // parameters: name, modulo_target, rarity
      await collectible.new_tier('normal', 0, 2)
      await collectible.new_tier('common', 0, 5)
      await collectible.new_tier('uncommon', 0, 20)
      await collectible.new_tier('Legendary', 0, 50)
      await collectible.new_tier('Exotic', 0, 100)
    })

    it('Add "Normal" items', async () => {
      // parameters: rarity of the tier, name, max instances (max supply)
      await collectible.add_tier_blueprint(2, 'Sword', 5)
      await collectible.add_tier_blueprint(2, 'Pickaxe', 5)
      await collectible.add_tier_blueprint(2, 'Axe', 5)
    })

    it('Add "Common" items', async () => {
      // parameters: rarity of the tier, name, max instances (max supply)
      await collectible.add_tier_blueprint(5, 'Sword', 5)
      await collectible.add_tier_blueprint(5, 'Pickaxe', 5)
      await collectible.add_tier_blueprint(5, 'Axe', 5)
    })

    it('Add "Uncommon" items', async () => {
      // parameters: rarity of the tier, name, max instances (max supply)
      await collectible.add_tier_blueprint(20, 'Sword', 5)
      await collectible.add_tier_blueprint(20, 'Pickaxe', 5)
      await collectible.add_tier_blueprint(20, 'Axe', 5)
    })

    it('Add "Legendary" blueprints', async () => {
      // parameters: rarity of the tier, name, max instances (max supply)
      await collectible.add_tier_blueprint(50, 'Flaming Sword', 10)
      await collectible.add_tier_blueprint(50, 'Shadow Dagger', 10)
      await collectible.add_tier_blueprint(50, 'Nexus', 10)
    })

    it('Add "Exotic" blueprints', async () => {
      // parameters: rarity of the tier, name, max instances (max supply)
      await collectible.add_tier_blueprint(100, 'Flaming Sword', 10)
      await collectible.add_tier_blueprint(100, 'Shadow Dagger', 10)
      await collectible.add_tier_blueprint(100, 'Nexus', 10)
    })
  })

  describe('Mining', async () => {
    it('Mine nothing => challengeFailed', async () => {
      const input = generateInput(51, 1, 1)
      const _tx = await collectible.mine(input)
      //console.log(_tx.tx)
      assert.isTrue(eventPresent('challengeFailed', _tx))
    })

    it('Mine "normal" item => minedSuccessfully', async () => {
      const input = generateInput(4, 2, 1)
      // we mine the same tier, but a different item (both challenges result in a hash ending with a 7)
      const _tx = await collectible.mine(input)
      assert.isTrue(eventPresent('minedSuccessfully', _tx))
    })

    it('Mine another "normal" item, different blueprint => minedSuccessfully', async () => {
      const input = generateInput(4, 1, 1)
      // we mine the same tier, but a different item (both challenges result in a hash ending with a 7)
      const _tx = await collectible.mine(input)
      assert.isTrue(eventPresent('minedSuccessfully', _tx))
    })

    it('Mine an existing blueprint, but different instance => minedSuccessfully', async () => {
      const input = generateInput(4, 1, 2)
      // we mine the same tier, but a different item (both challenges result in a hash ending with a 7)
      const _tx = await collectible.mine(input)
      //console.log(_tx.tx)
      assert.isTrue(eventPresent('minedSuccessfully', _tx))
    })

    it('Mine a "Legendary" item => minedSuccessfully', async () => {
      const input = generateInput(50, 1, 1) // there is a tier with rarity 2, and 4 % 2 equals the tier's modulo target 0
      const _tx = await collectible.mine(input)
      // console.log(_tx.receipt.logs)
      assert.isTrue(eventPresent('minedSuccessfully', _tx))
    })

    // it('Mine an "Exotic" item => minedSuccessfully', async () => {
    // 	const _tx = await collectible.mine(2);
    //   assert.isTrue(eventPresent('minedSuccessfully', _tx))
    //   //console.log(_tx.tx)
    // })

    // it('Mine same exact item 2 times => challengeFailed', async () => {
    //   // "banaa" ends with a 7, so it's a normal tier
    //   // mine 2 times the exact same challenge
    //   // should result in mining the exact same item_id 2 times (when excluding the blocknumber from the challenge hash)
    //   // should return a VMError, which is what we want
    //   await collectible.mine(2)
    // 	const _tx = await collectible.mine(2);
    //   assert.isTrue(eventPresent('challengeFailed', _tx))
    // })
  })

  // describe("Tiers", async () => {

  // 	it("Adding with mask=0 fails", async () => {
  // 		await tryCatch(
  // 			collectible.new_tier("Impossible", 0, 3),
  // 			errTypes.revert
  // 		);
  // 	});

  // 	it("Adding duplicate tier masks fails", async () => {
  // 		await tryCatch(
  // 			collectible.new_tier("normal", 3, 3),
  // 			errTypes.revert
  // 		);
  // 	});

  // 	it("Adding duplicate tier names fails", async () => {
  // 		await tryCatch(
  // 			collectible.new_tier("normal", 9, 3),
  // 			errTypes.revert
  // 		);
  // 	});

  // 	it("Getting tier items count of nonexistent tier", async () => {
  // 		await tryCatch(collectible.get_tier_items_count(25000), errTypes.revert)
  // 	})
  // });

  // describe("Blueprints", async () => {

  // 	it("Adding more blueprints than tier buffer can hold => buf size ++", async () => {
  // 		await collectible.new_tier("Impossible", 1, 1);

  // 		// now we add 3 items, but this tier's blueprint buffer has a size of 1.
  // 		// with 1 bit it can hold 2 id's, not 3
  // 		// a check is implemented, this tier will automatically increase its buffer size
  // 		await collectible.add_tier_blueprints(1, 3, 5, "Sword"); // tier_id, buffer_size, max_supply, name
  // 		await collectible.add_tier_blueprints(1, 3, 5, "Pickaxe");
  // 		await collectible.add_tier_blueprints(1, 3, 5, "Axe");

  // 		// the tier's buffer size should've automatically incremented
  // 		const size = await collectible.getTierBufferSize(1);
  // 		assert.equal(size, 2);
  // 	});

  // 	it("Getting max supply of nonexistent tier fails", async () => {
  // 		await tryCatch(collectible.get_blueprint_max_supply(25000, 0), errTypes.revert);
  // 	})

  // 	it("Getting max supply of nonexistent blueprint fails", async () => {
  // 		await tryCatch(collectible.get_blueprint_max_supply(3, 2500), errTypes.revert);
  // 	})

  // 	it("Adding blueprint with buff size overflowing max supply fails", async () => {
  // 		// tier_id, buffer_size, max_supply, name
  // 		await tryCatch(collectible.add_tier_blueprints(3, 3, 1, "Dagger"), errTypes.revert);
  // 	})

  // 	it("Adding existing blueprint fails", async () => {
  // 		await tryCatch(collectible.add_tier_blueprints(3, 3, 5, "Sword"), errTypes.revert);
  // 	});
  // })

  // describe('Integration tests', () => {
  // 	it('Mine & Transfer ')
  // })

  describe('Buy ticket', async () => {
    it('Buy 1 tickets and receive change back.', async () => {
      const amount = 1
      const balance_before = await web3.eth.getBalance(collectible.address)

      const tx = await collectible.buy_ticket.sendTransaction('appel', amount, {
        from: accounts[0],
        value: toBN('5000000000000000000'), // 2 ETH, should receive 1 back,
      })

      const balance_after = await web3.eth.getBalance(collectible.address)
      const ticket_price = await collectible.get_ticket_price()
      assert.equal(
        parseInt(balance_after),
        parseInt(balance_before) + amount * parseInt(ticket_price),
      )
    })

    it('Pop the only ticket we have', async () => {
      //await Promise.resolve(() => setTimeout(5000))
      const tx = await collectible.pop_ticket(accounts[0])
    })

    it("Pop a ticket we don't have", async () => {
      //await Promise.resolve(() => setTimeout(5000))
      await tryCatch(collectible.pop_ticket(accounts[0]), errTypes.revert)
    })

    it('Buy 2 tickets and receive change back.', async () => {
      const amount = 2
      const balance_before = await web3.eth.getBalance(collectible.address)

      const tx = await collectible.buy_ticket.sendTransaction('appel', amount, {
        from: accounts[0],
        value: toBN('500000000000000000'), // 2 ETH, should receive 1 back,
      })

      const balance_after = await web3.eth.getBalance(collectible.address)
      const ticket_price = await collectible.get_ticket_price()
      assert.equal(
        parseInt(balance_after),
        parseInt(balance_before) + amount * parseInt(ticket_price),
      )
    })

    it('Buy 2 tickets with insufficient funds', async () => {
      const amount = 2
      const tx = async () =>
        await collectible.buy_ticket.sendTransaction('appel', amount, {
          from: accounts[0],
          value: toBN('100000000000000000'),
        })

      await tryCatch(tx(), errTypes.revert)
    })
  })

  describe('Looting', async () => {
    it('First, buy 2 tickets', async () => {
      const _tx = await collectible.buy_ticket('appel', 2, {
        from: accounts[0],
        value: toBN('500000000000000000'),
      })
    })

    it('Loot first time', async () => {
      const _tx = await collectible.loot({
        from: accounts[0],
      })
      console.log('Loot 1: ', _tx.tx)
    })

    it('Loot second time', async () => {
      const _tx = await collectible.loot({
        from: accounts[0],
      })
      console.log('Loot 2: ', _tx.tx)
    })

    it('Loot third time, only 2 tickets => fails', async () => {
      // await tryCatch(
        const _tx = await collectible.loot({
          from: accounts[0],
        })//,
        // errTypes.revert,
      // )
      console.log('Fail loot 3: ', _tx.tx)
    })
  })
})
