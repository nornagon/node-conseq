var assert = require('assert') // to make sure assertion errors in tests get rethrown

module.exports = Seq

function Seq() {
	return new SeqFn(true)
}
Seq.fn = function () {
	return new SeqFn(false)
}

function SeqFn(run_immediately) {
	// TODO: would a linked-list of functions be better? Currently if a function
	// calls both next() and error(), weird things happen.
	this._stack = []
	if (run_immediately) {
		var self = this
		process.nextTick(function () {
			self.catch(function (err) {
				console.error(err.stack ? err.stack : err)
			})
			self.run()
		})
	}
}
SeqFn.prototype.seq = function (fn) {
	var fn_proxy = function () {
		fn.apply(this, arguments)
	}
	fn_proxy._seq_type = 'seq'
	this._stack.push(fn_proxy)
	return this
}
SeqFn.prototype.catch = function (fn) {
	var fn_proxy = function () {
		fn.apply(this, arguments)
	}
	fn_proxy._seq_type = 'catch'
	this._stack.push(fn_proxy)
	return this
}
SeqFn.prototype.on = function () {
	var args = Array.prototype.slice.call(arguments)
	return Seq.fn()
		.seq(function () {
			this.next.apply(this, args)
		}).seq(this)
}
SeqFn.prototype.run = function () {
	var sq = new SeqContext(this._stack.slice())
	sq.next()
	return this
}
SeqFn.prototype.apply = function (ctx, args) {
	function seq() {
		ctx.next.apply(ctx, arguments)
	}
	function ctch() {
		ctx.error.apply(ctx, arguments)
	}
	seq._seq_type = 'seq'
	ctch._seq_type = 'catch'
	var sq = new SeqContext(this._stack.slice().concat([seq,ctch]))
	sq.next.apply(sq, args)
}

function SeqContext(stack) {
	this._stack = stack
	this._parIndex = 0
	this._pars = {}
}

SeqContext.prototype = {
	get next () {
		var that = this
		return function next() {
			var args = Array.prototype.slice.call(arguments)
			var fn = that._stack.shift()

			// skip over any 'catch' functions
			while (fn && fn._seq_type === 'catch') {
				fn = that._stack.shift()
			}

			if (fn) {
				try {
					fn.apply(that, args)
				} catch (e) {
					if (e instanceof assert.AssertionError) { throw e }
					that.error(e)
				}
			}
		}
	},
	get error () {
		var that = this
		return function error() {
			var args = Array.prototype.slice.call(arguments)

			// skip to the next 'catch' function
			var fn = that._stack.shift()
			while (fn && fn._seq_type !== 'catch') {
				fn = that._stack.shift()
			}
			if (fn) {
				fn.apply(that, args)
			}
		}
	},
	get combined () {
		var that = this
		return function combined(err) {
			if (err) {
				that.error(err)
			} else {
				var args = Array.prototype.slice.call(arguments, 1)
				that.next.apply(that, args)
			}
		}
	},
	get seq () {
		var that = this
		return function seq(sequence) {
			var f = function () {
				sequence.apply(that, arguments)
			}
			f._seq_type = 'seq'
			that._stack.unshift(f)
			that.next()
		}
	},
	get par () {
		return this._constructPar(this._parCall)
	},
	get parerror () {
		return this._constructPar(function (idx, args) {
			this._pars.error = args
			this._parCall(idx, args)
		})
	},
	get parcombined () {
		return this._constructPar(function (idx, args) {
			if (args[0]) { this._pars.error = [args[0]] }
			this._parCall(idx, args.slice(1))
		})
	},
	_constructPar: function (f) {
		var idx = this._parIndex++
		var called = false
		var that = this
		return function () {
			if (called) {
				throw "Callback called twice!"
			}
			called = true
			var args = Array.prototype.slice.call(arguments)
			process.nextTick(function () {
				f.call(that, idx, args)
			})
		}
	},
	_parCall: function (idx, args) {
		this._parIndex--
		this._pars[idx] = args.length == 1 ? args[0] : args
		if (this._parIndex == 0) {
			if (this._pars.error) {
				var err = this._pars.error
				this._pars = {}
				this.error.apply(this, err)
			} else {
				var next_args = []
				for (var i in this._pars) {
					next_args[i] = this._pars[i]
				}
				this._pars = {}
				this.next(next_args)
			}
		}
	},
}
