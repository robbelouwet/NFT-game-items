/* Copyright (c) 2019 The47 */

// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {CollectibleUtils as ut} from "./utils.sol";

contract Collectible is ERC721 {
    // contract owner
    address owner;

    uint256 ticket_price; // in wei!

    mapping(address => ut.Ticket[]) registry;

    // Keep a mapping of all the tiers by their rarity
    // We also need to store the tier_names and their unique rarity values to quickly iterate
    // over existing tiers.
    mapping(uint256 => ut.Tier) tiers;
    uint256[] tier_rarities;
    string[] tier_names;

    // For every tier rarity, store that tier's blueprints as well
    mapping(uint256 => ut.ItemBlueprint[]) tier_blueprints;

    // all parameters necessary to validate ownership of an item id against the owner's provided challenge string etc.
    event minedSuccessfully(
        address indexed user,
        string challenge,
        uint256 blocknumber,
        string tier_name,
        string blueprint_name,
        uint256 rarity
    );
    event challengeFailed(address indexed user, string message);
    event newOwner(address indexed from, address to);

    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor(uint256 _ticket_price) public ERC721("Collectible", "CLB") {
        owner = msg.sender;
        ticket_price = _ticket_price;
    }

    function loot() public payable {
        bytes32 challenge = pop_ticket(msg.sender);

        // the combined input to hash. Should be challenge string and latest block hash and timestamp
        bytes memory input =
            abi.encodePacked(challenge, blockhash(block.number - 1)); // blockhash commented out for testing

        // hash of the challenge input
        bytes32 hashed_challenge = keccak256(input);

        uint256 int_hash;
        assembly {
            int_hash := shr(0, hashed_challenge)
        }

        mine(int_hash);
    }

    // Wer split up loot() from mine() so we can test easier
    function mine(uint256 challenge) public isOwner {
        bytes32 hashed_challenge;
        assembly {
            hashed_challenge := shr(0, challenge)
        }

        // detect if we match a tier, and which one
        uint256 tier_rarity = find_present_tier(hashed_challenge); // returns mask_bits
        if (tier_rarity == 0) {
            emit challengeFailed(
                msg.sender,
                "Did not crack the challenge with the specified challenge string."
            );
            return;
        }

        // we know the tier, now figure out which blueprint they mined
        uint256 blueprint_id =
            which_tier_blueprint(hashed_challenge, tier_rarity);

        // we know which blueprint, now which exact blueprint instance (aka which blueprint instance id) did they mine?
        uint256 item_id = item_id(hashed_challenge, tier_rarity, blueprint_id);

        if (_exists(item_id)) {
            emit challengeFailed(
                msg.sender,
                "Mined successfully, but item already exists."
            );
            return;
        }

        _safeMint(msg.sender, item_id);

        // emit an event with all necessary information to validate that this user did in fact mine this item_id
        // in other words, validate ownership of this user with the token minted and placed in items mapping (see Collectible.sol)
        //
        // you can re-hash the challenge with block hash and derive the blueprint_id, tier_id and blueprint instance id that matches the token
        emit minedSuccessfully(
            msg.sender,
            "appel",
            block.number,
            tiers[tier_rarity].name,
            tier_blueprints[tiers[tier_rarity].rarity][blueprint_id].name,
            100 // TODO
        );
    }

    /**
     * Returns the global unique ID of the mined item, whether or not it already exists.
     */
    function item_id(
        bytes32 _hash,
        uint256 tier_rarity,
        uint256 blueprint_id
    ) private view returns (uint256) {
        // how many instances hould exist of this blueprint?
        uint256 blueprint_supply =
            get_blueprint_max_supply(tier_rarity, blueprint_id);
        uint256 buff_size = ut.default_buffer_size;

        // Now we want to shift the tier's buffer and blueprint's buffer off memory
        uint256 shifted_hash;
        assembly {
            shifted_hash := shr(buff_size, _hash)
            shifted_hash := shr(buff_size, shifted_hash)
        }

        // now what remains are random bits of the hash which represent the blueprint's instance id
        // so modulo with the blueprint's max supply and we have our id
        uint256 id = shifted_hash % blueprint_supply;

        // now we have the tier, the blueprint id and the blueprint's instance id
        // concatenate them all to form the ultimate item_id or NFT token
        assembly {
            id := shl(buff_size, id)
            id := add(id, blueprint_id)
            id := shl(buff_size, id)
            id := add(id, tier_rarity)
        }

        return id;
    }

    /**
     * Find out if we got lucky and match a tier
     * If we did, extract the tier with the highest rarity in case we match multiple tiers.
     *
     * @return rarest_tier the rarity of the rarest tier that we found in the hash, 0 if there was no tier.
     */
    function find_present_tier(bytes32 _hash) public view returns (uint256) {
        uint256[] memory rarities = get_tier_rarities();
        uint256 rarest_tier;
        for (uint256 i = 0; i < rarities.length; i++) {
            ut.Tier memory tier = tiers[rarities[i]];
            uint256 r = rarities[i];

            bytes32 hash_tier_buffer;
            uint256 offset = 256 - ut.default_buffer_size;
            assembly {
                hash_tier_buffer := shl(offset, _hash)
                hash_tier_buffer := shr(offset, hash_tier_buffer)
            }

            uint256 b_hash_tier_buffer;
            assembly {
                b_hash_tier_buffer := shr(0, hash_tier_buffer)
            }

            require(r != 0, "Cannot perform modulo 0.");
            uint256 modulo = b_hash_tier_buffer % r;
            if (modulo == tier.modulo_target) {
                // if this is the first match, or we match with a tier with higher rarity,
                // then set this new tier as the rarest one
                if (rarest_tier == 0 || tier.rarity > rarest_tier) {
                    rarest_tier = tier.rarity;
                }
            }
        }

        return rarest_tier;
    }

    function which_tier_blueprint(bytes32 _hash, uint256 tier_rarity)
        private
        view
        returns (uint256)
    {
        uint256 size = get_tier_items_count(tier_rarity); // returns 0-based length
        uint256 buffer_size = ut.default_buffer_size;

        // 1 buffer was for tier, and 1 holding the blueprint_id, keep thos 2 buffers on memory
        uint256 left_offset = 256 - 2 * buffer_size;

        // then shift tier off memory
        uint256 right_offset = buffer_size;

        // convert the hash to an int, and shift the mask bits outside the buffer
        uint256 sliced_hash;
        assembly {
            sliced_hash := shl(left_offset, _hash)
            sliced_hash := shr(left_offset, sliced_hash)
            sliced_hash := shr(right_offset, sliced_hash)
        }

        // if we now calculate the hash % amount_items, we should result in a random, existing, item_id
        return sliced_hash % size;
    }

    /**
     * the total oods will be 1 out of 2^(exponent) - 1
     * so if exponent is 3, the total odds of mining this tier is 2^3 - 1 = 1 out of 7
     */
    function new_tier(
        string memory name,
        uint256 modulo_target,
        uint256 rarity
    ) public isOwner {
        add_tier(name, modulo_target, rarity);
    }

    function add_tier(
        string memory name,
        uint256 modulo_target,
        uint256 rarity
    ) private returns (uint256) {
        require(rarity != 0, "A rarity value for a tier cannot be 0.");
        require(tiers[rarity].rarity == 0, "This tier exists.");
        require(
            contains_int(tier_rarities, rarity) == false,
            "This is already a known rarity value"
        );
        require(
            contains_string(tier_names, name) == false,
            "A tier with this name already exists"
        );

        ut.Tier memory tier;
        tier.name = name;
        tier.modulo_target = modulo_target;
        tier.rarity = rarity;

        tiers[rarity] = tier;
        tier_rarities.push(rarity);
        tier_names.push(name);

        return rarity;
    }

    function add_tier_blueprint(
        uint256 tier_rarity,
        string memory name,
        uint256 max_supply
    ) public isOwner {
        require(
            tiers[tier_rarity].rarity != 0,
            "Adding BluePrint to nonexist, uint supply_buffer_size, ent tier!"
        );
        require(
            contains_string(tiers[tier_rarity].blueprint_names, name) == false,
            "A Blueprint with this name already exists in this tier!"
        );

        ut.ItemBlueprint memory bp = ut.ItemBlueprint(max_supply, name);
        tiers[tier_rarity].blueprint_names.push(name);
        tier_blueprints[tier_rarity].push(bp);
    }

    function get_blueprint_max_supply(uint256 tier_rarity, uint256 blueprint_id)
        public
        view
        returns (uint256)
    {
        require(tiers[tier_rarity].rarity != 0, "Tier doesn't exist!");
        require(
            tier_blueprints[tier_rarity].length > blueprint_id,
            "Blueprint ID doesn't exist!"
        );
        return tier_blueprints[tier_rarity][blueprint_id].max_supply;
    }

    function get_tier_items_count(uint256 tier_rarity)
        public
        view
        returns (uint256)
    {
        require(tiers[tier_rarity].rarity != 0, "This tier doesn't exist!");
        require(
            tiers[tier_rarity].rarity == tier_rarity,
            "Something went wrong, tier not indexed by its rarity."
        );
        uint256 size = tier_blueprints[tier_rarity].length;
        require(size != 0, "This tier doesn't have any items!");
        return size;
    }

    function get_tier_rarities() public view returns (uint256[] memory) {
        return tier_rarities;
    }

    function transfer_ownership(address to) public isOwner {
        owner = to;
        emit newOwner(msg.sender, owner);
    }

    function buy_ticket(string memory seed, uint256 amount) public payable {
        require(amount > 0, "specify an amount greater than 0.");
        if (amount * ticket_price > msg.value) {
            revert("Didn't send enough ether");
        }

        uint256 remainder = msg.value - (amount * ticket_price);

        bytes32 latest_seed = keccak256(abi.encodePacked(seed));
        for (uint256 i = 0; i < amount; i++) {
            ut.Ticket memory t = ut.Ticket(block.number + 1, latest_seed);
            registry[msg.sender].push(t);
            latest_seed = keccak256(abi.encodePacked(seed));
        }

        msg.sender.transfer(remainder);
    }

    function pop_ticket(address adr)
        public isOwner
        returns (bytes32 entropy)
    {
        ut.Ticket[] memory arr = registry[adr];

        // require(arr.length > 0 && arr[arr.length-1].block_number != 0,
        // "address doesn't have any tickets."
        // );

        ut.Ticket memory t = arr[arr.length - 1];

        entropy = keccak256(
            abi.encodePacked(t.personal_seed, blockhash(t.block_number))
        );

        registry[adr].pop();
    }

    function get_ticket_price() public view returns (uint256) {
        return ticket_price;
    }

    function contains_string(string[] storage array, string memory target)
        private
        view
        returns (bool)
    {
        for (uint256 index = 0; index < array.length; index++) {
            if (
                keccak256(abi.encodePacked(array[index])) ==
                keccak256(abi.encodePacked(target))
            ) {
                return true;
            }
        }
        return false;
    }

    function contains_int(uint256[] storage array, uint256 target)
        private
        view
        returns (bool)
    {
        bool found;
        for (uint256 index = 0; index < array.length; index++) {
            if (array[index] == target) {
                found = true;
                break;
            }
        }
    }
}
