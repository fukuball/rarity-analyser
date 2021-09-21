const appRoot = require('app-root-path');
const fs = require('fs');
const request = require('sync-request');

const inputPath = appRoot + '/config/cupcats_collection.json';
const outputPath = appRoot + '/config/cupcats_cdn_collection.json';

let collectionData = require(inputPath);

let from = 0;
let total = 5000;

fs.appendFileSync(outputPath, "[\n");

for (i = from; i < total; i++) {
    console.log("Process: #" + i);
    collectionData[i].image = collectionData[i].image.replace('https://gateway.pinata.cloud/ipfs', 'https://dlots8pn0kiq1.cloudfront.net')
    let data = JSON.stringify(collectionData[i]);
    if (i == total-1) {
        fs.appendFileSync(outputPath, data+"\n");
    } else {
        fs.appendFileSync(outputPath, data+",\n");
    }
}

fs.appendFileSync(outputPath, "]");