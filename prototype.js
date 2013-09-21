/*This file prototypes downloading data from the facebook Graph API */

var https = require('https');
var uu = require('underscore');
var async = require('async');
var request = require('request');
var qs = require('querystring');
var url = require('url');

/* Debugging Utilities */
var _data = {};
var DEBUG = true;

var log = function (xx) {
    if(DEBUG) {	console.log("%s at %s", xx, new Date());  }
};

var save = function (inst, name) {
    if(DEBUG) {global._data[name] = inst;}
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


/*
  //Add support for GZIP later. May improve data transfer rate
    var headers = {};
    headers.Connection = 'keep-alive';
    headers['Accept-Encoding'] = 'gzip';
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36';
*/
    var options = {
	uri: uri,
	qs: queryString,
	headers: {}
    };

    return options;

};


var requestHandler = function (error, response, body) {

  if (!error && response.statusCode == 200) {
    console.log(body);
  }
};

var handleFriends = function (friends) {

    if (friends) {
	log(friends);
	save(friends,'friends');
	console.log('Got %d friends', friends.length);
    }

};

var fetchFriends = function (user, token, cb) {

    var target = 'friends';
    var options = facebookQueryBuilder(token, user, target );
    log('Getting friends for user ' + user );
    save(options, 'options');

    var friends = [];
    function fetch_more (error, response, body) {
	log('fetch_more invoked');
	if (!error && response.statusCode == 200) {
	    log('about to parse the server response');
	    try {

		var parsedBody = JSON.parse(body);
		var parsedURL = url.parse(parsedBody.paging.next);
		var parsedQuery = qs.decode(parsedURL.query);

		var stopDownloading = false;
		var duplicates = false;

/*
  //This isn't true. The facebook api filters results before returning so this may terminate things too early
		if (parsedBody.data.length != parsedQuery.limit) {
		    log('Got ' + parsedBody.data.length + ' records out of ' + parsedQuery.limit + ' limit. Stopping download');
		    stopDownloading = true;
		}
*/
		if (friends.length > 0 && friends[friends.length-1].id === parsedBody.data[parsedBody.data.length-1].id) {
		    //consider checking the next url instead of the data for duplication but this is probably good enough.
		    log('Duplicates detected. Friends length is ' + friends.length + ' and last id is ' + parsedBody.data[parsedBody.data.length-1].id);
		    duplicates = true;
		    stopDownloading = true;
		}

		if (duplicates === false) {
		    log('Adding ' + parsedBody.data.length + ' items to friends list');
		    friends = friends.concat(parsedBody.data);
		}

		if (stopDownloading ===false) {
		    log('Downloading more');
		    request(parsedBody.paging.next, fetch_more);


		    } else {
			log('Done downloading');
			cb(friends);
		    }


	    } catch (e) { log('Error parsing server response!'); save(body,'body');save(response,'response'); }


	} else log('error with server response + ' + error + ' ' +  response.statusCode);

    }

    log('requesting initial download of friends');
    request(options, fetch_more);
};

var tryFetch = function () {
    fetchFriends('me', getAuthToken(), handleFriends);
};

var fetchPosts = function (user, attributes) {

};

var parseAppsFromPosts = function ( posts ) {


};
