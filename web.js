var express = require('express');
var app = express();
var fs = require('fs');



var queryFacebook = require('./queryFacebook.js');

app.use(express.logger());

app.get('/', function (request, response) {

    fs.readFile('./index.html', function (err, data) {
	if (!err) response.send(data.toString());
    });
});

app.get('/channel.html', function (request, response) {
    fs.readFile('./channel.html', function (err, data) {
	if (!err) response.send(data.toString());
    });
});



app.get('/facebookFriendsAndDevices', function (request, response) {
    var respondToQuery = function (error, data) {
	if(error) response.send('Error fetching data');
	else response.send(JSON.stringify(data));
    };
    
    /*TODO: Parse request for Auth Token or Cookie and pass the value into the query*/

    queryFacebook.friendsAndDevices( respondToQuery);

});


var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log('Listening on ' + port);
});
