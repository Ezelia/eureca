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

see test directory
