// Angular service module for connecting to JSON APIs
angular.module('pollServices', ['ngResource']).
	factory('Poll', function($resource) {
        return $resource('polls/:pollId', {}, {
			// Use this method for getting a list of polls
			active: { method: 'GET', params: { pollId: 'active' }, isArray: true },
            all: { method: 'GET', params: { pollId: 'all' }, isArray: true }
		})
	}).
    factory('Edit', function($resource) {
        return $resource('edit/:pollId')
    }).
    factory('Result', function($resource) {
        return $resource('result/:pollId')
	}).
    factory('Auth', function($http, $window) {
        var Auth = {};

        Auth.saveToken = function (token) {
            $window.localStorage['pollsapp-token'] = token;
        };

        Auth.getToken = function () {
            return $window.localStorage['pollsapp-token'];
        };

        Auth.isLoggedIn = function() {
            var token = Auth.getToken();

            if(token){
                var payload = JSON.parse($window.atob(token.split('.')[1]));
                return payload.exp > Date.now() / 1000;
            } else {
                return false;
            }
        };

        Auth.currentUser = function() {
            if(Auth.isLoggedIn()){
                var token = Auth.getToken();
                var payload = JSON.parse($window.atob(token.split('.')[1]));

                return payload.username;
            }
        };

        Auth.register = function(user) {
            return $http.post('/register', user).success(function(data) {
                Auth.saveToken(data.token);
            });
        };

        Auth.logIn = function(user) {
            return $http.post('/login', user).success(function(data) {
                Auth.saveToken(data.token);
            });
        };

        Auth.logOut = function() {
            $window.localStorage.removeItem('pollsapp-token');
        };

        return Auth;
    }).
	factory('socket', function($rootScope) {
        var socket = io.connect();
        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                });
            }
        };
	});