var AdmZip = require('adm-zip');
var extend = require('util')._extend;
var path = require('path');
var parserUtils = require('./html-message-parse-utils');

/**
 * Gets the language of the ZIP and parses the 
 * threads.
 * @returns the messages and metadata.
 */

exports.parse = function(inputFileName, progress) {

    var messagesRaw = exports.getMessagesRawFromZip(inputFileName);
    var lang = exports.getLanguageOfFacebookArchiveZip(inputFileName);
    var messageData = parserUtils.parse(messagesRaw, lang, progress);

    return messageData;
};

exports.parseAsync = function(inputFileName, progress) {

    var messagesRaw = exports.getMessagesRawFromZip(inputFileName);
    var lang = exports.getLanguageOfFacebookArchiveZip(inputFileName);

    return parserUtils.parsePromise(messagesRaw, lang, progress);
};

/**
 * Determines if the ZIP contains the necessary files for parsing
 * @returns {boolean} 
 */
exports.isFacebookArchiveZip = function(fileName) {
    if (fileName && fileName.substring && fileName.substring(fileName.length - 4) == ".zip") {
        var zip = new AdmZip("./" + fileName);
        var zipEntries = zip.getEntries();

        /* This variable will be increased if we find the right file in the zip */
        var filesNeededFound = 0;

        zipEntries.forEach(function(zipEntry) {
            if (zipEntry.entryName == "index.htm") {
                filesNeededFound++;
            }
            if (zipEntry.entryName == "html/messages.htm") {
                filesNeededFound++;
            }
            if (zipEntry.entryName == "html/settings.htm") {
                filesNeededFound++;
            }
        });
        if (filesNeededFound > 2) {
            return true;
        }
    }
    return false;
};

/**
 * @returns the zip entry as text within a ZIP file if found, otherwise false
 */
exports.getStringFromZipEntryByName = function(zipFileName, entryFileName) {
    var zip = new AdmZip(zipFileName);
    var zipEntries = zip.getEntries();

    for (var i = 0; i < zipEntries.length; i++) {
        var zipEntry = zipEntries[i];
        if (zipEntry.entryName == entryFileName) {
            zip.readAsText(entryFileName);
            return zipEntry.getData().toString('utf8');
        }
    }
    return false;
};



/**
 * @returns a string of the messages DOM part
 */
exports.getMessagesRawFromZip = function(zipFileName) {
    return exports.getStringFromZipEntryByName(zipFileName, "html/messages.htm");
};

/**
 * @returns the user's language setting string, formatted [lang]_[SUBTYPE]
 * i.e.: en_US
 */
exports.getLanguageOfFacebookArchiveZip = function(zipFileName) {

    var settingsRaw = exports.getStringFromZipEntryByName(zipFileName, "html/settings.htm");

    /* This assumes that the language is in the second TD element */
    var lang = settingsRaw.match(/<td>(.*?)<\/td>/)[1];

    return lang;
};

/** 
 * Example: 'facebook-testuser.zip' will return 'testuser'
 * @returns username
 */
exports.getUserNameFromZipFileName = function(zipFileName) {
    var filename = path.basename(zipFileName);
    return filename.substr(9, filename.length - 4 - 9);
};