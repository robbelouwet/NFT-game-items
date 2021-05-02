const toBN = require('web3').utils.toBN
const fromDecimal = require('web3').utils.fromDecimal

module.exports.eventPresent = (e, _tx) => {
    const res = _tx.logs.some(l => l.event === e)
    if (!res) console.log(_tx.tx)
    return res;
}

module.exports.generateInput = (_tier, _blueprint, _instance) => {
    // because in our contract the default buffer size is 32,
    // we use 2 ** 31 as a base for input buffers, then add our data to it
    const base = toBN(4294967296) // = 2 ** 32
    var input = toBN(0)

    input = (input.add(toBN(_instance))).mul(base)
    input = (input.add(toBN(_blueprint))).mul(base)
    return input.add(toBN(_tier))
}