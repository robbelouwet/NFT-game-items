//SPDX-License-Identifier: MIT
pragma solidity >= 0.6.0 <0.8.0;

library CollectibleUtils {

    struct Item {
        string name;

        uint supply_id; // signifies exatcly which item out of all the copies this is
        uint item_id; // should be the same as its blueprint's item_id
        uint tier_id; // aka mask exponent
    }

    struct Tier {
        uint id;

        // this basically tells how big the buffer should be so that it can hold all the id's of the blueprints of this tier
        // in other words, 2^n-1 needs to be smaller than ItemBlueprint[].length of this tier, see mapping tier_blueprints
        uint item_buffer_size; // amount of bits
        string name; // Diamond or smth
    }

    struct ItemBlueprint {
        // buffer size that that holds enough for the max_supply
        // in other words, 2^supply_buffer_size - 1 > max_supply
        uint supply_buffer_size;
        uint max_supply; // n = size of the buffer, => amount of copies that can exist (max suppl = 2^n-1)
        string name; // "Sword" or smth
    }
}