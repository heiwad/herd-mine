var mongoose = require('mongoose');

var dbURI = process.env.MONGO_DB || 'mongodb://localhost/herd-mine';


//Mongoose Connection Management

mongoose.connect(dbURI);
mongoose.connection.on('connected', function onConnect () {
    console.log('Mongoose default connection open to ' + dbURI);
});

mongoose.connection.on('error', function onError (err) {
    console.log('Mongoose default connection error: ' + err);
});

mongoose.connection.on('disconnected', function onDisconnected () {
    console.log('Mongoose disconnected');
});

process.on('SIGINT', function onSIGINT () {
    mongoose.connection.close(function onClose() {
	console.log('Mongoose default connection '+
		    'disconnected through app termination');
	process.exit(0);
    });
});


//Import data models

require('./users');
