/*This file prototypes downloading data from the facebook Graph API */

var https = require('https');
var uu = require('underscore');
var async = require('async');
var request = require('request');
var qs = require('querystring');
var url = require('url');

/* Debugging Utilities */
var _data = {};
var DEBUG = false;


var log = function (xx) {
    if(DEBUG) {	console.log("%s at %s", xx, new Date());  }
};

var save = function (inst, name) {
    if(DEBUG && global.hasOwnProperty('_data')) {global._data[name] = inst;}
};

var debugHandler = function (error, result) {

    if (error) {
	log(error);
	save(result, 'lastresult');
    } else {
	log('Operation Completed. Check _data.lastresult for results...');
	save(result, 'lastresult');
    }

};

/* Program code starts here */

var getAuthToken = function () {
    /* Placeholder: update this when integrating it back into website */
    return process.env.FACEBOOK_GRAPH_EXPLORER_TOKEN;

};

var facebookQueryBuilder = function ( token, user, target, fields) {

    var uri = 'https://graph.facebook.com';
    user = user || 'me';
    uri += '/' + user;
    if (target) { uri+= '/' + target; }

    var queryString = {};
    if (fields) { queryString.fields=fields;}
    queryString.format='json';
    queryString.access_token= token || getAuthToken();
    queryString.limit = 500;

    var options = {
	uri: uri,
	qs: queryString,
	headers: {}
    };

    return options;

};


var fetchFriendsAndDevices = function (cb, user, token) {

    token = token || getAuthToken();
    user = user || 'me';
    cb = cb || debugHandler;

    var target = 'friends';
    var fields = 'id,name,devices,picture.type(normal)';

    var options = facebookQueryBuilder(token, user, target, fields);


    var reduceDevices = function (output, friend) {

	/* TODO:May want to eliminate use of 'contains' on the arrays if server load becomes a problem - or allow client side parsing of the data*/

	if (!friend) return output;

		output.friends.push(friend); /*this data i will be needed for rendering client side*/

	if (!friend.devices) return output;


	for (var i = 0; i < friend.devices.length; i++) {

	    if (friend.devices[i].hasOwnProperty('os')) {
		if (!output.os) output.os = {};

		if (!output.os.hasOwnProperty(friend.devices[i].os)) {
		    output.os[friend.devices[i].os] = {};
		    output.os[friend.devices[i].os].count = 0;
		    output.os[friend.devices[i].os].friends = [];
		}

		if (!uu.contains(output.os[friend.devices[i].os].friends, friend.id)) {
		    output.os[friend.devices[i].os].count += 1;
		    output.os[friend.devices[i].os].friends.push(friend.id);
		}

	    }

	    if (friend.devices[i].hasOwnProperty('hardware')) {

		if (!output.hardware) output.hardware = {};

		if (!output.hardware[friend.devices[i].hardware]) {
		    output.hardware[friend.devices[i].hardware] = {};
		    output.hardware[friend.devices[i].hardware].count = 0;
		    output.hardware[friend.devices[i].hardware].friends = [];
		}
		if (!uu.contains(output.hardware[friend.devices[i].hardware].friends, friend.id)) {
		    output.hardware[friend.devices[i].hardware].count+=1;
		    output.hardware[friend.devices[i].hardware].friends.push(friend.id);
		}
	    }
	}

	return output;
    };

    var reformatData = function (error, data) {
	save(data, 'friends');
	var reducedData = uu.reduce(data, reduceDevices, { friends:[], os:{}});
	cb(null, reducedData);
    };

    pagedFacebookGet(options, reformatData);

};


var pagedFacebookGet = function (options, cb, progresscb, maxPages) {

    maxPages = maxPages || 5;
    var pageCount = 1;
    save(options, 'options');

    var apiResults = [];

    function fetch_more (error, response, body) {


	if (!error && response.statusCode == 200) {

	    try {

		var parsedBody = JSON.parse(body);
		var page = parsedBody.data;
		var hasNext = parsedBody.paging.hasOwnProperty('next');

		if (page.length > 0 ) {
		    apiResults = apiResults.concat(page);
		    if (typeof progresscb ==='function') progresscb(page);
		}

		if (hasNext && pageCount < maxPages) {
		    pageCount++;
		    request(parsedBody.paging.next, fetch_more);

		} else {

		    log('Done downloading. Received ' + apiResults.length + ' records. Calling completion callback...');
		    cb(null, apiResults);
		}


	    } catch (e) {
		log('Error parsing server response! ' + e);
		save(e, 'lasterror');
		save(body,'lastbody');
		save(response,'lastresponse');
		cb(e, apiResults); /*returns error and partial results to callback*/
	    }


	} else if (error){
	    log('Error fetching data from facebook API: ' + error);
	    save(error, 'lasterror');
	    cb(error, null);
	} else if (response.statusCode != 200) {
	    log('Unexpected server response code when fetching data: ' + response.statusCode);
	    save(response, 'lastresponse');
	    save(body, 'lastbody');
	    cb(error, null);
	}

    }

    log('Fetching data from facebook...');
    request(options, fetch_more);
};



exports.friendsAndDevices = fetchFriendsAndDevices;