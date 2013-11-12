/*

This server allows for users to log in and see infographics
pertaining to their social networks.

*/

var express = require('express')
  , http = require('http')
  , path = require('path')
  , aync = require('async')
  , db = require('./models')
  , ROUTES = require('./routes')
  , fs = require('fs');


var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 8080);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.favicon(path.join(__dirname, 'public/img/favicon.ico')));
app.use(express.logger("dev"));


//Need to define "User" as database model
//Need to include Bcrypt for hashing user passwords
//Set up a SALT that gets saved to the .ENV file


//var passport = require('passport')
//  , LocalStrategy = require('passport-local').Strategy;

//passport.use( new LocalStrategy (
//    function (username, password, done) {
//	User.findOne({username: username}, function (err, user) {
//	    if (err) { return done(err); }
//	    if (!user) {
//		return done(null, false, {message: 'Incorrect username.'} );
//	    }
//	    if (!user.validPassword(password)) {
//		return done(null, false, {message: 'Incorrect password.'} );
//	    }
//
//	    return done(null, user);
//	});
//    }
//));

//app.post('/login', passport.authenticate('local', { successRedirect: '/',
//						    failureRedirect: '/login',
//						    failureFlash: true })
//	);

//The following two lines were added to support sessions via express and passport
app.use(express.cookieParser());
app.use(express.session({ secret: process.env.EXPRESS_SESSION_SECRET }));

//not sure if these are needed either
//app.use(passport.initialize());
//app.use(passport.session());



for (var ii in ROUTES) {
    app.get(ROUTES[ii].path, ROUTES[ii].fn);
}

http.createServer(app).listen(app.get('port'), function () {
    console.log("Listening on " + app.get('port'));
});
