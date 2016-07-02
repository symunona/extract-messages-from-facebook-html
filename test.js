var utils = require('./zip-utils.js');

// console.log(utils.getMessagesRawFromZip('facebook-bendeguzliba.zip'));

/* Get the language of the test file*/
// console.log(utils.getLanguageOfFacebookArchiveZip('facebook-bendeguzliba.zip'));
console.log('starting');
utils.parseAsync('facebook-test.zip').then(function(result) {
    console.log('done', result);
})