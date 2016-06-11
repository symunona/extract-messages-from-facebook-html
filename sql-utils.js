/**
 * @param tableName {string} name of the table to be created
 * @param columns {string[]} column string parameters (with types!)
 * @returns a CREATE TABLE SQL statement 
 */
exports.createTable = function(tableName, columns) {
    var keys = [];
    for (var key in columns)
        keys.push('`' + key + '` ' + columns[key]);

    return "CREATE TABLE `" + tableName + "` (" + keys.join(',') + ");";
};


exports.messageSqlType = {
    id: 'INT',
    messageId: 'INT',
    fromUserId: 'INT',
    fromUserName: 'VARCHAR(40)',
    toUserId: 'INT',
    toUserName: 'VARCHAR(40)',
    sendDate: 'DATETIME',
    isPrivate: 'INT(1)',
    message: 'TEXT',
    length: 'INT',
};


exports.messageSqLiteType = {
    id: 'INT',
    messageId: 'INT',
    fromUserId: 'INT',
    fromUserName: 'TEXT',
    toUserId: 'INT',
    toUserName: 'TEXT',
    sendDate: 'DATETIME',
    isPrivate: 'INT',
    message: 'TEXT',
    length: 'INT',
};