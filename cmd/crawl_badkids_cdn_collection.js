const appRoot = require('app-root-path');
const fs = require('fs');
const request = require('sync-request');

const inputPath = appRoot + '/config/badkids_collection.json';
const outputPath = appRoot + '/config/badkids_cdn_collection.json';

let collectionData = require(inputPath);

let from = 0;
let total = 8888;

fs.appendFileSync(outputPath, "[\n");

for (i = from; i < total; i++) {
    console.log("Process: #" + i);
    collectionData[i].image = 'https://dvn5vzw9b84p8.cloudfront.net/'+i+'.jpeg';
    let data = JSON.stringify(collectionData[i]);
    if (i == total-1) {
        fs.appendFileSync(outputPath, data+"\n");
    } else {
        fs.appendFileSync(outputPath, data+",\n");
    }
}

fs.appendFileSync(outputPath, "]");