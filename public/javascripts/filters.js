// Angular module, defining filters for the app
angular
    .module('polls')
        .filter('moment', function() {
            return function(dateString, format) {
                return moment(dateString).format(format);
            };
        })
        .filter('debug', function() {
            return function(input) {
                if (input === '') return 'empty string';
                return input ? input : ('' + input);
            };
        });


