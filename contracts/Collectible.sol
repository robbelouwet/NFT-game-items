/* Copyright (c) 2019 The47 */

//SPDX-License-Identifier: MIT
pragma solidity >= 0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {CollectibleUtils as ut} from "./utils.sol";

contract Collectible is ERC721 {

    // contract owner
    address owner;

    event newOwner(address indexed from, address to);

    // tier_id => Tier
    mapping(uint => ut.Tier) tiers;
    uint[] tier_ids; // [2, 3, ...], means tiers with mask [11, 111, ...]
    string[] tier_names;

    // contains all mined items in circulation.
    // trailing mask bits of the key (item_id) signify the tier
    //
    // item_id => Item
    mapping(uint => ut.Item) items;

    // tier_id => ItemBlueprint[]
    mapping(uint => ut.ItemBlueprint[]) tier_blueprints;

    // all parameters necessary to validate ownership of an item id against the owner's provided challenge string etc.
    event minedSuccessfully(address indexed user, string challenge, uint blocknumber, uint tier_blueprints_buffer_size, uint tier_blueprints, uint blueprint_max_supply);
    event challengeFailed(address indexed user, string message);

    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor() ERC721("Collectible", "CLB"){
        owner = msg.sender;
    }

    /**
     * @param challenge is the challenge string, basically a random input of arbitrary length
     */
    function mine(string memory challenge) public payable {
        // the combined input to hash. Should be challenge string and latest block hash
        bytes memory input = abi.encodePacked(challenge/*,blockhash(block.number-1)*/); // blockhash commented out for testing

        // hash of the challenge input
        bytes32 hashed_challenge = keccak256(input);

        // detect if we match a tier, and which one
        uint tier_id = find_present_tier(hashed_challenge); // returns mask_bits
        if (tier_id == 0x0) {
            emit challengeFailed(msg.sender, "Did not crack the challenge with the specified challenge string.");
            return;
        }

        // we know the tier, now figure out which blueprint they mined
        uint blueprint_id = which_tier_blueprint(hashed_challenge, tier_id);

        // we know which blueprint, now which exact blueprint instance (aka which blueprint instance id) did they mine?
        uint item_id = item_id(hashed_challenge, tier_id, blueprint_id); 

        if (_exists(item_id)) {
            emit challengeFailed(msg.sender, "Mined successfully, but item already exists.");
            return;
        }

        mint(tier_id, blueprint_id, item_id, msg.sender);

        // emit an event with all necessary information to validate that this user did in fact mine this item_id
        // in other words, validate ownership of this user with the token minted and placed in items mapping (see Collectible.sol)
        //
        // you can re-hash the challenge with block hash and derive the blueprint_id, tier_id and blueprint instance id that matches the token
        emit minedSuccessfully(
            msg.sender,
            challenge,
            block.number,
            getTierBPBufferSize(tier_id),
            getTierItemsCount(tier_id),
            getBlueprintMaxSupply(tier_id, blueprint_id)
        );
    }

    /**
     * Returns the global unique ID of the mined item, whether or not it already exists.
     */
    function item_id(bytes32 _hash, uint tier_id, uint blueprint_id) private returns (uint){
        uint blueprint_supply = getBlueprintMaxSupply(tier_id, blueprint_id);
        uint tier_items_buff_size = getTierBPBufferSize(tier_id);

        // shift the tier mask off memory
        uint shift_tier_mask;
        bytes32 bshift_tier_mask;
        assembly {
            shift_tier_mask := shr(tier_id, _hash)
            bshift_tier_mask := shr(tier_id, _hash)
        }

        // now shift the blueprint id buffer off memory
        uint shift_bp_id_buffer;
        bytes32 bshift_bp_id_buffer;
        assembly{
            shift_bp_id_buffer := shr(tier_items_buff_size, shift_tier_mask)
            bshift_bp_id_buffer := shr(tier_items_buff_size, shift_tier_mask)
        }

        // now what remains are random bits of the hash, the least significant bits represent the blueprint instance id
        // so modulo with the blueprint's max supply and we have our id
        uint id = (shift_bp_id_buffer) % blueprint_supply;

        // now we have the tier mask, the blueprint id and the blueprint's instance id
        // concatenate them all to form the ultimate item_id
        uint tier_mask = 2**tier_id-1;
        assembly {
            id := shl(tier_items_buff_size, id)
            id := add(id, blueprint_id)
            id := shl(tier_id, id)
            id := add(id, tier_mask)
        }

        return id;
    }

    /**
     * find out if the hash covers one of the tier masks, if so, return the tier name string.
     */
    function find_present_tier(bytes32 _hash) public view returns (uint longest_mask){
        uint[] memory mask_exps = getMasks();
        longest_mask = 0;
        for (uint256 index = 0; index < mask_exps.length; index++) {
            uint mask = 2**mask_exps[index]-1;
            uint offset = 256 - mask_exps[index];
            bytes32 xored = check_mask(_hash, mask, offset);

            // we don't only want to find a match, we also want the biggest mask that fits
            if (xored == 0x0 && mask_exps[index] > longest_mask) longest_mask = mask_exps[index];
        }
    }

    /**
    This function looks at which blueprint_id is present in the specified hash and tier
     */
    // remeber, item_id INCLUDES the tier's mask
    function which_tier_blueprint(bytes32 _hash, uint tier) private returns (uint){
        uint size = getTierItemsCount(tier); // returns 0-based length

        // convert the hash to an int, and shift the mask bits outside the buffer
        uint _hash_int;
        assembly {_hash_int := shr(tier, _hash)}

        // if we now calculate the hash % amount_items, we should result in a random, existing, item_id
        return _hash_int % size;
    }

    // check if we have a match
    // if we do, by shifting the mask all the way to the start of the reserved 32 byte memory (and shift the hash by the same offset)
    // if we xor those 2 and we result in 0, then the target mask matches the last x bits of the hashed_challenge, and the sender has 'won'
    function check_mask(bytes32 _hash, uint mask, uint mask_length) private pure returns (bytes32 xored) {
        assembly{
            let x := shl(mask_length, _hash)
            let y := shl(mask_length, mask)
            xored := xor(x, y)
        }
    }

    function getItemName(uint blueprint_id, uint tier_id) public view returns (string memory) {
        require(tiers[tier_id].id != 0, "This tier doesn't exist!");
        require(tier_blueprints[tier_id].length >= blueprint_id, "There is no such blueprint in this tier!");

        return tier_blueprints[tier_id][blueprint_id].name;
    }

    /**
     * the total oods will be 1 out of 2^(exponent) - 1
     * so if exponent is 3, the total odds of mining this tier is 2^3 - 1 = 1 out of 7
     */
    function newTier(string memory tier, uint exponent, uint buffer_size) public isOwner {
        addTier(tier, exponent, buffer_size);
    }

    function getTierBPBufferSize(uint tier_id) public returns(uint) {
        require(tier_blueprints[tier_id].length != 0, "Tier doesn't exist!");
        return tiers[tier_id].item_buffer_size;
    }

    function addTier(string memory tier, uint id, uint buffer_size) private returns (uint) {
        require(id >0 && id < 256, "Please specify a number between 0 and 256");
        require(tiers[id].id == 0, "This tier exists and already has a mask.");
        require(contains_int(tier_ids, id) == false, "This is already a known rarity value");
        require(contains_string(tier_names, tier) == false, "A tier with this name already exists");

        ut.Tier memory new_tier;
        new_tier.name = tier;
        new_tier.id = id;
        new_tier.item_buffer_size = buffer_size;

        tiers[id] = new_tier;
        tier_ids.push(id);
        tier_names.push(tier);

        return id;
    }

    function addTierBlueprint(uint tier_id, uint max_supply, uint supply_buffer_size, string memory name) public isOwner{
        require(tiers[tier_id].id != 0, "Adding BluePrint to nonexistent tier!");
        require(2**supply_buffer_size-1 >= max_supply, "Buffer size too small, it must be able to hold *max_supply* id's");
        uint n = tiers[tier_id].item_buffer_size;
        if (2**n-1 <= tier_blueprints[tier_id].length){
            // if we reach the max items that the buffer of this tier can hold, increment buffer size
            tiers[tier_id].item_buffer_size = tiers[tier_id].item_buffer_size + 1;
        }
        ut.ItemBlueprint memory bp = ut.ItemBlueprint(supply_buffer_size, max_supply, name);
        tier_blueprints[tier_id].push(bp);
    }

    function getBlueprintMaxSupply(uint tier_id, uint blueprint_id) public view returns (uint) {        
        require(tier_blueprints[tier_id].length > blueprint_id, "Blueprint ID doesn't exist!");
        return tier_blueprints[tier_id][blueprint_id].max_supply;
    }

    function getTierItemsCount(uint tier_id) public returns (uint){
        require(tiers[tier_id].id != 0, "This tier doesn't exist!");
        return tier_blueprints[tier_id].length;
    }

    function getTierBufferSize(uint tier_id) public view returns(uint) {
        require(tiers[tier_id].id != 0, "Tier doesn't exist!");
        return tiers[tier_id].item_buffer_size;
    }

    function getMasks() public view returns (uint[] memory) {
        return tier_ids;
    }

    function mint(uint tier_id, uint blueprint_id, uint id, address to) public isOwner {
        uint tier_items_buff_size = getTierBPBufferSize(tier_id);
        uint instance_id;
        assembly {
            instance_id := shr(tier_id, id)
            instance_id := shr(tier_items_buff_size, id)
        }

        ut.ItemBlueprint memory bp = tier_blueprints[tier_id][blueprint_id];
        ut.Item memory minted = ut.Item(bp.name, instance_id, blueprint_id, tier_id);
        
        // mint token for winner
        _safeMint(to, id);

        // add newly minted token to circulation
        // mint before saving item, successfully minting represents a guaranteed ownership
        items[id] = minted;
    }

    function transferOwnership(address to) public isOwner {
        owner = to;
        emit newOwner(msg.sender, owner);
    }

    function contains_string(string[] storage array, string memory target) private view returns(bool) {
        for (uint256 index = 0; index < array.length; index++) {
            if (keccak256(abi.encodePacked(array[index])) == keccak256(abi.encodePacked(target))) {
                return true;
            }
        }
        return false;
    }

    function contains_int(uint[] storage array, uint target) private view returns(bool) {
        bool found;
        for (uint256 index = 0; index < array.length; index++) {
            if (array[index] == target) {
                found = true;
                break;
            }
        }
    }
}
