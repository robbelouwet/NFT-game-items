//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

library CollectibleUtils {
    struct Tier {
        string name;

        // this should be 0 or at least as small as possible
        // if you set this to 10 for example, you wan't create masks with rarity < 10
        // Also, this acts like a 'label', this doesn't really hold a value,
        uint modulo_target;

        // this should be unique with every tier, acts like an unique ID
        // cannot be 0
        uint rarity;

        // this basically tells how big the buffer should be so that it can hold all the id's of the blueprints of this tier
        // in other words, 2^n-1 needs to be smaller than ItemBlueprint[].length of this tier, see mapping tier_blueprints
        string[] blueprint_names;
    }

    struct ItemBlueprint {
        // How many NFT tokens of this blueprint that should be available
        uint max_supply;
        string name;
    }

    // amount of bits that makes up the default buffer size
    // for holding things like the max supply of a blueprint, max amount
    // of blueprints in a tier
    uint public constant default_buffer_size = 32;
}
