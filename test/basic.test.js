var assert = require('assert')
var Seq = require('../index')

var addFour = Seq.fn()
	.seq(function (x) {
		this.next(x+4)
	})

module.exports = {
	'seq': function (test) {
		Seq()
			.seq(function () {
				this.next(4)
			})
			.seq(function (x) {
				assert.equal(x, 4)
				test.finish()
			})
	},
	'catch': function (test) {
		Seq()
			.seq(function () {
				this.error('foo')
			})
			.seq(function () {
				assert.ok(false)
			})
			.catch(function (e) {
				assert.equal(e, 'foo')
				test.finish()
			})
	},
	'seqfn': function (test) {
		Seq()
			.seq(addFour.on(12))
			.seq(function (x) {
				assert.equal(x, 16)
				test.finish()
			})
	},
	'spliced seqfn': function (test) {
		Seq()
			.seq(function () {
				var x = 3
				this.seq(addFour.on(x))
			})
			.seq(function (y) {
				assert.equal(y, 7)
				test.finish()
			})
	},
	'spliced function': function (test) {
		Seq()
			.seq(function () {
				var that = this
				var x = 3
				this.seq(function () {
					assert.equal(that, this)
					test.finish()
				})
			})
	},
	'lonely seqfn': function (test) {
		addFour.on(12)
			.seq(function (x) {
				assert.equal(x, 16)
				test.finish()
			})
			.catch(function () {
				assert.ok(false)
			})
			.run()
	},
	'seqfn twice': function (test) {
		Seq()
			.seq(addFour.on(6))
			.seq(addFour)
			.seq(function (x) {
				assert.equal(x, 14)
				test.finish()
			})
	},
	'seqfn in parallel': function (test) {
		Seq()
			.seq(function start() {
				addFour.on(12).seq(this.par).run()
				addFour.on(16).seq(this.par).run()
			})
			.seq(function check(xs) {
				assert.equal(xs[0], 16)
				assert.equal(xs[1], 20)
				test.finish()
			})
	}
}
