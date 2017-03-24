var assert = require('assert');
var NginxUpstream = require('../index');
var config = require('./config');
var tmpTestFile = './test/test.conf';

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
	var nu = new NginxUpstream(tmpTestFile);
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
	var nu = new NginxUpstream(tmpTestFile);
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
	var nu = new NginxUpstream(tmpTestFile);
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
	var nu = new NginxUpstream(tmpTestFile);
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
	var nu = new NginxUpstream(tmpTestFile);
	describe('setCompression', function () {
		it('should run successfully.', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.equal(err, null);
				nu.setCompression(true, function (err, enable) {
					assert.equal(enable, true);
				});
				nu.setCompression(false, function (err, enable) {
					assert.equal(enable, false);
					done();
				});
			});
		});
	});
});