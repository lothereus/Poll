var mongoose = require('../middle/mongoose').mongoose;

// Set moment for date manipulation
var package = require('../package.json');
var moment = require('moment');
moment.locale(package.locale);

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
    maxvote: { type: Number, required: true, default: 1 },
    result: { type: String },
	choices: [choiceSchema]
});

PollSchema.statics.findAll = function (callback) {
    return this.find()
            .sort('enddate')
            .exec(callback);
};

PollSchema.statics.findActive = function (callback) {
    var now = moment().startOf('day').toISOString();
    return this.find()
            .select('question enddate')
            .gte('enddate', now)
            .sort('enddate')
            .exec(callback);
};

mongoose.model('Poll', PollSchema);
exports.PollSchema = PollSchema;