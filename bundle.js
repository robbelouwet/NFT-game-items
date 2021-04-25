const readline = require('readline')
const fs = require('fs');

/**
 * This script replaces import statements with the contents of the imported script recursively
 * This is usefull for having a standalone.sol file including all libraries for uploading to etherscan to verify contract
 */
async function parseFile(currentFilePath){
    var fileString = ""
    const stream = fs.createReadStream(currentFilePath)
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    const importRegex = /^import.*"(.*)"/
    for await (var l of rl) {
        l = filterLines(l)
        const match = importRegex.exec(l)
        if (match) {
            //console.log('at: ', currentFilePath, 'matching: ', match[1])
            //console.log('full path of match: ', getPath(currentFilePath, match[1]), '\n')
            const recursed = await parseFile(getPath(currentFilePath, match[1]))
            fileString += `${recursed}\n\r`
        } else {
            fileString += `${l}\n\r`
        }
    }
   return fileString
}

const getPath = (fp, importst) => {
    if (importst[0] !== '.') {
        return `${process.cwd()}/node_modules/${importst}`
    } else {
        fp = fp.split('/').slice(0, -1).join('/')
        return `${fp}/${importst}`
    }
}


const ignoreRegexes = [
    /^pragma/gm,
    /.*MIT.*/gm,
    /.*The47.*/gm]

const filterLines = (l) => {
    for (var i = 0; i < ignoreRegexes.length; i++) {
        const regex = ignoreRegexes[i]
        const match = regex.exec(l)
        if (match) {
            console.log('filtered: ', match[0])
            return ""
        };
    }
    return l;

}


parseFile('/home/robbe/Desktop/rarity-nft/contracts/Collectible.sol')
    .then((v) => fs.writeFile("Bundle.sol", v, () => console.log('done')))
    .catch((err) => console.log(err))