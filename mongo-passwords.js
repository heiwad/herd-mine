var async = require('async');
var crypto = require ('crypto');
var mongodb = require ('mongodb');

var server = new mongodb.Server('localhost:27017', {auto_reconnect: true});

var db = new mongodb.Db('mydb', server);



var validateUser = function (user, cb) {

    if (user !== undefined && user !== null) {
	cb (null, user);
    }
    else cb('Invalid user request', null);

};

var getPassIterations = function () {


    var ITERATIONS = process.env.PASSWORD_HASH_ITERATIONS || 5000;

    return ITERATIONS;

};

var getPassSaltLength = function () {

    //16 Byte salt is 128 bits and should be good enough as per NIST

    var SALT_LENGTH = process.env.PASSWORD_SALT_LENGTH || 16;
    return SALT_LENGTH;
};

var getPassHashLength = function () {

    //Note: Keylength of 20 is the default used by Node Crypto
    var PASSWORD_HASH_LENGTH = process.env.PASSWORD_HASH_LENGTH || 20;

    return PASSWORD_HASH_LENGTH;
};

var testUser = {
    email: 'test@test.com',
    password: 'oogabooga'
    };

var addUser = function (user) {

    //validate user request - do this sync?

    //Required attributes
    var email = user.email;
    var _password = user.password;

    var salt = null;
    var hashedPassword = null;


    //optional attributes
    var Name = null;
    var FacebookToken = null;
    var Profile = null;

    var SALT_LENGTH = getPassSaltLength();
    var PASSWORD_ITERATIONS = getPassIterations();
    var PASSWORD_HASH_LENGTH = getPassHashLength();


    var hashPassword = function (err, _salt) {

	var salt_ready = (new Date() - start_time);
	console.log('Salt ready after: ' + salt_ready + ' ms');
	if (err) return updatePassword(err);

	salt = _salt;

	crypto.pbkdf2(_password, salt, PASSWORD_ITERATIONS,
		      PASSWORD_HASH_LENGTH, updatePassword);
    };

    var getSalt = function (done) {
	//Gets the salt
	crypto.randomBytes(SALT_LENGTH, done);
    };

    var updatePassword = function (err, _hash) {

	var hash_ready = (new Date() - start_time);
	console.log('Password Hash ready after: ' + hash_ready + 'ms');
	if (err) { console.log(err); return; }

	hashedPassword = _hash;

	console.log('Email: ' + email);
	console.log('PlainText password: ' + _password);
	console.log('Salt: ' + salt);
	console.log('Iterations: ' + PASSWORD_ITERATIONS);
	console.log('Key Length: ' + PASSWORD_HASH_LENGTH);
	console.log('Hashed Password: ' + hashedPassword);

    };
    var start_time = new Date();
    getSalt(hashPassword);

};
