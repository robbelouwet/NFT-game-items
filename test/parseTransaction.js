module.exports.eventPresent = (e, tx) => {
    return tx.logs.some(l => l.event === e)
}

module.exports.getReturnValue = (tx) => {
    console.log(tx)
}