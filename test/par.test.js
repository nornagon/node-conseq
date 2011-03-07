var Seq = require('../index.js')
var assert = require('assert')

function report(x, cb) {
	process.nextTick(function () {
		cb(x)
	})
}

module.exports = {
	'par': function (test) {
		Seq()
			.seq(function () {
				var that = this;
				[1,2,3].forEach(function (x) {
					report(x, that.par)
				})
			})
			.seq(function (results) {
				assert.deepEqual(results, [1,2,3])
				test.finish()
			})
	},
	'par error': function (test) {
		Seq()
			.seq(function () {
				report(1, this.par)
				report(4, this.parerror)
			})
			.seq(function () {
				assert.ok(false)
			})
			.catch(function (err) {
				assert.equal(err, 4)
				test.finish()
			})
	},
	'parcombined error': function (test) {
		Seq()
			.seq(function () {
				var that = this;
				report(123, that.parcombined);
				[1,2,3].forEach(function (x) {
					report(x, that.par)
				})
			})
			.seq(function () {
				assert.ok(false)
			})
			.catch(function (err) {
				assert.equal(err, 123)
				test.finish()
			})
	},
	'immediate callback': function (test) {
		Seq()
			.seq(function start() {
				this.par(4)
				this.par(16)
			})
			.seq(function check(xs) {
				assert.equal(xs[0], 4)
				assert.equal(xs[1], 16)
				test.finish()
			})
	},
}
