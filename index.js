module.exports = Seq

// TODO: would a linked-list of functions be better? Currently if a function
// calls both next() and error(), weird things happen.
function Seq() {
	var stack = []
	var err = null;
	var sq = {
		seq: function (fn) {
			fn._seq_type = 'seq'
			stack.push(fn)
			return sq;
		},
		catch: function (fn) {
			fn._seq_type = 'catch'
			stack.push(fn)
		},
		next: function () {
			var args = Array.prototype.slice.call(arguments)
			var fn = stack.shift()
			if (err) {
				while (fn && fn._seq_type !== 'catch') {
					fn = stack.shift()
				}
				args = err
				err = null;
			} else {
				while (fn._seq_type === 'catch') {
					fn = stack.shift()
				}
			}
			if (fn) {
				fn.apply(sq, args)
			}
		},
		error: function () {
			err = Array.prototype.slice.call(arguments)
			sq.next()
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
	return sq;
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
