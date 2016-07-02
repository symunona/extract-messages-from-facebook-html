var ProgressBar = require('progress');
var extend = require('util')._extend;
var moment = require('moment');
var momentParseFormat = require('moment-parseformat');
var Promise = require('promise');

var defaultParsingMetaData = function() {
    return {
        /* The language code parsed from settings */
        lang: '',
        userIndex: 1,
        messageIndex: 1,
        messageIdIndex: 1,
        threadIdIndex: 1,
        /* userName: userId */
        userMap: {},
        userIdMap: {},
        /* userName: tread recipiant count */
        userCounts: {},
        /* threadId: usernames[] */
        threadRecipiants: {},
        userName: ''
    };
};

/**
 * Parses messages.htm into javascript format.
 * @returns the array of messages and metadata extracted.
 */
exports.parse = function(messagesRaw, lang, progress) {

    var parsingMetaData = defaultParsingMetaData();
    parsingMetaData.lang = lang;
    parsingMetaData.userName = exports.getNameFromRawMessages(messagesRaw);

    console.log('[parse] Finding threads...');


    var threads = exports.getThreads(messagesRaw);
    var messages = [];

    var bar = new ProgressBar('Parsing threads [:bar] :percent :etas', {
        total: threads.length,
        width: 60
    });
    if (progress) progress.total(threads.length);

    /* Iterate over the threads found. */
    for (var t = 0; t < threads.length; t++) {
        messages = messages.concat(exports.getMessagesFromThread(threads[t], parsingMetaData));
        bar.tick();
        progress.tick();
    }

    return {
        messages: messages,
        parsingMetaData: parsingMetaData
    };
};


/**
 * Parser regulary releasing the main thread in order to 
 * refresh the UI for NWJS. 
 * child_process.fork still does not work, see:
 * https://github.com/nwjs/nw.js/issues/213
 * 
 * @returns {Promise} which will get resolved with the messages.
 */

exports.parsePromise = function(messagesRaw, lang, progress) {

    return new Promise(function(resolve, reject) {
        var parsingMetaData = defaultParsingMetaData();
        parsingMetaData.lang = lang;
        parsingMetaData.userName = exports.getNameFromRawMessages(messagesRaw);

        console.log('[parse] Finding threads...');

        var threads = exports.getThreads(messagesRaw);

        if (progress) progress.total(threads.length);
        var messages = [];

        processNextMessage(0, threads, messages);

        function processNextMessage(t, threads, messages) {
            if (t < threads.length) {
                messages = messages.concat(exports.getMessagesFromThread(threads[t], parsingMetaData));
                if (progress) progress.tick();

                setTimeout(processNextMessage.bind(this, t + 1, threads, messages));
            } else {
                resolve({
                    messages: messages,
                    parsingMetaData: parsingMetaData
                });
            }
        }
    });
};




/**
 * Gets the actual user name from the H1 tag at the top
 * @returns userName
 */
exports.getNameFromRawMessages = function(msg) {
    return msg.match(/<h1>(.*?)<\/h1>/)[1];
};

/**
 * Note: It does not eliminate the closing </div> tag.
 * @returns the array of unprocessed thread strings
 */
exports.getThreads = function(msg) {
    var threads = msg.split('<div class="thread">');
    threads.shift();
    return threads;
};


/**
 * @param parsingMetaData(Object) which contains the language format
 * Parses a raw thread string into a JavaScript object.
 * @returns an array of the messages parsed the following way
 * [
 *  {
 *      toUserId: user id generated from userName
 *      toUserName: user name the message is for
 *      fromUserId: user id the message originates from, generated from userName
 *      fromUserName: user name the message is from
 *      sendDate: [moment string] time of the message sent
 *      length: {integer} message length
 *      message: {string} the message sent
 *  }
 *  ...
 * ]
 * 
 * Note: Saves all the messages in group chats
 * it can be useful for group analysis
 */

