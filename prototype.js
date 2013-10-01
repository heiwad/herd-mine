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
	var output = '';
	for (var friend in friends) output += friends[friend].name + ' : ' +friends[friend].id +'\n';
	log(output);
	save(friends,'friends');
	console.log('Got %d friends', friends.length);
    }

};

var handlePosts = function (posts) {

    if (posts) {
	save(posts, 'posts');
    }

    var applications = {};
    for (var i = 0; i < posts.length; i++) {
	var post = posts[i];
	if(post.hasOwnProperty('application')) {

	    var app = post.application;

	    if (applications.hasOwnProperty(app.id)) {

		applications[app.id].count +=1;
		applications[app.id].firstDate = post.created_time; /*fix this to do a comparison first*/

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

    save(applications,'applications');
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
    pagedFacebookGet(options, cb);

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
		    cb(apiResults);
		}


	    } catch (e) {
		log('Error parsing server response! ' + e);
		save(e, 'lasterror');
		save(body,'lastbody');
		save(response,'lastresponse'); }


	} else if (error){
	    log('Error fetching data from facebook API: ' + error);
	    save(error, 'lasterror');
	} else if (response.statusCode != 200) {
	    log('Unexpected server response code when fetching data: ' + response.statusCode);
	    save(response, 'lastresponse');
	    save(body, 'lastbody');
	}

    }

    log('Scheduling intial fetch of data');
    request(options, fetch_more);
};



