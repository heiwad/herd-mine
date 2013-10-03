//load data from sample file on disk instead of hitting API

var fs = require('fs');
var sample_path = '/home/bumblebee/herd-mine/scratch/friends.json';
var load_data = function ( path ) {

    var data =  fs.readFileSync(path);

    return JSON.parse(data);
};


//simulated rendering of data

var render = function (data) {
    if (data.os) {
	for (var x in data.os ) {

	    console.log("Starting table for " + x);

	    var friends = data.os[x].friends;
	    var outstring = '';
	    for (var ii = 0; ii < friends.length; ii++) {

		var wraplimit = 8;
		if (Math.floor(ii / wraplimit ) === Math.ceil(ii / wraplimit) && ii > 0) outstring +='\n';

		else if (ii > 0 ) outstring+=' ';


		//Image with properties <img size=> < alt text = name>
		outstring += data.friends[friends[ii]].name.slice(0, 8);
	    }

	    console.log(outstring);

	}

    }
};


