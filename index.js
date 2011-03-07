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
	if (fn instanceof SeqFn) {
		this._stack = this._stack.concat(fn._stack)
	} else {
		fn._seq_type = 'seq'
		this._stack.push(fn)
	}
	return this
}
SeqFn.prototype.catch = function (fn) {
	fn._seq_type = 'catch'
	this._stack.push(fn)
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
	var parIndex = 0
	var pars = {}

	var stack = this._stack.slice()

	var sq = {
		next: function () {
			var args = Array.prototype.slice.call(arguments)
			var fn = stack.shift()

			// skip over any 'catch' functions
			while (fn && fn._seq_type === 'catch') {
				fn = stack.shift()
			}

			if (fn) {
				try {
					fn.apply(sq, args)
				} catch (e) {
					if (e instanceof assert.AssertionError) { throw e }
					sq.error(e)
				}
			}
		},
		error: function () {
			var args = Array.prototype.slice.call(arguments)

			// skip to the next 'catch' function
			var fn = stack.shift()
			while (fn && fn._seq_type !== 'catch') {
				fn = stack.shift()
			}
			if (fn) {
				fn.apply(sq, args)
			}
		},
		combined: function (err) {
			if (err) {
				sq.error(err)
			} else {
				var args = Array.prototype.slice.call(arguments, 1)
				sq.next.apply(sq, args)
			}
		},
		seq: function (sequence) {
			stack = sequence._stack.concat(stack)
			sq.next()
		},
		get par () {
			return sq._constructPar(sq._parCall)
		},
		get parerror () {
			return sq._constructPar(function (idx, args) {
				pars.error = args
				sq._parCall(idx, args)
			})
		},
		get parcombined () {
			return sq._constructPar(function (idx, args) {
				if (args[0]) { pars.error = [args[0]] }
				sq._parCall(idx, args.slice(1))
			})
		},
		_constructPar: function (f) {
			var idx = parIndex++
			var called = false
			return function () {
				if (called) {
					throw "Callback called twice!"
				}
				called = true
				var args = Array.prototype.slice.call(arguments)
				var that = this
				process.nextTick(function () {
					f.call(that, idx, args)
				})
			}
		},
		_parCall: function (idx, args) {
			parIndex--
			pars[idx] = args.length == 1 ? args[0] : args
			if (parIndex == 0) {
				if (pars.error) {
					var err = pars.error
					pars = {}
					sq.error.apply(sq, err)
				} else {
					var next_args = []
					for (var i in pars) {
						next_args[i] = pars[i]
					}
					pars = {}
					sq.next(next_args)
				}
			}
		},
	}

	sq.next()
	return this
}
