var color = require("./ansi-color.js").set;
require('./date-utils.js');

ELog = {};
ELog.color = color;
ELog.log = function(code, title, details)
{
    //console.log(clc.red.bold('['+code+']') + clc.cyan.bold(title + ' : ') + details);
    var d = new Date();
    console.log(
	color('['+d.toFormat('D-MMM-YYYY HH24:MI:SS')+']', 'green'),
	color('['+code+']', 'red+bold'),
	color(title + ' - ', 'cyan+bold') + details);
}
ELog.clog = function(message, textcolor)
{
    console.log(color(message, textcolor));
//    console.log(message, color);
}

module.exports = ELog;
