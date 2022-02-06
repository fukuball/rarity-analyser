const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const fs = require('fs');
const request = require('sync-request');

const outputPath = appRoot + '/config/0x0_collection.json';

let collectionData = [];
let existItem = [];
if (fs.existsSync(outputPath)) {
    collectionData = require(outputPath);
    collectionData.forEach(element => {
        existItem.push(element.id); 
    });
}

let from = 1;
let total = 600 + config.collection_id_from;

fs.appendFileSync(outputPath, "[\n");

for (i = from; i < total; i++) {
    console.log("Process: #" + i);
    if (!existItem.includes(i)) {
        let url = 'https://0x0.gg/metadata/0x0DAO/'+i;
        let res = request('GET', url);
        if (res.statusCode == 200) {
            let data = res.getBody('utf8');
            data = JSON.parse(data);
            data['id'] = i;
            data = JSON.stringify(data);
            console.log(data);
            if (i == total-1) {
                fs.appendFileSync(outputPath, data+"\n");
            } else {
                fs.appendFileSync(outputPath, data+",\n");
            }
        }
    }
}

fs.appendFileSync(outputPath, "]");