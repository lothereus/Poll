// Controller for the admin section
function PollAdminCtrl($scope, $location, Auth, Poll) {
    console.log("controller.js:admin");
    if(!Auth.isLoggedIn()) {
        console.log("Not logged in, back to home");
        $location.path('polls');
    }
    var polls = Poll.all(function() {
        for(var p = 0, ln = polls.length; p < ln; p++) {
            if(moment(polls[p].enddate).isBefore(moment(), 'day')) {
                polls[p].ended = true;
            } else {
                polls[p].ended = false;
            }
        }
    });
	$scope.polls = polls;
}

// Controller for the NavBar
function PollNavCtrl($scope, Auth) {
    $scope.isLoggedIn = Auth.isLoggedIn;
    $scope.currentUser = Auth.currentUser;
    $scope.logOut = Auth.logOut;
}

// Controller for the admin section
function PollAuthCtrl($scope, $location, Auth) {  //$state
    console.log("controller.js:auth");

    $scope.user = {};

    if(Auth.isLoggedIn()){
        $location.path('polls');
    }

    $scope.register = function() {
        Auth.register($scope.user).error(function(error) {
            $scope.error = error;
        }).then(function() {
            $location.path('polls');
        });
    };

    $scope.logIn = function() {
        Auth.logIn($scope.user).error(function(error) {
            $scope.error = error;
        }).then(function() {
            $location.path('polls');
        });
    };
}

// Controller for the poll list
function PollListCtrl($scope, Poll, Auth) {
    console.log("controller.js:list");
	$scope.polls = Poll.active();
    $scope.isLoggedIn = Auth.isLoggedIn;
}

// Controller for an individual poll
function PollResultCtrl($scope, $routeParams, $location, Result, Auth, Poll) {
    console.log("controller.js:result");
    if(!Auth.isLoggedIn()) {
        console.log("Not logged in, back to home");
        $location.path('polls');
    }
    $scope.poll = Result.get({pollId: $routeParams.pollId});

    $scope.clone = function() {
        var newPoll = new Poll($scope.poll);
        delete newPoll._id;
        if(newPoll.result) {
            for(c in newPoll.choices) {
                if(newPoll.choices[c]._id == newPoll.result._id) {
                    delete newPoll.choices[c];
                }
            }
            delete newPoll.result;
        }
        newPoll.enddate = moment().add(7, 'days');

        // Call API to save poll to the database
        newPoll.$save(function(p, resp) {
            if(!p.error) {
                // If there is no error, redirect to the main view
                $location.path('admin');
            } else {
                alert('Impossible de créer un nouveau sondage');
            }
        });
    };
}

// Controller for the poll edition
function PollEditCtrl($scope, $routeParams, $location, socket, Edit, Auth) {
    console.log("controller.js:edit");
    if(!Auth.isLoggedIn()) {
        console.log("Not logged in, back to home");
        $location.path('polls');
    }
    $scope.poll = Edit.get({pollId: $routeParams.pollId});

    $scope.save = function() {
        console.log("controller.js:edit:save");
        var editObj = {
                poll_id: $scope.poll._id,
                question: $scope.poll.question,
                enddate: null
            };

        if (isValidDate($scope.poll.enddate)) {
            editObj.enddate = $scope.poll.enddate;

            socket.emit('send:save', editObj, function(message) {
                if (message == 'saved') { alert('Modifications sauvegardées'); }
                else { alert("Une erreur s'est produite"); }
                $location.path('polls');
            });
        } else {
            alert('La date saisie est incorrecte');
        }
    }
}

