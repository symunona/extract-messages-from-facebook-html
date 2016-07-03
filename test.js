var utils = require('./zip-utils.js');
var i = 0,
    total = 0;
// console.log(utils.getMessagesRawFromZip('facebook-bendeguzliba.zip'));

/* Get the language of the test file*/
// console.log(utils.getLanguageOfFacebookArchiveZip('facebook-bendeguzliba.zip'));
console.log('starting');
utils.parseAsync('facebook-bendeguzliba_hu.zip', {
    key: 'hu_HU',
    dateformat: 'YYYY. MMMM DD., hh:mm [UTC]ZZ'
        // dateformat: "dddd, MMMM DD, YYYY [at] h:mma [UTC]ZZ"
}, {
    total: function(t) {
        total = t;
    },
    tick: function() {
        console.log('tick', (i++) + ' / ' + total);
    }
}).then(function(result) {
    console.log('done', result);
});