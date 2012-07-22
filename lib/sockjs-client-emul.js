var sjsc = require('sockjs-client');
var SockJS = function(uri)
{
    this.sockjs = sjsc.create(uri);
    var _this = this;
    this.sockjs.on('connection', function () {
	    console.log('connection');	
	    if (typeof _this.onopen == 'function') _this.onopen();
    });

    this.sockjs.on('data', function (msg) {
	    console.log('data', msg);
	    if (typeof _this.onmessage == 'function') _this.onmessage({data:msg});
    });

    this.sockjs.on('error', function (e) {
	if (e[0] !== undefined && e[0].code == 'ECONNREFUSED')
	{
	    if (typeof _this.onclose == 'function') _this.onclose();
	}
	else if (typeof _this.onerror == 'function') _this.onerror(e);
    });


    this.send = function(msg)
    {
	_this.sockjs.write(msg);
    }    
    return this;
};

module.exports = SockJS;
