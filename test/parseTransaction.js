module.exports.eventPresent = (e, tx) => {
    return tx.logs.some(l => l.event === e)
}