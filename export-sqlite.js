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

    var createTableCommand = utils.createTable(messagesTableName, utils.messageSqlType);
    db.exec(createTableCommand);

    var insertCommand = "INSERT INTO " + messagesTableName + " VALUES (" + Object.keys(utils.messageSqlType)
        .map(function() {
            return '?';
        }).join(',') + ')';

    var bar = new ProgressBar('[sqlite] writing table [:bar] :percent :etas', {
        total: messageData.length,
        width: 60
    });
    bulkInsert(db, messageData, messagesTableName, 3);

    // for (var i = 0; i < messageData.length; i++) {
    //     var data = [];
    //     for (var k in utils.messageSqlType) {
    //         data.push(messageData[i][k]);
    //     }
    //     db.run(insertCommand, data);
    //     bar.tick();
    // }

    console.log("[sqlite] writing out...");
    var exp = db.export();
    var buffer = new Buffer(exp);
    fs.writeFileSync(sqliteDbFilename, buffer);
    console.log('[sqlite] file saved as `' + sqliteDbFilename + '`');

};

function bulkInsert(db, data, messagesTableName, poolSize) {
    var n = Math.floor(data.length / poolSize);
    for (var i = 0; i < n; i++) {
        var part = data.slice(i * poolSize, (i == n) ? data.length : (i + 1) * poolSize);
        var insertCommand = buildPoolInsert(part, messagesTableName);
        console.log(insertCommand)
        db.run(insertCommand, part);
    }
}

function buildPoolInsert(messages, messagesTableName) {
    var oneInsert = '(' +
        Object.keys(utils.messageSqlType)
        .map(function() {
            return '?';
        }).join(',') + ')';
    var inserts = []
    for (var i = 0; i < messages.length; i++) {
        inserts.push(oneInsert);
    }
    var insertString = '(' + inserts.join(',') + ')';
    var insertCommand = 'INSERT INTO ' + messagesTableName + ' VALUES ' + insertString;

    return insertCommand;
}

exports.loadFromDb = function(filename) {

    console.log('[sqlite] init: loading data from file: ', filename);
    var ret = new SQL.Database(fs.readFileSync(filename));
    console.log('[sqlite] file loaded ');
    return ret;
};