#!/usr/bin / env node

var fs = require("fs");
var utils = require('./zip-utils');
var help = fs.readFileSync('./readme.md', 'utf8');
var sqliteUtils = require('./export-sqlite');
var mysqlUtils = require('./export-mysql');
var languages = JSON.parse(fs.readFileSync(__dirname + '/languages.json'));

if (process.argv.indexOf('--help') > -1 || process.argv.length < 4) {
    console.log(help);
    process.exit();
}
if (process.argv.indexOf('--lang') == -1) {
    console.log('Please specify a language code, for the dates!');
    console.log('Possible codes for now: en_EN, hu_HU');
    console.log(help);
    process.exit();
}

var langKey = process.argv[process.argv.indexOf('--lang') + 1];

var langObject = languages.find(function(l) {
    return l.key == langKey;
});
if (!langObject) {
    console.log('The language you picked is not in the list. Try adding it to languages.json!');
    console.log('(Contributions are more than welcome!)');
    throw new Error('Language not listed');
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

var extractedData = utils.parse(zipfileNameToParse, langObject);

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