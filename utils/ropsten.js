async function setup_ropsten(
	contract_address = "0x8CF940fc6166db0cD429064F6A689749Ade2A378"
) {
	lootbox = await Lootbox.at(contract_address);

	// it's cheaper to store the exponent than to later on calculate expensive log2(x) operations
	// tier name, mask length, buffer size for blueprint supply
	await lootbox.newTier("normal", 3, 3); //the challenge mask is 2^3-1
	await lootbox.newTier("common", 4, 3);
	await lootbox.newTier("uncommon", 5, 3);
	await lootbox.newTier("Legendary", 7, 3);

	// Exotic tier, odds of 1/256 for mining this tier, this tier can have 8 blueprint items (2**3)
	await lootbox.newTier("Exotic", 8, 3);

	// tier_id, buffer_size, max_supply, name
	await lootbox.addTierBlueprint(3, 3, 5, "Sword");
	await lootbox.addTierBlueprint(3, 3, 5, "Pickaxe");
	await lootbox.addTierBlueprint(3, 3, 5, "Axe");

	// tier_id, buffer_size, max_supply, name
	// there can be at most 5 item_id's for each blueprint, so really rare
	await lootbox.addTierBlueprint(8, 3, 5, "Flaming Sword");
	await lootbox.addTierBlueprint(8, 3, 5, "Shadow Dagger");
	await lootbox.addTierBlueprint(8, 3, 5, "Nexus");
}
