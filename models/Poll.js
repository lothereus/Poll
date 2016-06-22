var mongoose = require('../middle/mongoose').mongoose;

// Subdocument schema for votes
var voteSchema = new mongoose.Schema({ ip: 'String' });

// Subdocument schema for poll choices
var choiceSchema = new mongoose.Schema({
	text: String,
	votes: [voteSchema]
});

// Document schema for polls
var PollSchema = new mongoose.Schema({
	question: { type: String, required: true },
	enddate: { type: Date, required: true, min: Date.now },
	choices: [choiceSchema]
});

mongoose.model('Poll', PollSchema);
exports.PollSchema = PollSchema;