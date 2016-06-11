var mysql = require('mysql');
var sqlUtils = require('./sql-utils');
var ProgressBar = require('progress');
var batchSize = 10;

/** 
 * Exports the message data into an MySQL connection 
 * defined in mysql.config.json
 * 
 */
exports.exportMessages = function(tableName, messageData) {
    config = require('./mysql.config.json');
    var createTableCommand = sqlUtils.createTable(tableName, sqlUtils.messageType);
    var connection = mysql.createConnection(config.db);
    connection.connect();
    console.log('[mysql] exporting table...', messageData.length);
    var bar = new ProgressBar('[mysql] Batch insert [:bar] :percent :etas', {
        total: messageData.length / batchSize,
        width: 60
    });
    connection.query("DROP TABLE IF EXISTS " + tableName + ";", function(err, rows, fields) {
        if (err) throw err;
        connection.query(createTableCommand, function(err, rows, fields) {
            if (err) throw err;

            pool(connection, tableName, messageData, batchSize, bar, function() {
                console.log('');
                console.log('[mysql] exported to mysql! ');
                connection.end();
            });

        });
    });
};

function pool(c, tableName, messageData, batchSize, bar, callback) {
    var endOfData = messageData.length > batchSize ? batchSize : messageData.length;
    var firstPart = messageData.slice(0, endOfData);
    var inserts = generateInsert(tableName, sqlUtils.messageType, firstPart);
    c.query(inserts, function(err, rows, fields) {
        if (messageData.length > batchSize)
            pool(c, tableName, messageData.slice(batchSize, messageData.length), batchSize, bar, callback);
        else {
            callback();
        }
        if (err) throw err;
        bar.tick();

    });
}


function generateInsert(tableName, columns, data) {

    var ret = data.map(function(entry) {
        var ret = [];
        for (var k in columns) {

            if (columns[k].substring(0, 7).toLowerCase() == 'varchar') {
                var cut = parseInt(columns[k].substring(8)) - 1;
                ret.push(mysql.escape(entry[k].substring(0, cut)));
            } else if (columns[k].toLowerCase() == 'text') {
                if (entry[k]) {
                    ret.push(mysql.escape(entry[k]));
                } else {
                    ret.push("''");
                }
            } else if (columns[k].toLowerCase() == 'datetime') {
                ret.push("'" + entry[k] + "'");
            } else if ((typeof entry[k]) == 'number')
                ret.push(entry[k]);
            else if ((typeof entry[k]) == 'boolean')
                ret.push(entry[k] ? 1 : 0);
            else
                ret.push("NULL");
        }
        return "(" + ret.join(",") + ")";
    });

    var columnsWrapped = Object.keys(columns).map(function(e) {
        return "`" + e + "`";
    }).join(',');

    return "INSERT INTO " + tableName + " (" + columnsWrapped + ") VALUES " + ret.join(',');
}