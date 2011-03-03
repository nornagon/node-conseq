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
		}
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
