var fs = require("fs");
var utils = require('./sql-utils');
var SQL = require('sql.js');
var ProgressBar = require('progress');

/**
 * @param messageData {Object[]} array of message objects to be exported
 * @param sqliteDbFilename {string} output file name
 * @param messageTableName {string = 'messages'} the table name to be used 
 * 
 * Saves messageData into a file, given as parameter
 */

exports.exportMessagesToSqliteFile = function(messageData, sqliteDbFilename, messagesTableName) {
    messagesTableName = messagesTableName || 'messages';
    var db = new SQL.Database();
    console.log("[sqlite] exporting...");

    var createTableCommand = utils.createTable(messagesTableName, utils.messageSqLiteType);
    db.exec(createTableCommand);

    console.log("[sqlite] writing out...");
    bulkInsert(db, messageData, messagesTableName, 80);

    var exp = db.export();
    var buffer = new Buffer(exp);
    fs.writeFileSync(sqliteDbFilename, buffer);
    console.log('[sqlite] file saved as `' + sqliteDbFilename + '`');

};

function bulkInsert(db, data, messagesTableName, poolSize) {
    var n = Math.floor(data.length / poolSize);
    var bar = new ProgressBar('[sqlite] writing table [:bar] :percent :etas', {
        total: n,
        width: 60
    });

    for (var i = 0; i < n; i++) {
        var part = data.slice(i * poolSize, (i == n) ? data.length : (i + 1) * poolSize);
        var insertCommand = buildPoolInsert(part, messagesTableName);

        db.run(insertCommand.command, insertCommand.data);
        bar.tick();
    }
}

function buildPoolInsert(messages, messagesTableName) {
    var oneInsert = '(' +
        Object.keys(utils.messageSqLiteType)
        .map(function() {
            return '?';
        }).join(',') + ')';
    var inserts = [];
    for (var i = 0; i < messages.length; i++) {
        inserts.push(oneInsert);
    }
    var flatPart = [];
    for (var p = 0; p < messages.length; p++) {
        for (var key in utils.messageSqLiteType) {
            flatPart.push(messages[p][key]);
        }
    }
    var insertString = inserts.join(',');
    var insertCommand = 'INSERT INTO ' + messagesTableName + ' VALUES ' + insertString;

    return {
        command: insertCommand,
        data: flatPart
    };
}

exports.loadFromDb = function(filename) {

    console.log('[sqlite] init: loading data from file: ', filename);
    var ret = new SQL.Database(fs.readFileSync(filename));
    console.log('[sqlite] file loaded ');
    return ret;
};