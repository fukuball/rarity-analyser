const appRoot = require('app-root-path');
const fs = require('fs');
const request = require('sync-request');

const outputPath = appRoot + '/config/crypto_pochi_collection.json';

if (fs.existsSync(outputPath)) {
    let collectionData = require(outputPath);
    console.log(collectionData.length);
    return;
}


let from = 0;
let total = 732;

fs.appendFileSync(outputPath, "[\n");

for (i = from; i < 732; i++) {
    console.log("Process: #" + i);
    let url = 'https://pochi-mainnet-ontv9.ondigitalocean.app/' + i;
    let res = request('GET', url);
    let data = res.getBody('utf8');
    console.log(data);
    if (i == 732-1) {
        fs.appendFileSync(outputPath, data+"\n");
    } else {
        fs.appendFileSync(outputPath, data+",\n");
    }
}

fs.appendFileSync(outputPath, "]");