exports.getMessagesFromThread = function(thread, parsingMetaData) {

    /* Assuming the thread starts with the list and 
       ends with a new tag and the names are separated by commas 
       
       Here we also want to count which users are in all threads
       to get a list of the likely names of the parsed user.
       
       This is necessary, because we do not have ID's of users
       so we can not simply determine if the user has changed
       it's name in the database file. The ones with the most 
       count are likely to be the user's own names.
       
       We also export the threadId's so later when we analize 
       the thread recipiants, we can make assumptions, that one 
       of the thread recipiants is always the user, this way we
       can automate changed username recognitions. 
       */
    var threadId = parsingMetaData.threadIdIndex++;
    var recipiants = parsingMetaData.threadRecipiants[threadId] =
        thread.substring(0, thread.indexOf('<'))
        .split(',')
        .map(function(e) {
            var userName = e.trim();
            if (!parsingMetaData.userCounts[userName])
                parsingMetaData.userCounts[userName] = 0;
            parsingMetaData.userCounts[userName]++;
            return userName;
        });

    /* Get the messages out splitted by the message class tag */
    var messagesRaw = thread.substring(thread.indexOf('<')).split('<div class="message">');
    var messages = [];


    /* Start from 1 because the first will be an empty string. */
    for (var mi = 1; mi < messagesRaw.length; mi++) {

        var messageEntry = exports.parseRawMessage(messagesRaw[mi], parsingMetaData);

        messageEntry.isPrivate = (recipiants.length <= 2);
        messageEntry.threadId = threadId;

        // /* This is for later */
        // messageEntry.outward = (messageEntry.frmuser == parsingMetaData.name);W

        /* Iterate through all the recipiants. */
        for (var iToUser = 0; iToUser < recipiants.length; iToUser++) {

            /* Filter out the one sending the message */
            if (exports.getUserIdFromName(recipiants[iToUser], parsingMetaData) != messageEntry.fromUserId) {

                /* Keep everything, but change the recipiant and the unique id */
                var cpy = extend({
                    id: parsingMetaData.messageIdIndex++,
                    toUserName: recipiants[iToUser],
                    toUserId: exports.getUserIdFromName(recipiants[iToUser], parsingMetaData)
                }, messageEntry);

                messages.push(cpy);
            }
        }
    }
    return messages;
};


/**
 * Parses a string containing a message in a thread.
 * Also extends parsingMetaData.userMap with username and userId
 * incremented from userIndex with each new user.
 * 
 * Note: determines date format from first date string encounter.
 *  
 * @returns the following JS strucuture:
 * {
 *      messageId: the message ID generated from parsingMetaData, increased 
 *      fromUserId: the sender user's ID determined from parsingMetaData. 
 *                  if not present, creates new entry
 *      fromUserName: the sender's user name
 *      sendDate: [moment string] time of the message sent
 *      length: {integer} message length
 *      message: {string} the message sent
 * }
 */
exports.parseRawMessage = function(rawMessage, parsingMetaData) {

    var userName = exports.firstTagValue('<span class="user">', rawMessage);
    var dateString = exports.firstTagValue('<span class="meta">', rawMessage);
    var message = exports.firstTagValue('<p>', rawMessage);
    var userId = exports.getUserIdFromName(userName, parsingMetaData);
    var parsedDate = exports.parseLocaleFormattedDate(dateString, parsingMetaData);
    var messageIndex = parsingMetaData.messageIndex++;

    return {
        messageId: messageIndex,
        fromUserId: userId,
        fromUserName: userName,
        message: message,
        length: message.length,
        sendDate: parsedDate
    };
};

/**
 * Finds date format if it has not been parsed yet.
 * @returns a moment standardized date format. 
 */

exports.parseLocaleFormattedDate = function(dateString, parsingMetaData) {

    /* Extract the date format if it has not been determined yet. */
    if (!parsingMetaData.dateFormat) {
        moment.locale(parsingMetaData.lang);
        if (parsingMetaData.lang == 'en_US') {
            parsingMetaData.dateFormat = 'dddd, MMMM DD, YYYY [at] h:mma [UTC]ZZ';
        } else {
            parsingMetaData.dateFormat = momentParseFormat(dateString);
        }

        // console.log('Date format from: ', dateString);
        // console.log('Found date format (' + parsingMetaData.lang + '): ', parsingMetaData.dateFormat);
    }
    // console.log(dateString, ' -> ', moment(dateString, parsingMetaData.dateFormat, parsingMetaData.lang).format());

    return moment(dateString, parsingMetaData.dateFormat, parsingMetaData.lang).format();
};

/**
 * @returns a userId from parsingMetaData.userMap. 
 * If userName queried first time, it increments parsingMetaData.userIndex
 * and saves the user into parsingMetaData.userMap
 * Note: names shall be unique. If you have 3 John Smith friends, they
 * better have different names on Facebook. Or you can ask facebook for
 * an API access to pessages.
 */

exports.getUserIdFromName = function(userName, parsingMetaData) {
    var userId = parsingMetaData.userMap[userName];

    if (!userId) {
        userId = parsingMetaData.userMap[userName] = parsingMetaData.userIndex++;
        parsingMetaData.userIdMap[userId] = userName;
    }

    return userId;
};

/** 
 * Searches for the first tag passed in argument and returns with  
 * the content before the next '<' character. 
 * Note: only plain text
 * @returns the string between the tag and the first '<' character  
 */
exports.firstTagValue = function(tag, htmppart) {
    var tmp = htmppart.split(tag)[1];
    return tmp.substring(0, tmp.indexOf('<'));
};