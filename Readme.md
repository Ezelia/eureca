eureca becomes eureca.io !
==========================
Please use [**eureca.io**](https://github.com/Ezelia/eureca.io) instead of eureca,

[**eureca.io**](https://github.com/Ezelia/eureca.io) is a more advanced version providing better features and cleaner code.


eureca repository is preserved here for reference, or if you are not yet ready to move to eureca.io



-------------------------------------------------------------------------------------------------------
eureca
======

eureca (easy unobstructive remote call) is a node.js RPC library using sockjs as a network layer.
it's inspired from nowjs library, but intend to be simpler and provide only the strict necessary stuff to do RPC correctly.

This is the firs release, many bug may exist!


Setup and test
==============

    npm install eureca

### test
     node --harmony-proxies node_modules/eureca/test/rmi.js

note the usage of --harmony-proxies command line argument, this switch enables harmony proxies witch is used by eureca library (for more information about harmony proxies see this link http://wiki.ecmascript.org/doku.php?id=harmony:proxies)

it you don't use --harmony-proxies, eureca will still work using a workaround but this is not recommanded. 



usage example
=============

### Server side

```js
var EURECA  = require('eureca').EURECA;

//the allow parameter define witch function names are accepted in the client side.
//the configuration bellow will unable server to call foo() and bar() ine the client side if the client define them
var eureca = new EURECA({allow : ['foo', 'bar']});
Server = eureca.exports;  //all functions declared in this namespace will be availbale to clients

//EURECA Server side functions exposed to clients
Server.add = function(a, b) {
return a+b;
};
///////////////////////////////////////////////////


eureca.install(app);

```


### client side

```html
<html>
  <head>
    <script src="/eureca.js"></script>
  </head>
<body>
<script>
 var eureca = new EURECA();  
 var me = eureca.exports;   //function defined inside this namespace can be called from server if they are allowed 


 me.foo = function(a) {   // the function foo() was allowed by server so it'll be available
    alert('FOO() '+a);
 } 
</script>
```

### Server side (Call client functin)

since the client defined a function called foo() we can call it, but first we need to get the client instance
the onConnect event provide a useful callback to handle incoming connections, we will use it to get the client instance and call foo()

```js
    eureca.onConnect(function(conn) {
    client = eureca.getClient(conn.id);
        client.foo(' From server');
    });
```

you can use the onConnect callback to keep track of your clients so you can use them later.



### Client side (Call server functin)

in the client side, the code is simpler, since we don't need to find the server instance, Eureca object will directly expose remote function

to call server side add function, all we have to do is 

```js
    eureca.add(10, 20);  // eureca is an instance of EURECA()
```

we can add a callback function to get the result

```js
    eureca.add(10, 20, function(result) {
    console.log('the result is ', result);
    });
```



