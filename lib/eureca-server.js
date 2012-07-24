var sockjs  = require('sockjs');
var fs = require('fs');
var EProxy = require('./eureca-proxy.js');
var ELog = require('./eureca-log.js');


var dbg = 
{
    none: 0,
    standard : 1,
    debug : 2
}
function log(code, title, details, level)
{
    if (level == undefined) level = 1;

    if (level <= EURECA.debuglevel) 
	ELog.log(code, title, details);
}

function sockjs_log(code, message)
{
    if (EURECA.debuglevel > 0)
        ELog.log('sockjs:'+code, message, '');
}


var EURECA = {};
EURECA.contract = [];
EURECA.debuglevel = 1;

var _exports = {};
EURECA.exports = EProxy.proxify(_exports, EURECA.contract);


EURECA.invoke = function(obj, conn)
{
    if (obj._r === undefined)
    {
    conn.write('Invoke error');
    return;
    }
    var func = EURECA.exports[obj.f];
    if (typeof func != 'function')
    {
	conn.write('Invoke error');
	console.log('Invoke error : %s is not a function', obj.f);
	return;
    }
    //obj.a.push(conn); //add connection object to arguments
    this.exports.user = {clientId : conn.id}; //experimental support for nowjs like client id transmission
    var result = func.apply(EURECA.exports, obj.a);
    this.exports.user = {};
    conn.write(JSON.stringify({_r:obj._r, r: result }));

    obj.a.unshift(conn);

    if (typeof func.onCall == 'function') func.onCall.apply(func, obj.a);
    
}


//EURECA.client = {};
EURECA.importClientFunction = function(client, conn, functions)
{
    if (functions === undefined) return;
    for (var i=0; i<functions.length;i++)
    {
    (function(_f, conn) {
     client[_f] = function ()
     {
        var argsArray = Array.prototype.slice.call(arguments, 0);
        conn.write(JSON.stringify({f:_f, a : argsArray}));
     }
     })(functions[i], conn);
    }
};

var allowedF = [];
EURECA.clients = {};
EURECA.getClient = function(id)
{
    var conn = EURECA.clients[id];
    if (conn.client !== undefined) return conn.client;
    conn.client = {};
    EURECA.importClientFunction(conn.client, conn, allowedF);
    return conn.client;
}



EURECA.callbacks = {};
EURECA.onConnect = function(fn)
{
    EURECA.callbacks.connection = fn;
}
EURECA.onDisconnect = function(fn)
{
    EURECA.callbacks.close = fn;
}
EURECA.onData = function(fn)
{
    EURECA.callbacks.data = fn;
}
EURECA.onError = function(fn)
{
    EURECA.callbacks.error = fn;
}
var host = '';
function getUrl(req)
{
    var scheme = req.headers.referer !== undefined ? req.headers.referer.split(':')[0] : 'http'; 
    host = scheme+'://'+req.headers.host;
    return host;
}
var hproxywarn = false;
EURECA.install = function(app, settings)
{
	if (typeof Proxy == 'undefined' && ! hproxywarn)
	{
	    ELog.log('!!WARNING!! !!WARNING!! !!WARNING!! !!WARNING!! !!WARNING!! !!WARNING!! !!WARNING!!  ', '', '');
	    ELog.log('I', 'Harmony proxy not found', 'using workaround');
	    ELog.log('I', 'to avoid this message please use : node --harmony-proxies <app>', '');
	    ELog.log('=====================================================================================', '', '');
	    hproxywarn = true;
	}


    allowedF = settings.allow || [];
    var _prefix = settings.prefix ||  '/eureca';
    var _clientUrl =  settings.clientScript || '/eureca.js';
    var _serverHost =  settings.host || host;

    var sockjs_opts = {sockjs_url: _serverHost+_clientUrl, log:sockjs_log};
    var sockjs_server = sockjs.createServer(sockjs_opts);

    log('+', 'Incoming connection', _serverHost);

    sockjs_server.on('connection', function(conn) {
	log('+', 'Incoming connection', 'Client Id = '+conn.id);
	EURECA.clients[conn.id] = conn;

	//Send EURECA contract

	EURECA.contract = EProxy.ensureContract(EURECA.exports, EURECA.contract);

	log('i', 'Sending contract', EURECA.contract, dbg.debug);
	
	conn.write(JSON.stringify({__eureca__:EURECA.contract}));


	if (typeof EURECA.callbacks.connection == 'function') EURECA.callbacks.connection(conn);


	conn.on('data', function(message) {

	    var jobj;
	    try {
		jobj = JSON.parse(message);
	    } catch (ex) {};

	    if (jobj !== undefined)
	    {
		log('>', 'Received', message, dbg.debug);
		EURECA.invoke(jobj, conn);
	    }
	    if (typeof EURECA.callbacks.data == 'function') EURECA.callbacks.data(message);
        });

	conn.on('error', function(e) {
            log('!', 'Error from '+conn.id, e);
	    if (typeof EURECA.callbacks.error == 'function') EURECA.callbacks.error(e);
	});


        conn.on('close', function() {
	    log('-', 'Client quit ' , conn.id);
	    delete EURECA.clients[conn.id];
            //console.log('i', '#of clients changed ', EURECA.clients.length, );

	    if (typeof EURECA.callbacks.close == 'function') EURECA.callbacks.close(conn.id);
        });

    });

    //install on express
    sockjs_server.installHandlers(app, {prefix:_prefix});

if (app.get)  //TODO : better way to detect express
{
log('i', 'express');
    app.get(_clientUrl, function (request, response) {

 	var filename = __dirname + '/js/scripts.js';
	fs.readFile(filename, function (err, data) {
	    var text = data.toString();
	    text += '\nvar _eureca_uri = "'+getUrl(request)+_prefix+'";\n';
  	    var filename2 = __dirname + '/eureca-client.js';
	    fs.readFile(filename2, function (err, data) {

		text += data.toString();
		response.writeHead(200);
		response.write(text);
		response.end();

	    });
	});
   
    });
}
else  //Fallback to nodejs
{
log('i', 'node');
app.on('request', function (request, response) {
  if (request.method === 'GET') {
    if (request.url.split('?')[0] === _clientUrl) {

	var filename = __dirname + '/js/scripts.js';
	fs.readFile(filename, function (err, data) {
	    var text = data.toString();
	    text += '\nvar _eureca_uri = "'+getUrl(request)+_prefix+'";\n';
  	    var filename2 = __dirname + '/eureca-client.js';
	    fs.readFile(filename2, function (err, data) {

		text += data.toString();
		response.writeHead(200);
		response.write(text);
		response.end();

	    });
	});
    } 
  }
});
}
/*
    app.get(_clientUrl, function (req, res) {
    	var filePath = __dirname + '/js/scripts.js';
	var _content = '';
	fs.readFile(filePath, function(error, content) {
	    if (error) {
		res.writeHead(500);
		res.end();
	    }
	    else {
		_content += content;
		_content += '\nvar _eureca_uri = "'+getUrl(req)+_prefix+'";\n';
  		var filePath2 = __dirname + '/eureca-client.js';
		fs.readFile(filePath2, function(error, content) {
		if (error) {
			res.writeHead(500);
			res.end();
	    	}
	    	else {
			_content += content;
			//response.writeHead(200, { 'Content-Type': 'application/javascript' });
			res.writeHead(200, { 'Content-Type': 'text/javascript' });
			res.end(_content, 'utf-8');
		}

		//response.writeHead(200, { 'Content-Type': 'application/javascript' });
	    });
	  }
	});
    });
*/
}




module.exports = EURECA;
