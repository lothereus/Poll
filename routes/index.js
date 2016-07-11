// Set moment for date manipulation
var package = require('../package.json');
var moment = require('moment');
moment.locale(package.locale);

// Require passport
var passport = require('../middle/passport').passport;
//var secret = require('../secret.json').secret;

// Require JWT
//var jwt = require('express-jwt');
//var auth = jwt({secret: secret, userProperty: 'payload'});

// Connect to MongoDB using Mongoose
var mongoose = require('../middle/mongoose').mongoose;

// Get Poll schema and model
var PollSchema = require('../models/Poll.js').PollSchema;
var Poll = mongoose.model('polls', PollSchema);

// Get User schema and model
var UserSchema = require('../models/User.js').UserSchema;
var User = mongoose.model('users', UserSchema);

// Main application view
exports.index = function(req, res) {
    console.log("index.js:index");
	res.render('index');
};

// JSON API for list of all polls
exports.all = function(req, res) {
    console.log("index.js:all");
	Poll.findAll(function(error, polls) {
        //console.log("Polls: "+JSON.stringify(polls));
		res.json(polls);
	});
};

// JSON API for list of active polls
exports.active = function(req, res) {
    console.log("index.js:active");
    Poll.findActive(function(error, polls) {
        res.json(polls);
    });
};

// JSON API for getting a single poll
exports.poll = function(req, res) {
    console.log("index.js:poll");
    //console.log("ip: "+req._remoteAddress.split(':')[3]);

	// Poll ID comes in the URL
	var pollId = req.params.id;

    // Client Ip comes in the request
    var ip = req._remoteAddress.split(':')[3];

	// Find the poll by its ID, use lean as we won't be changing it
	Poll.findById(pollId, '', { lean: true }, function(err, poll) {
		if(poll) {
			var userNbVotes = 0,
                userChoices = [],
                totalVotes = 0;

			// Loop through poll choices to determine if user has voted
			// on this poll, and if so, what they selected
			for(c in poll.choices) {
				var choice = poll.choices[c];
                poll.choices[c].totalVotes = 0;

				for(v in choice.votes) {
					var vote = choice.votes[v];
                    poll.choices[c].totalVotes++;
					totalVotes++;

					if(vote.ip === ip) {
						userNbVotes++;
						userChoices.push(choice._id);
					}
				}
			}

            poll.choices = sortByKey(poll.choices, 'totalVotes', true);

			// Attach info about user's past voting on this poll
			poll.userNbVotes = userNbVotes;
			poll.userChoices = userChoices;

			poll.totalVotes = totalVotes;

			res.json(poll);
		} else {
			res.json({error:true});
		}
	});
};

// JSON API for getting a single poll
exports.result = function(req, res) {
    console.log("index.js:result");

	// Poll ID comes in the URL
	var pollId = req.params.id;

	// Find the poll by its ID, use lean as we won't be changing it
	Poll.findById(pollId, '', { lean: true }, function(err, poll) {
		if(poll) {
			var totalVotes = 0;

			for(c in poll.choices) {
                poll.choices[c].totalVotes = 0;
				for(v in poll.choices[c].votes) {
					poll.choices[c].totalVotes++;
					totalVotes++;
				}
			}
            poll.choices = sortByKey(poll.choices, 'totalVotes', true);

            if(!poll.result) {
                if(moment(poll.enddate).isBefore(moment(), 'day')) {
                    // Determine the result if the Poll is ended
                    var best = [];
                    for (i = 0; i <= 4; i++) {
                        best.push(poll.choices[i]);
                    }
                    var result = best[Math.floor(Math.random() * best.length)];
                    poll.result = {
                        text: result.text,
                        _id: result._id
                    }
                    Poll.update({_id: poll._id}, {$set: {choices: poll.choices, result: poll.result}}, function(err) {
                        if(err) { throw err; }
                    });
                } else {
                   poll.result = false;
                }
            }

            if(moment(poll.enddate).isBefore(moment(), 'day')) {
                poll.ended = true;
            } else {
                poll.ended = false;
            }

			poll.totalVotes = totalVotes;

			res.json(poll);
		} else {
			res.json({error:true});
		}
	});
};

