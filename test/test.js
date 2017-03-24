var debug = require('debug');
var assert = require('assert');
var Promise = require('bluebird');
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
	describe('constructor', function () {
		it('should run successfully', function () {
			var local = new NginxUpstream(tmpTestFile);
			local = new NginxUpstream(tmpTestFile, 'cookietest');
			local = new NginxUpstream(tmpTestFile, 'cookietest', 50);
		});
	});
});

describe('NginxUpstream', function () {
	describe('constructor', function () {
		it('should throw error : nginx config file path required', function () {
			assert.throws(function () {
				var local = new NginxUpstream();
			}, /nginx config file path required/, "did not throw the expected message");
		});
	});
});


describe('NginxUpstream', function () {
	describe('addBackendServer', function () {
		it('should run successfully.', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				done(err);
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('addBackendServer : Add existing backend server', function () {
		it('should return error : Backend server already exists => localhost:3000', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.ifError(err);
				nu.addBackendServer("localhost:3000", function (err) {
					assert.equal(err, 'Backend server already exists => localhost:3000')
					done();
				});
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
					done(err);
				});
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('toggleBackendServer : single backend', function () {
		it('should run successfully.', function (done) {
			// Disable Backend
			nu.toggleBackendServer("localhost:81", function (err) {
				assert.ifError(err);
				// Enable Backend
				nu.toggleBackendServer("localhost:81", function (err) {
					done(err);
				});
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('toggleBackendServer (not existing backend)', function () {
		it('should return error : Backend server not found. => localhost:3000', function (done) {
			nu.toggleBackendServer("localhost:3000", function (err) {
				assert.equal(err, 'Backend server not found. => localhost:3000');
				done();
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('toggleBackendServer : multiple backend', function () {
		it('should run successfully.', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.ifError(err);
				// Disable Backend
				nu.toggleBackendServer("localhost:3000", function (err) {
					assert.ifError(err);
					// Enable Backend
					nu.toggleBackendServer("localhost:3000", function (err) {
						done(err);
					});
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
					done(err);
				});
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('setCompression', function () {
		it('should run successfully.', function (done) {
			nu.setCompression(true, function (err, enable) {
				assert.equal(err, null);
				assert.equal(enable, true);
				nu.setCompression(false, function (err, enable) {
					assert.equal(enable, false);
					done(err);
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
				assert.equal(err, null);
				nu.toggleStickySession(function (err, sticky) {
					assert.equal(sticky, false);
					assert.equal(err, null);
					done();
				});
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('setServer', function () {
		it('should run successfully.', function (done) {
			nu.setServer("www.example.com", "example", function (err) {
				done(err);
			});
		});
	});
});

describe('NginxUpstream', function () {
	describe('Not existing file tests', function () {
		it('should return errors.', function (done) {
			var local = new NginxUpstream("notexistingfile");
			Promise.promisifyAll(local);
			Promise.all(
				local.addBackendServerAsync("notimportant").catch((reason) => {
					if (reason) {
						return Promise.resolve(null);
					} else {
						return Promise.reject('Assert failed')
					}
				}),
				local.backendServerListAsync().catch((reason) => {
					assert.notEqual(reason, null);
				}),
				local.removeBackendServerAsync("notimportant").catch((reason) => {
					assert.notEqual(reason, null);
				})
			).catch(function (reason) {
				done(reason);
			})
		});
	});
});

function assertError(reason) {
	debug(reason);
	assert.notEqual(reason, null);
}