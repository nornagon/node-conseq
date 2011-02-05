Conseq
======

node-conseq is a small, simple library for handling the nesting explosion. It
is heavily inspired by [node-seq](http://github.com/substack/node-seq).

node-conseq can handle node-style EventEmitter callbacks as well as
error-as-first-argument callbacks.

Examples
========

    var Seq = require('conseq')
    var http = require('http')
    
    Seq()
      .seq(function () {
        http.get({host: 'www.google.com', path: '/index.html'}, this.next)
          .on('error', this.error)
      })
      .seq(function (res) {
        if (res.statusCode == 200) {
          res.on('data', this.next)
        } else {
          this.error({message: 'Error ' + res.statusCode})
        }
      })
      .seq(function (data) {
        console.log("Got data: " + data)
      })
      .catch(function (err) {
        console.log("there was an error! " + JSON.stringify(err))
      })

Use `this.next` as a callback to proceed to the next function in the chain. Use
`this.error` as a callback to be called in an error condition. `this.combined`
is a convenience, meaning:

    function (err, ...) {
      if (err) this.error(err)
      else this.next(...)
    }

Installing
==========
Install with `npm install conseq`.
