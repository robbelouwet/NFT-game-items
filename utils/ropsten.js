async function setup_ropsten(
  contract_address = '0x8CF940fc6166db0cD429064F6A689749Ade2A378',
) {
  collectible = await Collectible.at(contract_address)

  // it's cheaper to store the exponent than to later on calculate expensive log2(x) operations
  // tier name, mask length, buffer size for blueprint supply
  await collectible.newTier('normal', 3, 3) //the challenge mask is 2^3-1
  await collectible.newTier('common', 4, 3)
  await collectible.newTier('uncommon', 5, 3)
  await collectible.newTier('Legendary', 7, 3)

  // Exotic tier, odds of 1/256 for mining this tier, this tier can have 8 blueprint items (2**3)
  await collectible.newTier('Exotic', 8, 3)

  // tier_id, buffer_size, max_supply, name
  await collectible.addTierBlueprint(3, 3, 5, 'Sword')
  await collectible.addTierBlueprint(3, 3, 5, 'Pickaxe')
  await collectible.addTierBlueprint(3, 3, 5, 'Axe')

  // tier_id, buffer_size, max_supply, name
  // there can be at most 5 item_id's for each blueprint, so really rare
  await collectible.addTierBlueprint(8, 3, 5, 'Flaming Sword')
  await collectible.addTierBlueprint(8, 3, 5, 'Shadow Dagger')
  await collectible.addTierBlueprint(8, 3, 5, 'Nexus')
}