// Controller for an individual poll
function PollItemCtrl($scope, $routeParams, socket, Poll) {
    console.log("controller.js:item");
	$scope.poll = Poll.get({pollId: $routeParams.pollId});

	socket.on('myvote', function(data) {
        console.log("controller.js:myvote");
        console.dir(data);
		if(data._id === $routeParams.pollId) {
			$scope.poll = data;
		}
	});

	socket.on('vote', function(data) {
        console.log("controller.js:vote");
		if(data._id === $routeParams.pollId) {
			$scope.poll.choices = data.choices;
			$scope.poll.totalVotes = data.totalVotes;
		}
	});

	$scope.vote = function() {
        console.log("controller.js:scope:vote");
		var pollId = $scope.poll._id;

        var choices = [];
        if(angular.isArray($scope.poll.userVotes)) {
            choices = $scope.poll.userVotes;
        } else {
			choices = [$scope.poll.userVotes];
        }

        if(choices.length <= $scope.poll.maxvote) {
            if(choices) {
                var voteObj = { poll_id: pollId, choices: choices };
                socket.emit('send:vote', voteObj);
            } else {
                alert('Vous devez sélectionner au moins un choix');
            }
        } else {
            alert('Vous ne pouvez sélectionner que '+$scope.poll.maxvote+' choix');
        }
	};
}

// Controller for creating a new poll
function PollNewCtrl($scope, $location, Auth, Poll) {
    console.log("controller.js:new");
    if(!Auth.isLoggedIn()) {
        console.log("Not logged in, back to home");
        $location.path('polls');
    }

	// Define an empty poll model object
	$scope.poll = {
		question: '',
		enddate: '',
		choices: [ { text: '' }, { text: '' }, { text: '' }],
        maxvote: 0
	};

	// Method to add an additional choice option
	$scope.addChoice = function() {
        console.log("controller.js:addChoice");
		$scope.poll.choices.push({ text: '' });
	};

	// Validate and save the new poll to the database
	$scope.createPoll = function() {
        console.log("controller.js:createPoll");
		var poll = $scope.poll;

        console.dir(poll);

		// Check that a question was provided
		if(poll.question.length > 0) {
			var choiceCount = 0;

            // Check if date is valid
            if(isValidDate(poll.enddate)) {

                // Loop through the choices, make sure at least two provided
                for(var i = 0, ln = poll.choices.length; i < ln; i++) {
                    var choice = poll.choices[i];

                    if(choice.text.length > 0) {
                        choiceCount++
                    }
                }

                if(choiceCount > 1) {
                    // Check max vote
                    if(poll.maxvote > 0) {
                        if(poll.maxvote <= choiceCount) {
                            if(poll.type == 1 || (choiceCount >= 6 && poll.type == 3) || (choiceCount >= 10 && poll.type == 5)) {
                                // Create a new poll from the model
                                var newPoll = new Poll(poll);

                                // Call API to save poll to the database
                                newPoll.$save(function(p, resp) {
                                    if(!p.error) {
                                        // If there is no error, redirect to the main view
                                        $location.path('polls');
                                    } else {
                                        alert('Impossible de créer un nouveau sondage');
                                    }
                                });
                            } else {
                                alert('Le nombre de choix ne correspond pas au type de sondage');
                            }
                        } else {
                            alert('Le nombre maximum de vote ne peux être supérieur au nombre de choix');
                        }
                    } else {
                        alert('Le nombre maximum de vote doit être au minimum de 1');
                    }
                } else {
                    alert('Vous devez saisir au moins 2 choix');
                }
            } else {
                alert('La date saisie est incorrecte');
            }
		} else {
			alert('Vous devez saisir une question');
		}
	};
}

var dateformats = [
                    'DD/MM/YYYY',
                    'MM/DD/YYYY',
                    'YYYY-MM-DD',
                    'D/M/YYYY',
                    'DD/MM/YY',
                    'D/M/YY',
                    'MM-DD-YYYY',
                    'DD-MM-YYYY',
                    'M-D-YY',
                    'D-M-YY',
                    'DD-MM-YY',
                    'MM-DD-YY',
                    'YY-DD-MM',
                    'YY-MM-DD',
                    'YY-D-M',
                    'YY-M-D'
                ];

function isValidDate(datestring) {
    var date = moment(datestring, dateformats, true);
    if(date == null || !date.isValid()) {
        date = moment(datestring);
        if(date == null || !date.isValid()) return false;
    }

    return date.format('YYYY-MM-DD');
}