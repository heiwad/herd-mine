var mongoose = require('mongoose');
var async = require('async');
var crypto = require ('crypto');
var mongodb = require ('mongodb');

var check = require('validator').check;
var sanitize = require('validator').sanitize;
var Stringjs = require('string');


// Note: Trying to use async.waterfall is broken in node repl.
// Modified async.js to use Array.isArray(task) rather than
// checking the type task.constructor as per
// http://stackoverflow.com/a/17417137/2904811

//debugging tools

var debugHandler = function ( err, res ) {
    if (err)
	console.log('Error: ' + err);
    else
	console.log('Result: ' + res);
};

var printHash = function ( err, res ) {
    if (err)
	console.log('Error: ' + err);
    else
	for (var x in res)
	console.log(x + ': ' + res[x]);
};


//==============================================================================
// This loads password hashing policy from site configuration
// TODO: Refactor this to a separate file.

var getPassIterations = function () {

    var ITERATIONS = process.env.PASSWORD_HASH_ITERATIONS || 10000;

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

var getMaxPasswordLength = function () {
    var MAX_PASSWORD_LENGTH = process.env.MAX_PASSWORD_LENGTH || 128;
    return MAX_PASSWORD_LENGTH;

};

var getMinPasswordLength = function () {
    var MIN_PASSWORD_LENGTH = process.env.MIN_PASSWORD_LENGTH || 8;
    return MIN_PASSWORD_LENGTH;

};

var getMaxUserFullNameLength = function () {
    var MAX_USERFULLNAME_LENGTH = process.env.MAX_USERFULLNAME_LENGTH || 128;
    return MAX_USERFULLNAME_LENGTH;

};
var getMinUserFullNameLength = function () {
    var MIN_USERFULLNAME_LENGTH = process.env.MAX_USERFULLNAME_LENGTH || 1;
    return MIN_USERFULLNAME_LENGTH;

};

//==============================================================================
// Rules for scrubbing input prior to accepting it into the database
// These are quick and dirty for prototyping. Need to be updated for production.

var Validator = require('validator').Validator;

Validator.prototype.error = function (msg) {
    this._errors.push(msg);
    return this;
};

Validator.prototype.getErrors = function () {
    return this._errors;
};


var scrubEmail = function (email, done) {

    if (email === undefined || email === null) {
	done('Invalid email address', null);
	return;
    }

    email = sanitize(email).trim();
    email = sanitize(email).escape();
    email = sanitize(email).xss();

    var validator = new Validator();
    validator.check(email).isEmail();
    var errors = validator.getErrors();

    if (!errors || errors.length > 0) {
	done(errors, null);
	return;

    } else {

	done(null, email);

    }
};

var scrubUserFullName = function (name, done) {

    if (name === undefined || name === null) {
	done('Invalid name', null);
	return;
    }

    name = Stringjs(name).stripTags().s;

    name = sanitize(name).trim();
    name = sanitize(name).xss();
    name = sanitize(name).escape();

    var min_name_length = getMinUserFullNameLength();
    var max_name_length = getMaxUserFullNameLength();

    if (name.length > max_name_length || name.length < min_name_length) {
	console.log(name);
	done('Invalid name length', null);
	return;
    }

    done(null, name);
};

var scrubPassword  = function (password, done) {

    password = sanitize(password).trim();

    //TODO: Add more validation restrictions as per
    //security cheat sheet http://bit.ly/1bUMQgm

    var min_length = getMinPasswordLength();
    if (password.length < min_length) {
	done ('Password is shorter than min length (' + min_length + ')'
	      , password);
	return;
    }

    var max_length = getMaxPasswordLength();
    if (password.length > max_length) {
	password = password.slice(0, max_length);
	done ('Password is longer than max length (' + max_length + ')'
	      , password);
	return;
    }

    done(null, password);

};
//==============================================================================

//This method is responsible for all hashing of passwords.
//if a salt is not provided, one will be automatically generated.
var getPasswordHash = function ( password, done, salt, iterations) {

    if (!done) done = printHash; //for debugging only

    if (password === undefined || password === null) {
	done('No password specified', null);
	return;
    }

    var SALT_LENGTH = getPassSaltLength();
    var PASSWORD_HASH_LENGTH = getPassHashLength();
    var PASSWORD_ITERATIONS = iterations || getPassIterations();


    var appendHashProperties = function (hash, _salt, callback) {

	var hashedPassword = {};
	hashedPassword.hash = hash.toString('hex');
	hashedPassword.salt = _salt.toString('hex');
	hashedPassword.rounds = PASSWORD_ITERATIONS;
	hashedPassword.lastUpdated = Date.now();

	callback(null, hashedPassword);
    };

    var hashPassword = function (_salt, callback) {

	var hashHandler = function (err, hash) {
	    if (err) {
		callback(err);
		return;
	    } else {
		callback(null, hash, _salt);
		return;
	    }
	};

	crypto.pbkdf2( password, _salt, PASSWORD_ITERATIONS,
		      PASSWORD_HASH_LENGTH, hashHandler);
    };

    var generateSalt = function (callback) {

	if (salt !== undefined && salt !== null) {

	    //Assume the salt provided is hex-encoded because that's what
	    //the enclosing method returns!

	    salt = new Buffer(salt, 'hex');
	    callback(null, salt);
	} else {
	    crypto.randomBytes(SALT_LENGTH, callback);
	}
    };

    async.waterfall([
	generateSalt,
	hashPassword,
	appendHashProperties
    ], done );

};


var verifyPassword = function (password, user, done ) {
    var salt = user.password.salt;

    if (user.password === {}) {
	done(null, false);
	return;
    }
    var hashHandler = function (err, hash) {
	if (err) {

	    done(err, null);
	    return;
	}

	if (hash.password === user.password.hash) {
	    done(null, true);
	}

	else {
	    done(null, false);
	}
    };

    getPasswordHash(password, hashHandler, salt);
};

var userSchema = new mongoose.Schema({

    //TODO: Write a new version of the schema that supports:
    //user email address verification (for ownership) and password reset tokens

    name: String,
    email: String,
    lastLogin: Date,

    password: {
	hash: String,
	salt: String,
	rounds: Number,
	lastUpdated: Date
    },

    session: {
	token: String,
	expiry: Date,
	lastSeen: Date,
    },

    facebook: {
	token: String,
	expiry: Date,
	isLongLived: Boolean
    }

});

userSchema.methods.setPassword = function ( password, done, forceUpdate ) {

    console.log('Set Password invoked for pass: ' + password);
    var _this = this;

    var passwordHandler = function (err, hashedPassword ) {
	console.log('Got password hash. Storing it');
	if (err) {
	    done(err, null);
	    return;
	}

	_this.password = hashedPassword;

	done(null, _this);
	return;

    };

    var scrubHandler = function (err, scrubbedPassword) {
	console.log('Handling scrubbed password: ' + scrubbedPassword);
	if (err) {
	    done(err, null);
	    return;
	}

	if (forceUpdate || _this.password === null ||
	    _this.password === undefined || _this.password === {}) {
	    console.log('Getting hash of password');
	    getPasswordHash(scrubbedPassword, passwordHandler);
	    return;

	} else {
	    console.log('User already has a password!');
	    done('User already has a password. Use forceUpdate flag.', null);
	    return;
	}

    };

    scrubPassword(password, scrubHandler);

};

userSchema.methods.dropPassword = function (done) {

    //This function is a wrapper to make API consistently async

    var _this = this;
    _this.dropPasswordSync();
    done(null, _this);
};

userSchema.methods.dropPasswordSync = function () {
    var _this = this;
    _this.password = {};
};

userSchema.methods.verifyPassword = function (password, done) {

    var _this = this;
    verifyPassword(password, _this, done);
};

userSchema.methods.updatePassword = function (oldPassword, newPassword, done) {

    var _this = this;

    var verifyHandler = function (err, isMatch) {

	if (err) {
	    done(err, null);
	    return;
	}

	if (isMatch) {
	    _this.setPassword(newPassword, done, true);
	}
    };

    _this.verifyPassword(oldPassword, verifyHandler);
};

userSchema.methods.setEmail = function (email, done) {

    var _this = this;
    var validationHandler = function (err, scrubbedEmail) {
	if (err) {
	    done (err, _this);
	    return;
	}

	_this.email = scrubbedEmail;
	done(null, _this);
	return;
    };

    scrubEmail(email, validationHandler);
};

userSchema.methods.setName = function (name, done) {

    var _this = this;

    var validationHandler = function (err, scrubbedName) {
	if (err) {
	    done (err, _this);
	    return;
	}

	_this.name = scrubbedName;
	done(null, _this);
	return;
    };

    scrubUserFullName(name, validationHandler);
};

// Add methods to the userSchema for manipulating the password:
// create password, update password, reset password

var Users = module.exports = mongoose.model('Users', userSchema);
