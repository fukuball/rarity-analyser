const appRoot = require('app-root-path');
const fs = require('fs');
const request = require('sync-request');

const outputPath = appRoot + '/config/badkids_collection.json';

/*if (fs.existsSync(outputPath)) {
    let collectionData = require(outputPath);
    console.log(collectionData.length);
    return;
}*/


let from = 0;
let total = 8888;

fs.appendFileSync(outputPath, "[\n");

for (i = from; i < total; i++) {
    console.log("Process: #" + i);
    let url = 'https://gateway.pinata.cloud/ipfs/QmTV8L1G1D4ow9SA5Bnw3XZw7mdLkHo5uYfDsPbRqZqNm2/' + i;
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