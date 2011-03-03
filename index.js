var assert = require('assert') // to make sure assertion errors in tests get rethrown

module.exports = Seq

// TODO: would a linked-list of functions be better? Currently if a function
// calls both next() and error(), weird things happen.
function Seq() {
	var stack = []

	var pars = {}
	var parIndex = 0

	var sq = {
		seq: function (fn) {
			fn._seq_type = 'seq'
			stack.push(fn)
			return sq
		},
		catch: function (fn) {
			fn._seq_type = 'catch'
			stack.push(fn)
			return sq
		},
		end: function () {
			// don't perform any more actions
			stack = []
		},
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
			} else {
				sq.end()
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
			} else {
				sq.end()
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
				f.call(this, idx, args)
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
	process.nextTick(function () {
		sq.catch(function (err) {
			console.error(err.stack ? err.stack : err)
		})
		sq.next()
	})
	return sq
}

/* Seq()
 *  .seq(function () {
 *    file.read('/dagdfg').on('success', this.next)
 *    // ... this(data)
 *  })
 *  .seq(function (data) {
 *    // do things with data
 *  })
 */
