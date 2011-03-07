var assert = require('assert')
var Seq = require('../index')

var times = []
function tic() { times.push(new Date()) }
function toc() { return new Date() - times.pop() }

module.exports = {
	'plain seq': function (test) {
		tic()
		var n = 0
		for (var i = 0; i < 10000; i++) {
			Seq()
				.seq(function () {
					n++;
					if (n === 10000) {
						assert.ok(toc() < 150)
						test.finish()
					}
				})
		}
	},
	'two seqs': function (test) {
		tic()
		var n = 0
		for (var i = 0; i < 10000; i++) {
			Seq()
				.seq(function () {
					var that = this
					process.nextTick(function () {
						that.next(4)
					})
				})
				.seq(function (x) {
					assert.equal(x, 4)
					n++;
					if (n === 10000) {
						assert.ok(toc() < 200)
						test.finish()
					}
				})
		}
	},
	'lots of seq': function (test) {
		tic()
		var s = Seq()
		for (var i = 0; i < 10000; i++) {
			s = s.seq(function () {process.nextTick(this.next)})
		}
		s.seq(function () {
			assert.ok(toc() < 200)
			test.finish()
		})
	},
}
