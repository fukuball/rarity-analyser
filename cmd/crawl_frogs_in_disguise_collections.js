const appRoot = require('app-root-path');
const fs = require('fs');
const request = require('sync-request');

const outputPath = appRoot + '/config/frogs_in_disguise_collection.json';

/*if (fs.existsSync(outputPath)) {
    let collectionData = require(outputPath);
    console.log(collectionData.length);
    return;
}*/


let from = 1120;
let total = 10000;

fs.appendFileSync(outputPath, "[\n");

for (i = from; i < total; i++) {
    console.log("Process: #" + i);
    let url = 'https://ipfs.io/ipfs/QmQmxxuPJbfLcmpZKAxSCRbjsdPkA5Z9rEuez8LbuUiu5f/' + i;
    let res = request('GET', url);
    let data = res.getBody('utf8');
    console.log(data);
    if (i == total-1) {
        fs.appendFileSync(outputPath, data+"\n");
    } else {
        fs.appendFileSync(outputPath, data+",\n");
    }
}

fs.appendFileSync(outputPath, "]");