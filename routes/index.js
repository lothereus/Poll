// Set moment for date manipulation
var package = require('../package.json');
var moment = require('moment');
moment.locale(package.locale);

// Connect to MongoDB using Mongoose
var mongoose = require('mongoose');
var db;
db = mongoose.createConnection('localhost', 'pollsapp');

// Get Poll schema and model
var PollSchema = require('../models/Poll.js').PollSchema;
var Poll = db.model('polls', PollSchema);

// Main application view
exports.index = function(req, res) {
    console.log("index.js:index");
	res.render('index');
};

// Admin view
/*
exports.admin = function(req, res) {
    console.log("index.js:admin");
};
*/

// Admin view
/*
exports.login = function(req, res) {
    console.log("index.js:login");
    if (req.body.username && req.body.password) {
        var username = req.body.username;
        var password = req.body.password;

        if(username == 'demo' && password == 'demo') {
            req.session.regenerate(function() {
                req.session.user = username;
                res.redirect('/admin');
            });
        } else {
           res.redirect('login');
        }
    }
};
*/

// JSON API for list of polls
exports.list = function(req, res) {
    console.log("index.js:list");
	// Query Mongo for polls, just get back the question text
	Poll.find({}, 'question enddate', function(error, polls) {
        //console.log("Polls: "+JSON.stringify(polls));
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
			var userVoted = false,
                userChoice,
                totalVotes = 0;

			// Loop through poll choices to determine if user has voted
			// on this poll, and if so, what they selected
			for(c in poll.choices) {
				var choice = poll.choices[c];

				for(v in choice.votes) {
					var vote = choice.votes[v];
					totalVotes++;

					if(vote.ip === ip) {
						userVoted = true;
						userChoice = { _id: choice._id, text: choice.text };
					}
				}
			}

			// Attach info about user's past voting on this poll
			poll.userVoted = userVoted;
			poll.userChoice = userChoice;

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
    //console.log(req);
    //console.log(res);
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
        choices: choices
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

// Socket API for saving a vote
exports.vote = function(socket) {
    console.log("index.js:vote");
	socket.on('send:vote', function(data) {
		var ip = socket.request.connection.remoteAddress.split(':')[3];

		Poll.findById(data.poll_id, function(err, poll) {
			var choice = poll.choices.id(data.choice);
			choice.votes.push({ ip: ip });

			poll.save(function(err, doc) {
				var theDoc = {
					question: doc.question, _id: doc._id, choices: doc.choices,
					userVoted: false, totalVotes: 0
				};

				// Loop through poll choices to determine if user has voted
				// on this poll, and if so, what they selected
				for(var i = 0, ln = doc.choices.length; i < ln; i++) {
					var choice = doc.choices[i];

					for(var j = 0, jLn = choice.votes.length; j < jLn; j++) {
						var vote = choice.votes[j];
						theDoc.totalVotes++;
						theDoc.ip = ip;

						if(vote.ip === ip) {
							theDoc.userVoted = true;
							theDoc.userChoice = { _id: choice._id, text: choice.text };
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