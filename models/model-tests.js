var should = require('should');

describe('User authentication model tests', function () {

    var Users = require('./users.js');
    var kitty = new Users();

    describe('Set user email', function () {

	it('Invalid email (no @)', function (done) {

	    kitty.setEmail('a', function (err, response) {
		if (!err) done('Email should have failed');
		else done();
		});
	    });

	it('Invalid email (no . after @)', function (done) {

	    kitty.setEmail('a@a', function (err, response) {
		if (!err) done('Email should have failed due to missing @');
		else done();
	    });
	});

	it('Valid email (should succeed)', function (done) {

	    kitty.setEmail('heisenberg@herd-mine.herokuapp.com', done);
	});

	it('Double-entry of same email (should fail)');

	});

    describe('Set name tests', function () { 
	
	it('Minimum length test', function (done) {

	    kitty.setName(' ', function (err, result) {
		
		if (err) done();
		else done('Minimum length test should fail but did not');

	    });
	});

	it('Numeric name', function (done) {

	    kitty.setName('9', done);

	});

	it('Setting name to Heisenberg', function (done) {
	    
	    kitty.setName('Heisenberg', done);

	});
	
    });



    describe('Password hashing tests', function () {

	describe('Set password tests', function () {

	    it('Password minimum length test 1: (space)');
	    it('Password minimum length test 2: (1)');
	    it('Password passes minimum length and should succeed');
	    it('Failing to set password due to password already being set');
	    it('Overriding password that is already set using force flag');

	});

	describe('Verify password tests', function () {
	    
	    it('Trying to verify with the wrong password');
	    it('Trying to verify without passing in the correct salt');
	    it('Verifying with the correct password');
	    
	});
    });
});
