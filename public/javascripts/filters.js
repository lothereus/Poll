// Angular module, defining filters for the app
angular.
    module('polls').
        filter('moment', function() {
            return function(dateString, format) {
                return moment(dateString).format(format);
            };
        });


