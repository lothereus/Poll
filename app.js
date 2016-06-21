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
//app.get('*', routes.index);

// MongoDB API Routes
app.get('/polls/polls', routes.list);
app.get('/polls/:id', routes.poll);
app.post('/polls', routes.create);
app.post('/vote', routes.vote);

// Admin Section Routes
//app.get('/admin', restrict, routes.admin);
//app.get('/login', routes.login);
//app.post('/login', routes.connect);

function restrict(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Accès refusé !';
        res.redirect('/login');
    }
}

io.sockets.on('connection', routes.vote);

server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});