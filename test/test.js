var assert = require('assert');
var NginxUpstream = require('../index');
var config = require('./config');
var tmpTestFile = './test/test.conf';
var nu = new NginxUpstream(tmpTestFile);
var fs = require('fs');

beforeEach(function (done) {
	var writeCopy = fs.createWriteStream(tmpTestFile);
	var readTemplate = fs.createReadStream(config.testConfigFile);

	readTemplate.pipe(writeCopy);

	writeCopy.on('finish', function () {
		done();
	});
});

describe('NginxUpstream', function () {
	describe('addBackendServer', function () {
		it('should run successfully.', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.equal(err, null);
				done();
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('removeBackendServer', function () {
		it('should run successfully.', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.equal(err, null);
				nu.removeBackendServer("localhost:3000", function (err) {
					assert.equal(err, null);
					done();
				});
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('toggleBackendServer', function () {
		it('should run successfully.', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.equal(err, null);
				nu.toggleBackendServer("localhost:3000", function (err) {
					assert.equal(err, null);
					done();
				});
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('backendServerList', function () {
		it('should run successfully.', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.equal(err, null);
				nu.backendServerList(function (err, backends) {
					assert.notEqual(backends, null);
					assert.equal(backends.length, 2);
					done();
				});
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('setCompression', function () {
		it('should run successfully.', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.equal(err, null);
				nu.setCompression(true, function (err, enable) {
					assert.equal(err, null);
					assert.equal(enable, true);
				});
				nu.setCompression(false, function (err, enable) {
					assert.equal(err, null);
					assert.equal(enable, false);
					done();
				});
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('toggleStickySession', function () {
		it('should run successfully.', function (done) {
			nu.toggleStickySession(function (err, sticky) {
				assert.equal(sticky, true);
				nu.toggleStickySession(function (err, sticky) {
					assert.equal(sticky, false);
					done();
				});
			});
		});
	});
});