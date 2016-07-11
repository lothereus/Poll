// Angular module, defining routes for the app
angular.module('polls', ['pollServices']).
	config(['$routeProvider', function($routeProvider) {
		$routeProvider.
			when('/polls', { templateUrl: 'partials/list.html', controller: PollListCtrl }).
			when('/poll/:pollId', { templateUrl: 'partials/item.html', controller: PollItemCtrl }).
			when('/new', { templateUrl: 'partials/new.html', controller: PollNewCtrl }).
            //when('/register', { templateUrl: 'partials/register.html', controller: PollAuthCtrl }).
            when('/login', { templateUrl: 'partials/login.html', controller: PollAuthCtrl }).
            when('/admin', { templateUrl: 'partials/admin.html', controller: PollAdminCtrl }).
            when('/result/:pollId', { templateUrl: 'partials/result.html', controller: PollResultCtrl }).

			// If invalid route, just redirect to the main list view
			otherwise({ redirectTo: '/polls' });
	}]);