//SPDX-License-Identifier: MIT
pragma solidity >= 0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Diamond is ERC721 {

    constructor() ERC721("Diamond", "DMD"){
    }

    function mine(string memory challenge) public returns(bytes32) {
        bytes32 output_hash = sha3(challenge);

        _mint(msg.sender, 1);
        return output_hash;
    }
}