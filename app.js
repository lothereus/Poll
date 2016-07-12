// main
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

// middle
var favicon = require('serve-favicon');
var logger = require('morgan');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');
var multer = require('multer');
var passport = require('./middle/passport').passport;
var session = require('express-session');

// Set moment for date manipulation
var package = require('./package.json');
var moment = require('moment');
moment.locale(package.locale);

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

app.set('port', 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(favicon(__dirname + '/public/lastwolfplay.ico'));
app.use(logger('dev'));
app.use(methodOverride());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(multer());
app.use(passport.initialize());
app.use(session({
  secret: 'the best witcher',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Handle client ip
app.use(function (req, res, next) {
    console.log('Client IP: '+req._remoteAddress.split(':')[3]);
    next();
});

// Handle Errors gracefully
app.use(function(err, req, res, next) {
	if(!err) return next();
	console.log(err.stack);
	res.json({error: true});
});

// Main App Page
app.get('/', routes.index);

// MongoDB API Routes
app.get('/polls/all', routes.all);
app.get('/polls/active', routes.active);
app.get('/polls/:id', routes.poll);
app.get('/result/:id', routes.result);
app.get('/edit/:id', routes.edit);
app.post('/polls', routes.create);
app.post('/result', routes.create);
app.post('/socket', routes.socket);
app.post('/register', routes.register);
app.post('/login', routes.login);

io.sockets.on('connection', routes.socket);

server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});