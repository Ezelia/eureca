//var express = require('express');
var http = require('http');


var fs = require('fs');
var EURECA  = require('../').EURECA,
    ELog = require('../').Logger; 


// tell it that we allow clients to expose foo and bar functions
// functions called foo or bar in the client side cann be called from server
// note that if the client expose something else than foo and bar, they will be ignored.
var eureca = new EURECA({allow : ['foo', 'bar']});
var Server = eureca.exports;

//EURECA Server side functions exposed to clients
Server.add = function(a, b) {
        return a+b;
};
Server.echo = function(s) {
    console.log('received : ', s);
};

//the following callback allows us to track when echo() is called from a client, conn argument contains a reference to the connection instance
Server.echo.onCall = function(conn, s) 
{
    conn.write('>'+s);
    //we can use it to get client instance
    //client = eureca.getClient(conn.id);
}
///////////////////////////////////////////////////


var app = http.createServer();
//var app = express.createServer();

eureca.debuglevel=2; // 0=no debug, 1=standard debug, 2=full debug

eureca.install(app);


//Call client foo() function when ready 
eureca.onConnect(function(c) {
    client = eureca.getClient(c.id);
    client.foo(' From server');
})






app.on('request', function (request, response) {
  var i;
  if (request.method === 'GET') {
    if (request.url.split('?')[0] === '/') {
	var filename = __dirname + '/rmiclient.html';
	fs.readFile(filename, function (err, data) {
	    var text = data.toString();
	    response.writeHead(200);
	    response.write(text);
	    response.end();
	});
    } 
  }
});


/*
app.configure(function() {
  //app.use(express.logger());
  //app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


app.get('/', function (req, res) {
    res.sendfile(__dirname + '/rmiclient.html');
});
*/

process.on('uncaughtException', function(err) {
    console.log("Uncaught exception!", err, err.stack);
});


ELog.clog(' [*] Listening on 0.0.0.0:8081', 'magenta+underline');
app.listen(8081, '0.0.0.0');

