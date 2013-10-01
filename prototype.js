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


var requestHandler = function (error, response, body) {

  if (!error && response.statusCode == 200) {
    console.log(body);
  }
};

var handleFriends = function (error, friends) {

    if (error) { log(error); return;}
    if (friends) {
	var output = '';
	for (var friend in friends) output += friends[friend].name + ' : ' +friends[friend].id +'\n';
	log(output);
	save(friends,'friends');
	console.log('Got %d friends', friends.length);
    }

};

var handlePosts = function (error, posts) {

    if (error) {log(error); return; }
    else {
	getAppsFromPosts(posts, function (error, apps) {
	    if (error) log(error);
	    else log('got apps'); save(apps,'apps');
	});

    }
};

var getAppsFromPosts = function (posts, cb) {


    if (posts) {
	save(posts, 'posts');
    } else {
	cb('Error - post history is blank', null);
    }

    var applications = {};
    for (var i = 0; i < posts.length; i++) {
	var post = posts[i];
	if(post.hasOwnProperty('application')) {

	    var app = post.application;

	    if(!app.id) cb('invalid data format', null); /*application field is missing the id field*/

	    if (applications.hasOwnProperty(app.id)) {

		applications[app.id].count +=1;
		applications[app.id].firstDate = post.created_time; /*Assumes complete post history in reverse order - if that's not the case need to update do do comparisons*/

	    } else {
		applications[app.id] = {};
		applications[app.id].name = app.name;
		applications[app.id].id = app.id;
		applications[app.id].count = 1;
		applications[app.id].firstDate = post.created_time;
		applications[app.id].lastDate = post.created_time;
	    }
	}
    }


    cb(null, applications);
};

var fetchFriends = function (cb) {

    var target = 'friends';
    var token = getAuthToken();
    var user = 'me';
    cb = cb || handleFriends;

    var options = facebookQueryBuilder(token, user, target );
    pagedFacebookGet(options, cb);

};

var fetchPosts = function (cb, user, fields) {

    user = user || 'me';
    cb = cb || handlePosts;
    fields = fields || 'application';

    var target = 'posts';
    var token = getAuthToken();
    var options = facebookQueryBuilder(token, user, target, fields);


    var appendUserBeforeCb = function (error, results) {
	if (error) { cb(error, null); }
	else if (results) {
	    results.USER_ID = user;
	    cb(null, results);
	    }

    };


    pagedFacebookGet(options, appendUserBeforeCb);


};

var pagedFacebookGet = function (options, cb, progresscb) {

    var maxPages = 5;
    var pageCount = 1;
    log('Initiating paged fetch from facebook');
    save(options, 'options');
    var apiResults = [];

    function fetch_more (error, response, body) {


	if (!error && response.statusCode == 200) {
	    log('Page of data successfully retreived from API');
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
		    log('Scheduling download of additional pages of data');
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

    log('Scheduling intial fetch of data');
    request(options, fetch_more);
};


var handleFriendsApps = function ( error, friendsApps) {

    if (error) {

	log(error);
	return;
    } else {
	save(friendsApps, 'friendsApps');
    }

};

var getFriendsApps = function (token, friends, cb) {

    //operates on a friends list
    //applies each friend to a curry'ed version of pagedGet/app list
    //returns final list of apps

    token = token || getAuthToken();
    friends = friends || _data.friends;
    cb = cb || handleFriendsApps;

    //need a function that takes in a user, and underscore callback. the function queries facebook for the post history of the user, then filters the posts down to generate a list of apps before calling the underscore callback

    var MAX_DOWNLOADS = 300;


    var iterator = function (friend, resultcb) {

	var filterPosts = function (error, posts) {

	    if (error) resultcb(error, posts);
	    else {

		getAppsFromPosts(posts, resultcb);
		}
	};


	fetchPosts(filterPosts, friend.id, 'application');

    };


    async.mapLimit(friends, MAX_DOWNLOADS, iterator, cb);


};
