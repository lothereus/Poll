var mongoose = require('../middle/mongoose');

var UserSchema = new mongoose.Schema({
    username: {type: String, lowercase: true, unique: true},
    hash: String,
    salt: String
});

var crypto = require('crypto');

UserSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
};

UserSchema.methods.validPassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
    return this.hash === hash;
};

var jwt = require('jsonwebtoken');
var secret = require('../config/secret.json').secret;
var authConf = require('../config/auth.json');

UserSchema.methods.generateJWT = function() {
    // set expiration
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + authConf.life);

    return jwt.sign({
        _id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000),
    }, secret);
};

mongoose.model('User', UserSchema);
exports.UserSchema = UserSchema;