// Connect to MongoDB using Mongoose
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/pollsapp');

exports.mongoose = mongoose;


