var is_nodejs = (typeof exports == 'object' && exports);
if (is_nodejs)
{
    var Class = require('./js/classy.js');
    if (SockJS === undefined)
    var SockJS = require('./sockjs-client-emul.js');
}
var ExtendMixin = {
    /** @this {Element} */  
    extend : function(options) {
	for (key in options)    
	    this[key] = options[key];
    }
};

var EURECA = Class.$extend({
    __include__ : [ExtendMixin],
    __classvars__ : {
      sock : null
    },
    __init__ : function(options) {
    this.defaults = { 

    };
    this.extend(this.defaults);
    this.extend(options);	

    this._ready = false;

    var _this = this;
    this.exports = {};

    var MAXTRIES = this.retries || 20;
    var tries = 0;

    var prefix = this.prefix;
    var uri = this.uri || (prefix ? _eureca_host+prefix : _eureca_uri);
 
    this.callbacks = {};
    console.log('CLIENT');    
    createConnection = function() {
	_this.sock = new SockJS(uri);
	/*
	sock = new SockJS(_rmi_uri, null, {
      debug: true, protocols_whitelist: ['websocket', 'xdr-streaming', 'xhr-streaming', 'iframe-eventsource', 'iframe-htmlfile', 'xdr-polling', 'xhr-polling', 'iframe-xhr-polling', 'jsonp-polling'   ]});
	*/
	_this.sock.onopen = function() {
	    tries = 0;
	};


	_this.sock.onmessage = function(e) {
	    try
	    {
		var o = JSON.parse(e.data);
	    }
	    catch (ex){ 
		var o = {};
	    }
	
		if (o.__eureca__) //should be first message
		{
		    _this.importRemoteFunction(o.__eureca__);
		    return;
		}
		if (o._r !== undefined) //invoke result
		{
		    _this.doCallBack(o._r, o.r);
		    return;
		}

		if (o.f !== undefined) //server invoking client 
		//TODO : check f validity !
		{
		    _this.invoke(o);
		    return;
		}

	};

	_this.sock.onclose = function(e) {
	    if (typeof _this._conRetryCB == 'function') _this._conRetryCB();

	    tries++;
	    if (tries > MAXTRIES || e.code < 1000) //handle 1002 and 1006 sockjs error codes
	    {
		if (typeof _this._conLostCB == 'function') _this._conLostCB();
		else throw new Error("Connection Lost");
	    }
	    //var utime = Math.pow(2, tries);
	    var utime = tries;
	    setTimeout(function() {
		createConnection();
	    }, utime*1000);
	};
	_this.sock.onerror = function() {
	    throw new Error("sockjs error");
	};

    }




    createConnection();

    },

    onConnectionLost : function(fn)
    {
	if (typeof fn != 'function') return false;
	this._conLostCB = fn;
    },
    onConnectionRetry : function(fn)
    {
	if (typeof fn != 'function') return false;
	this._conRetryCB = fn;
    },

    ready : function(fn)
    {
	if (typeof fn != 'function') return false;
	if (this._ready) fn();
	this._readyCb = fn;
    },
    //Borrowed from RMI.js https://github.com/mmarcon/rmi.js
    random : function(length) {
        var rs, i, nextIndex, l, chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '1', '2',
                 '3', '4', '5', '6', '7', '8', '9', '0'];
        l = (length) ? length : 12;
        rs = '';
        for (i = 0; i < l; i++) {
            nextIndex = Math.floor(Math.random() * chars.length);
            rs += chars [nextIndex];
        }
        return rs;
    },



    registerCallBack : function(sig, cb)
    {
	this.callbacks[sig] = cb;
    },
    doCallBack : function(sig, result)
    {
	var cb = this.callbacks[sig];
	delete this.callbacks[sig];
	if (cb !== undefined) cb(result);
    },

    importRemoteFunction : function(functions)
    {
	var _this = this;
	if (functions === undefined) return;
	for (var i=0; i<functions.length;i++)
	{
	(function(_f) {
	    _this[_f] = function ()
	    {
		var uid = _this.random();
		var argsArray = Array.prototype.slice.call(arguments, 0);
		var cb = argsArray[argsArray.length-1];
		if (typeof cb == 'function') 
		{
		    cb = argsArray.pop();
		    _this.registerCallBack(uid, cb);
		}
		_this.sock.send(JSON.stringify({f:_f, a : argsArray, _r : uid}));
	    }
	})(functions[i]);
	}
	this._ready = true;
        if (typeof this._readyCb == 'function') this._readyCb();
	this._readyCB = false;
    },
 
    invoke : function(obj)
    {
	/*
	if (obj._r === undefined)
	{
	    console.log('Invoke error');
	    return;
	}
	*/
	var func = this.exports[obj.f]; 
	if (typeof func != 'function')
	{
	    throw new Error("Invoke error, unknown function : "+func);
	    return;
	}
	var result = func.apply(this.exports, obj.a);
    }


 
});


if (is_nodejs)
    module.exports = EURECA;
