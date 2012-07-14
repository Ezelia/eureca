eureca
======

eureca is a small nodejs RPC library, it is inspired from nowjs but uses sockjs instead of socket.io

the goal is to keep eureca as simple as possible, and handle the strict necessary stuff to allow RPC to work properly.

Features :
 - Call server side functions from client
 - Call client side functions from server
 - clientside callback to handle server response (for functions that reture something)
 - auto reconnect client when connection is lost
 - server side helpers to handle events onConnect, onDiconnect, onData and onError


This is the first beta release, it may contain many bugs !
