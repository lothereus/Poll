// Controller for the admin section
/*function AdminCtrl() {
    console.log("controller.js:admin");
}

function LoginCtrl() {
    console.log("controller.js:login");
}*/

// Controller for the poll list
function PollListCtrl($scope, Poll) {
    console.log("controller.js:list");
	$scope.polls = Poll.query();
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
		console.dir(data);
		if(data._id === $routeParams.pollId) {
			$scope.poll.choices = data.choices;
			$scope.poll.totalVotes = data.totalVotes;
		}
	});

	$scope.vote = function() {
        console.log("controller.js:scope:vote");
		var pollId = $scope.poll._id,
			choiceId = $scope.poll.userVote;

		if(choiceId) {
			var voteObj = { poll_id: pollId, choice: choiceId };
			socket.emit('send:vote', voteObj);
		} else {
			alert('You must select an option to vote for');
		}
	};
}

// Controller for creating a new poll
function PollNewCtrl($scope, $location, Poll) {
    console.log("controller.js:new");
	// Define an empty poll model object
	$scope.poll = {
		question: '',
		enddate: '',
		choices: [ { text: '' }, { text: '' }, { text: '' }]
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

		// Check that a question was provided
		if(poll.question.length > 0) {
			var choiceCount = 0;

            // Check if date is valid
            if (isValidDate(poll.enddate)) {

                // Loop through the choices, make sure at least two provided
                for(var i = 0, ln = poll.choices.length; i < ln; i++) {
                    var choice = poll.choices[i];

                    if(choice.text.length > 0) {
                        choiceCount++
                    }
                }

                if(choiceCount > 1) {
                    // Create a new poll from the model
                    var newPoll = new Poll(poll);

                    // Call API to save poll to the database
                    newPoll.$save(function(p, resp) {
                        console.log(p+" : "+resp);
                        console.dir(p);
                        console.dir(resp);
                        if(!p.error) {
                            // If there is no error, redirect to the main view
                            $location.path('polls');
                        } else {
                            alert('Impossible de créer un nouveau sondage');
                        }
                    });
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
    if(date == null || !date.isValid() || !date.isAfter(moment())) return false;

    return date.format('YYYY-MM-DD');
}