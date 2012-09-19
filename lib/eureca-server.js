var sockjs  = require('sockjs');
var fs = require('fs');
var Class = require('./js/classy.js');
var EProxy = require('./eureca-proxy.js');
var ELog = require('./eureca-log.js');


var dbg = 
{
    none: 0,
    standard : 1,
    debug : 2
}

var host = '';
function getUrl(req)
{
    var scheme = req.headers.referer !== undefined ? req.headers.referer.split(':')[0] : 'http'; 
    host = scheme+'://'+req.headers.host;
    return host;
}

var hproxywarn = false;

var clientUrl = {};

var EURECA = Class.$extend({
  __init__ : function(options) {
	if (options == undefined) options = {};
	this.settings = options;
	this.contract = [];
	this.debuglevel = options.debuglevel || 1;

	var _exports = {};
	this.exports = EProxy.proxify(_exports, this.contract);
	this.allowedF = [];

	this.clients = {};
	this.callbacks = {};
    },

log : function(code, title, details, level)
{
    if (level == undefined) level = 1;

    if (level <= this.debuglevel) 
	ELog.log(code, title, details);
},

sockjs_log : function(code, message)
{
    if (this.debuglevel > 0)
        ELog.log('sockjs:'+code, message, '');
},


    invoke : function(obj, conn)
    {
    if (obj._r === undefined)
    {
    conn.write('Invoke error');
    return;
    }
    var func = this.exports[obj.f];
    if (typeof func != 'function')
    {
	conn.write('Invoke error');
	this.log('Invoke error',obj.f+' is not a function', '');
	return;
    }
    //obj.a.push(conn); //add connection object to arguments
    this.exports.user = {clientId : conn.id}; //experimental support for nowjs like client id transmission

    try
    {
	var result = func.apply(this.exports, obj.a);
        this.exports.user = {};
        conn.write(JSON.stringify({_r:obj._r, r: result }));

        obj.a.unshift(conn);

        if (typeof func.onCall == 'function') func.onCall.apply(func, obj.a);
    } catch (ex)
    {
	console.log('EURECA Invoke exception!! ', ex.stack);
    }

    
    },
//EURECA.client = {};
    importClientFunction : function(client, conn, functions)
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
    },

    getClient : function(id)
    {
	var conn = this.clients[id];
	if (conn === undefined) return false;
        if (conn.client !== undefined) return conn.client;
        conn.client = {};
        this.importClientFunction(conn.client, conn, this.allowedF);
        return conn.client;
    },

    getConnection : function(id) {
      return eureca.clients[id];
    },

    onConnect : function(fn)
    {
	this.callbacks.connection = fn;
    },
    onDisconnect : function(fn)
    {
	this.callbacks.close = fn;
    },
    onData : function(fn)
    {
	this.callbacks.data = fn;
    },
    onError : function(fn)
    {
	this.callbacks.error = fn;
    },










install : function(server)
{

    var app = server;
    if (server._events.request !== undefined && server.routes === undefined) app = server._events.request;
	if (typeof Proxy == 'undefined' && ! hproxywarn)
	{
	    ELog.log('!!WARNING!! !!WARNING!! !!WARNING!! !!WARNING!! !!WARNING!! !!WARNING!! !!WARNING!!  ', '', '');
	    ELog.log('I', 'Harmony proxy not found', 'using workaround');
	    ELog.log('I', 'to avoid this message please use : node --harmony-proxies <app>', '');
	    ELog.log('=====================================================================================', '', '');
	    hproxywarn = true;
	}


    this.allowedF = this.settings.allow || [];
    var _prefix = this.settings.prefix ||  '/eureca';
    var _clientUrl =  this.settings.clientScript || '/eureca.js';
    var _serverHost =  this.settings.host || host;

    var sockjs_opts = {sockjs_url: _serverHost+_clientUrl, log:this.sockjs_log};
    var sockjs_server = sockjs.createServer(sockjs_opts);

    this.log('+', 'Incoming connection', _serverHost);
    var _this = this;
    sockjs_server.on('connection', function(conn) {
	_this.log('+', 'Incoming connection', 'Client Id = '+conn.id);
	_this.clients[conn.id] = conn;

	//Send EURECA contract

	_this.contract = EProxy.ensureContract(_this.exports, _this.contract);

	_this.log('i', 'Sending contract', _this.contract, dbg.debug);
	
	conn.write(JSON.stringify({__eureca__:_this.contract}));


	if (typeof _this.callbacks.connection == 'function') _this.callbacks.connection(conn);


	conn.on('data', function(message) {

	    var jobj;
	    try {
		jobj = JSON.parse(message);
	    } catch (ex) {};

	    if (jobj !== undefined)
	    {
		_this.log('>', 'Received', message, dbg.debug);
		_this.invoke(jobj, conn);
	    }
	    if (typeof _this.callbacks.data == 'function') _this.callbacks.data(message);
        });

	conn.on('error', function(e) {
            _this.log('!', 'Error from '+conn.id, e);
	    if (typeof _this.callbacks.error == 'function') _this.callbacks.error(e);
	});


        conn.on('close', function() {
	    _this.log('-', 'Client quit ' , conn.id);
	    delete _this.clients[conn.id];
            //console.log('i', '#of clients changed ', EURECA.clients.length, );

	    if (typeof _this.callbacks.close == 'function') _this.callbacks.close(conn.id);
        });

    });

    //install on express
    sockjs_server.installHandlers(server, {prefix:_prefix});

if (app.get)  //TODO : better way to detect express
{
this.log('i', 'express');
    app.get(_clientUrl, function (request, response) {

 	var filename = __dirname + '/js/scripts.js';
	fs.readFile(filename, function (err, data) {
	    var text = data.toString();

	    text += '\nvar _eureca_uri = "'+getUrl(request)+_prefix+'";\n';
	    text += '\nvar _eureca_host = "'+getUrl(request)+'";\n';

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
this.log('i', 'node');
app.on('request', function (request, response) {
  if (request.method === 'GET') {
    if (request.url.split('?')[0] === _clientUrl) {

	var filename = __dirname + '/js/scripts.js';
	fs.readFile(filename, function (err, data) {
	    var text = data.toString();
	    //text += '\nvar _eureca_uri = "'+getUrl(request)+_prefix+'";\n';

	    text += '\nvar _eureca_uri = "'+getUrl(request)+_prefix+'";\n';
	    text += '\nvar _eureca_host = "'+getUrl(request)+'";\n';

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
}


});


module.exports = EURECA;