// JSON API for creating a new poll
exports.create = function(req, res) {
    console.log("index.js:create");

	var reqBody = req.body;

    // Filter out choices with empty text
    var choices = reqBody.choices.filter(function(v) { return v.text != ''; });

    // Filter date
    reqBody.enddate = isValidDate(reqBody.enddate);
    if (!reqBody.enddate) {
        throw 'Error: date is not a valid Date';
    }

    var date = Date.parse(reqBody.enddate);

    // Build up poll object to save
    var pollObj = {
        question: reqBody.question,
        enddate: date,
        choices: choices,
        maxvote: reqBody.maxvote
    };

	// Create poll model from built up poll object
	var poll = new Poll(pollObj);

	// Save poll to DB
	poll.save(function(err, doc) {
		if(err || !doc) {
			throw 'Error: '+err;
		} else {
			res.json(doc);
		}
	});
};

// JSON API for creating a new user
exports.register = function(req, res, next) {
    console.log("index.js:register");

    var reqBody = req.body;

    if(!reqBody.username || !reqBody.password){
        return res.status(400).json({message: 'Please fill out all fields'});
    }

    var user = new User();

    user.username = reqBody.username;
    user.setPassword(reqBody.password);

    user.save(function (err){
        if(err){ return next(err); }
        return res.json({token: user.generateJWT()})
    });
}

// JSON API for logging user
exports.login = function(req, res, next) {
    console.log("index.js:login");

    var reqBody = req.body;

    if(!reqBody.username || !reqBody.password){
        return res.status(400).json({message: 'Please fill out all fields'});
    }

    passport.authenticate('local', function(err, user, info){
        if(err){ return next(err); }

        if(user){
            return res.json({token: user.generateJWT()});
        } else {
            return res.status(401).json(info);
        }
    })(req, res, next);
}

// Socket API for saving a vote
exports.vote = function(socket) {
    console.log("index.js:vote");
	socket.on('send:vote', function(data) {
		var ip = socket.request.connection.remoteAddress.split(':')[3];

		Poll.findById(data.poll_id, function(err, poll) {
            var choice = {};
            for(ch in data.choices) {
                // TO CHECK !
                choice = poll.choices.id(data.choices[ch]);
                if(choice.votes.indexOf({ ip: ip }) == -1) {
                    choice.votes.push({ ip: ip });
                }
            }

            for(c in poll.choices) {
                poll.choices[c].totalVotes = 0;
				for(v in poll.choices[c].votes) {
					poll.choices[c].totalVotes++;
				}
			}
            poll.choices = sortByKey(poll.choices, 'totalVotes', true);

			poll.save(function(err, doc) {
				var theDoc = {
					question: doc.question,
                    _id: doc._id,
                    choices: doc.choices,
                    maxvote: doc.maxvote,
                    enddate: doc.enddate,
					userNbVotes: 0,
                    totalVotes: 0,
                    ip: ip,
                    userChoices: []
				};

				// Loop through poll choices to determine if user has voted
				// on this poll, and if so, what they selected
				for(var i = 0, ln = doc.choices.length; i < ln; i++) {
					var choice = doc.choices[i];

					for(var j = 0, jLn = choice.votes.length; j < jLn; j++) {
						var vote = choice.votes[j];
						theDoc.totalVotes++;

						if(vote.ip === ip) {
							theDoc.userNbVotes++;
							theDoc.userChoices.push(choice._id);
						}
					}
				}

				socket.emit('myvote', theDoc);
				socket.broadcast.emit('vote', theDoc);
			});
		});
	});
};

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
    if(date == null || !date.isValid()) return false;

    return date.format('YYYY-MM-DD');
}

function sortByKey(array, key, revert) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        if(revert) {
            return ((x > y) ? -1 : ((x < y) ? 1 : 0));
        } else {
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        }
    });
}