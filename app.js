#!/usr/bin / env node

var fs = require("fs");
var utils = require('./zip-utils');
var help = fs.readFileSync('./readme.md', 'utf8');
var sqliteUtils = require('./export-sqlite');
var mysqlUtils = require('./export-mysql');

if (process.argv.indexOf('--help') > -1 || process.argv.length < 4) {
    console.log(help);
    process.exit();
}

var zipfileNameToParse = process.argv[2];
var userName = utils.getUserNameFromZipFileName(zipfileNameToParse);
var outputFilename = userName + '.raw';

/* Check if user specified output file name. */
if (process.argv.indexOf('-o') > -1) {
    outputFilename = process.argv[process.argv.indexOf('-o') + 1];
}

if (!utils.isFacebookArchiveZip(zipfileNameToParse)) {
    console.error(zipfileNameToParse + ' is not a valid file.');
    process.exit();
}

var extractedData = utils.parse(zipfileNameToParse);

if (process.argv.indexOf('--mysql') > -1) {
    export_mysql.exportMessages('messages_' + userName, extractedData.messages);
}

if (process.argv.indexOf('--sqlite') > -1) {
    sqliteUtils.exportMessagesToSqliteFile(extractedData.messages, outputFilename + '.sqlite');
}

if (process.argv.indexOf('--json') > -1) {
    var json = JSON.stringify(extractedData);
    fs.writeFileSync(outputFilename + '.json', json);
}