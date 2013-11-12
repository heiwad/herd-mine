var async = require('async');
var crypto = require ('crypto');
var mongodb = require ('mongodb');

var check = require('validator').check;
var sanitize = require('validator').sanitize;



//==============================================================================
// Connect to Mongo DB for storing user log-ins
//==============================================================================

//TODO: Set Writeconcern for MongoDB
//Migrate to ORM by Mongoose



var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server;


//db test code

var mongoClient = new MongoClient(new Server('localhost', 27017));
mongoClient.open( function (err, mongoClient) {

    var db1 = mongoClient.db("test");
    db1.collection("sandbox", function (err, collection) {

	collection.find({},function (err, res) {
	    console.log(res);
	});
    });
});

var db2 = mongoClient.db('herd-mine');

db2.collection ('users', function (err, collection ) {
    collection.insert({email:'heiwad@gmail.com'}, function (err, res) {if(err) console.log(err); console.log(res);});
});

db2.collection ('users', function (err, collection ) {
    collection.find({email:'heiwad@gmail.com'}, function (err, res) {if(err) console.log(err); console.log(res);});
});


var getDbConnectionManager = function (dbname) {

    var mongoClient = null;
    var db = null;

    var dbConnect = function (cb, close) {


	if (close && mongoClient!== null) {
	    mongoClient.close();
	    mongoClient = null;
	    db = null;
	    return;
	}

	if (mongoClient === null) {

	    mongoClient = new MongoClient(new Server('localhost', 27017));
	}


	if (db === null) {

	    mongoClient.open(function(err, mongoClient) {

		if (err) {
		    cb(err, null);
		    return;
		}

		db = mongoClient.db(dbname);
		cb(null, db);

	    });

	}


    };
};

//==========db test code




//==============================================================================
// Get default settings from env or fall-back to pre-programmed defaults
//==============================================================================
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

var maxPasswordLength = function () {
    var MAX_PASSWORD_LENGTH = process.env.MAX_PASSWORD_LENGTH || 128;
    return MAX_PASSWORD_LENGTH;

};

var minPasswordLength = function () {
    var MIN_PASSWORD_LENGTH = process.env.MIN_PASSWORD_LENGTH || 8;
    return MIN_PASSWORD_LENGTH;
};
//==============================================================================


var validateEmail = function (email) {

//    email = sanitize.trim(email);
  //  email = sanitize.escape(email);
    //email = sanitize.xss(email);

    if (email === undefined && email === null) {
	return null;
    }

    if (!check(email).isEmail()) {
	return null;
    }

	return email;
};

var validatePassword  = function (password) {

//    password = sanitize.trim(password);

    //TODO: Add more validation restrictions http://bit.ly/1bUMQgm

    if (password.length < minPasswordLength()) return null;

    var max_length = maxPasswordLength();
    if (password.length > max_length) {
	password = password.slice(0, max_length);
    }

    return password;

};


var printUsers = function () {

    console.log("Querying Users collection for results...");

    var walkUsers = function (err, collection) {

	if (err) {
	    console.log(err);
	    return;
	}

	var printDocs = function (err, docs) {

	    console.log("Printing results...");

	    if (err) {
		console.log(err);
		return;
	    }

	    for (var doc in docs) {
		console.log(docs[doc]);
	    }
	    return;
	};

	collection.find().toArray(printDocs);
    };

   db.collection('Users', walkUsers);

};



var addUser = function (user, done) {


    //TODO: Update this so that we can't overwrite an existing user!


    //Validate required input fields
    var email = validateEmail(user.email);
    var _password = validatePassword(user.password);

    if (email === null) {
	done('Invalid email address', null);
	return;
	}
    else if (_password === null) {
	//TODO: update this message to show why the password failed.

	done('Password does not meet complexity requirements', null);
	return;
    }

    var handleUpdate = function (err, hashed) {

	if (err) { console.log(err); return; }

	console.log('Email: ' + email);
	console.log('PlainText password: ' + _password);
	console.log('Salt: ' + hashed.salt);
	console.log('Iterations: ' + hashed.iterations);
	console.log('Key Length: ' + hashed.length);
	console.log('Hashed Password: ' + hashed.password);

	var insertResultHandler = function( err, result) {

	    if (err) {
		console.log(err);
		return;
	    }

	    console.log(result);
	    db.close();

	    };


	var insertUser = function (err, collection) {

	    if(err) {
		console.log(err);
		return;
	    }

	    hashed.email = email;
	    collection.insert(hashed, {safe: true}, insertResultHandler);


	};
	var dbHandler = function (err, db) {

	    if (err) {
		console.log(err);
		return;
	    }

	    db.collection('users', insertUser);

	};

	db.open(dbHandler);

    };

    console.log("About to generate salt and password hash...");
    getPasswordHash(_password, handleUpdate);

};

var getPasswordHash = function ( password, done,
		      SALT_LENGTH, PASSWORD_ITERATIONS,
		      PASSWORD_HASH_LENGTH, salt ) {

    var hashedPassword = null;

    //Set default encryption settings if unspecified
    SALT_LENGTH = SALT_LENGTH || getPassSaltLength();
    PASSWORD_ITERATIONS = PASSWORD_ITERATIONS ||
	getPassIterations();
    PASSWORD_HASH_LENGTH = PASSWORD_HASH_LENGTH ||
	getPassHashLength();


    var finalizeHash = function (err, hash) {

	if (err) {
	    done(err, null);
	    return;
	}

	var hashedPassword = {};

	//Note: Base64 is not safe for URLs or DOM

	hashedPassword.password = hash.toString('base64');
	hashedPassword.salt = salt.toString('base64');
	hashedPassword.iterations = PASSWORD_ITERATIONS;
	hashedPassword.length = PASSWORD_HASH_LENGTH;

	done(null, hashedPassword);
    };

    var hashPassword = function (err, _salt) {

	if (err) {
	    finalizeHash(err, null);
	    return;
	}

	//Save salt for next step
	salt = _salt;

	crypto.pbkdf2( password, salt, PASSWORD_ITERATIONS,
		      PASSWORD_HASH_LENGTH, finalizeHash);
    };

    var startWithSalt = function () {

	if (salt !== undefined && salt !== null) {
	    hashPassword(null, salt);
	} else {

	    crypto.randomBytes(SALT_LENGTH, hashPassword);
	}
    };

   startWithSalt();
};
