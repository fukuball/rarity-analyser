const appRoot = require('app-root-path');
const fs = require('fs');
const request = require('sync-request');

const outputPath = appRoot + '/config/bayc_collection.json';

if (fs.existsSync(outputPath)) {
    let collectionData = require(outputPath);
    console.log(collectionData.length);
    return;
}

/*
let from = 0;

fs.appendFileSync(outputPath, "[\n");

for (i = from; i < 10000; i++) {
    console.log("Process: #" + i);
    let url = 'https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/' + i;
    let res = request('GET', url);
    let data = res.getBody('utf8');
    console.log(data);
    if (i == 9999) {
        fs.appendFileSync(outputPath, data+"\n");
    } else {
        fs.appendFileSync(outputPath, data+",\n");
    }
}

fs.appendFileSync(outputPath, "]");
*/