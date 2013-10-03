var uu = require('underscore')
  , db = require('./models')
  , Constants = require('./constants')
  , fs = require('fs');

var build_errfn = function(errmsg, response) {
    return function errfn(err) {
	console.log(err);
	response.send(errmsg);
    };
};

var indexfn = function (request, response) {
    fs.readFile(__dirname + '/public/html/index.html', function ( err, data) {
	if (!err) response.send(data.toString());
    });

};

var friendsAndDevicesfn = function (request, response) {

    var respondToQuery = function (err, data) {
	if (err) response.send(err);
	else response.send(JSON.stringify(data));
    };

    /*TODO: modify this to parse request for correct auth token or cookie*/

    db.facebook.friendsAndDevices( respondToQuery) ;

};

var mobileDevicePrefsfn = function (request, response) {

    var respondToQuery = function (err, data) {
	if (err) response.send(err);
	else response.render("friendsDevices", {data:data});
    };

    db.facebook.friendsAndDevices( respondToQuery);

};

var define_routes = function (dict) {
    var toroute = function(item) {
	return uu.object(uu.zip(['path', 'fn'], [item[0], item[1]]));
    };
    return uu.map(uu.pairs(dict), toroute);
};

var ROUTES = define_routes({
    '/' : indexfn,
    '/friendsAndDevices' : friendsAndDevicesfn,
    '/mobileDevicePrefs' : mobileDevicePrefsfn
    });

module.exports = ROUTES;
