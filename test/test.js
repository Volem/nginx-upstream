var debug = require('debug');
var assert = require('assert');
var Promise = require('bluebird');
var NginxUpstream = require('../index');
var config = require('./config');
var tmpTestFile = './test/test.conf';
var nu = new NginxUpstream(tmpTestFile);
var fs = require('fs');


after(function () {
	//fs.unlinkSync(tmpTestFile);
})

describe('NginxUpstream', function () {
	beforeEach(function (done) {
		var writeCopy = fs.createWriteStream(tmpTestFile);
		var readTemplate = fs.createReadStream(config.testConfigFile);

		readTemplate.pipe(writeCopy);

		writeCopy.on('finish', function () {
			done();
		});
	});

	describe('constructor', function () {
		it('should run successfully', function () {
			var local = new NginxUpstream(tmpTestFile);
			local = new NginxUpstream(tmpTestFile, 'cookietest');
			local = new NginxUpstream(tmpTestFile, 'cookietest', 50);
		});
	});

	describe('constructor', function () {
		it('should throw error : nginx config file path required', function () {
			assert.throws(function () {
				var local = new NginxUpstream();
			}, /nginx config file path required/, "did not throw the expected message");
		});
	});

	describe('addBackendServer', function () {
		it('should run successfully', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				done(err);
			});
		});
	});

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

	describe('removeBackendServer', function () {
		it('should run successfully', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.equal(err, null);
				nu.removeBackendServer("localhost:3000", function (err) {
					done(err);
				});
			});
		});
	});

	describe('removeBackendServer', function () {
		it('should return error : Backend server not found => localhost:300', function (done) {
			nu.removeBackendServer("localhost:300", function (err) {
				assert.equal(err, 'Backend server not found => localhost:300')
				done();
			});
		});
	});

	describe('no backend server block', function () {
		it('should run successfully', function (done) {
			nu.backendServerList(function (err, backends) {
				assert.ifError(err);
				assert.equal(backends.length, 1);
				nu.removeBackendServer(backends[0].host, function (err) {
					assert.ifError(err);
					Promise.promisifyAll(nu);
					nu.addBackendServerAsync("localhost:3000")
						.then(function () {
							return nu.toggleBackendServerAsync("localhost:3000");
						})
						.then(function (status) {
							assert.equal(status, false);
							return nu.removeBackendServerAsync("localhost:3000");
						})
						.then(function () {
							done();
						}).catch(function (error) {
							done(error);
						});
				});
			});
		});
	});

	describe('toggleBackendServer : single backend', function () {
		it('should run successfully', function (done) {
			nu.backendServerList(function (err, backends) {
				assert.ifError(err);
				assert.equal(backends.length, 1);
				// Disable Backend
				nu.toggleBackendServer(backends[0].host, function (err) {
					assert.ifError(err);
					// Enable Backend
					nu.toggleBackendServer(backends[0].host, function (err) {
						done(err);
					});
				});
			});
		});
	});

	describe('toggleBackendServer (not existing backend)', function () {
		it('should return error : Backend server not found. => localhost:3000', function (done) {
			nu.toggleBackendServer("localhost:3000", function (err) {
				assert.equal(err, 'Backend server not found. => localhost:3000');
				done();
			});
		});
	});

	describe('toggleBackendServer : multiple backend', function () {
		it('should run successfully', function (done) {
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

	describe('backendServerList : multiple backend', function () {
		it('should run successfully', function (done) {
			nu.addBackendServer("localhost:3000", function (err) {
				assert.equal(err, null);
				nu.addBackendServer("localhost:4000", function (err) {
					assert.equal(err, null);
					nu.backendServerList(function (err, backends) {
						assert.notEqual(backends, null);
						assert.equal(backends.length, 3);
						done(err);
					});
				});
			});
		});
	});

	describe('backendServerList : single backend', function () {
		it('should run successfully', function (done) {
			nu.backendServerList(function (err, backends) {
				assert.notEqual(backends, null);
				assert.equal(backends.length, 1);
				done(err);
			});
		});
	});

	describe('backendServerList : empty backend', function () {
		it('should run successfully', function (done) {
			nu.backendServerList(function (err, backends) {
				assert.notEqual(backends, null);
				assert.equal(backends.length, 1);
				nu.removeBackendServer(backends[0].host, function (err) {
					nu.backendServerList(function (err, backends) {
						assert.notEqual(backends, null);
						assert.equal(backends.length, 0);
						done(err);
					});
				});
			});
		});
	});

	describe('setCompression', function () {
		it('should run successfully', function (done) {
			nu.setCompression(true, null, function (err, enable) {
				assert.equal(err, null);
				assert.equal(enable, true);
				nu.setCompression(false, ["text/plain", "text/css"], function (err, enable) {
					assert.equal(enable, false);
				});
			});

			// Coverage purposes :)
			nu.setCompression(false, null, function (err, enable) {
				assert.equal(err, null);
				assert.equal(enable, false);
				nu.setCompression(true, ["text/plain", "text/css"], function (err, enable) {
					assert.equal(enable, true);
					done(err);
				});
			});
		});
	});

	describe('toggleStickySession', function () {
		it('should run successfully', function (done) {
			nu.toggleStickySession(function (err, sticky) {
				assert.equal(sticky, true);
				assert.equal(err, null);
				nu.toggleStickySession(function (err, sticky) {
					assert.equal(sticky, false);
					done(err);
				});
			});
		});
	});

	describe('toggleStickySession : toggle enabled sticky with headers', function () {
		it('should run successfully', function (done) {
			nu.toggleStickySession(function (err, sticky) {
				assert.equal(sticky, true);
				assert.equal(err, null);
				nu.toggleStickySession(function (err, sticky) {
					assert.equal(sticky, false);
					assert.equal(err, null);
					nu.toggleStickySession(function (err, sticky) {
						assert.equal(sticky, true);
						done(err);
					});
				});
			});
		});
	});

	describe('setServer', function () {
		it('should run successfully', function (done) {
			nu.setServer("www.example.com", "example", function (err) {
				done(err);
			});
		});
	});



	describe('Not existing file tests', function () {
		it('should return errors', function (done) {
			var local = new NginxUpstream("notexistingfile");

			Promise.promisifyAll(local);
			var rejects = []
			Promise.all([
				local.addBackendServerAsync("notimportant").catch(rejectHandler.bind(rejects)),
				local.backendServerListAsync().catch(rejectHandler.bind(rejects)),
				local.removeBackendServerAsync("notimportant").catch(rejectHandler.bind(rejects)),
				local.toggleBackendServerAsync("notimportant").catch(rejectHandler.bind(rejects)),
				local.toggleStickySessionAsync().catch(rejectHandler.bind(rejects)),
				local.setCompressionAsync(false, null).catch(rejectHandler.bind(rejects)),
				local.addCertificateAsync("notimportant", "anyPath").catch(rejectHandler.bind(rejects)),
				local.removeCertificateAsync().catch(rejectHandler.bind(rejects)),
				local.setServerAsync("notimportant", "notimportant").catch(rejectHandler.bind(rejects))
			]).then(function (value) {
				assert.equal(rejects.length, 9);
				for (var i = 0; i < rejects.length; i++) {
					var reason = rejects[i];
					assert.notEqual(reason, null);
				}
				done();
			}).catch(function (error) {
				done(error);
			});
		});
	});
});

describe('SSL Config', function () {
	beforeEach(function (done) {
		var writeCopy = fs.createWriteStream(tmpTestFile);
		var readTemplate = fs.createReadStream(config.testConfigFileSSL);

		readTemplate.pipe(writeCopy);

		writeCopy.on('finish', function () {
			done();
		});
	});

	describe('addCertificate', function () {
		it('should run successfully', function (done) {
			nu.addCertificate("example", "path", function (err) {
				done(err);
			});
		});
	});

	describe('removeCertificate', function () {
		it('should run successfully', function (done) {
			nu.addCertificate("example", "path", function (err) {
				nu.removeCertificate(function (err) {
					done(err);
				});
			});
		});
	});

	describe('removeCertificate : no certificate defined', function () {
		it('should run successfully', function (done) {
			nu.removeCertificate(function (err) {
				done(err);
			});
		});
	});

	describe('addCertificate : already exists', function () {
		it('should run successfully', function (done) {
			nu.addCertificate("example", "path", function (err) {
				nu.addCertificate("example", "path", function (err) {
					done(err);
				});
			});
		});
	});
});

describe('No Upstream', function () {
	beforeEach(function (done) {
		var writeCopy = fs.createWriteStream(tmpTestFile);
		var readTemplate = fs.createReadStream(config.testConfigFileNoUpstream);

		readTemplate.pipe(writeCopy);

		writeCopy.on('finish', function () {
			done();
		});
	});

	describe('NginxUpstream', function () {
		it('should return error : No upstream block defined', function (done) {
			var local = new NginxUpstream(tmpTestFile);

			Promise.promisifyAll(local);
			var rejects = []
			Promise.all([
				local.addBackendServerAsync("notimportant").catch(rejectHandler.bind(rejects)),
				local.backendServerListAsync().catch(rejectHandler.bind(rejects)),
				local.removeBackendServerAsync("notimportant").catch(rejectHandler.bind(rejects)),
				local.toggleBackendServerAsync("notimportant").catch(rejectHandler.bind(rejects)),
				local.toggleStickySessionAsync().catch(rejectHandler.bind(rejects)),
				local.setServerAsync("www.example.com", "notimportant").catch(rejectHandler.bind(rejects))
			]).then(function (value) {
				assert.equal(rejects.length, 6);
				for (var i = 0; i < rejects.length; i++) {
					var reason = rejects[i];
					assert.notEqual(reason, null);
					assert.equal(reason.message, 'No upstream block defined');
				}
				done();
			}).catch(function (error) {
				done(error);
			});
		});
	});
});

describe('No Server', function () {
	beforeEach(function (done) {
		var writeCopy = fs.createWriteStream(tmpTestFile);
		var readTemplate = fs.createReadStream(config.testConfigFileNoServer);

		readTemplate.pipe(writeCopy);

		writeCopy.on('finish', function () {
			done();
		});
	});

	describe('NginxUpstream', function () {
		it('should return error : No server block defined', function (done) {
			var local = new NginxUpstream(tmpTestFile);

			Promise.promisifyAll(local);
			var rejects = []
			Promise.all([
				local.toggleStickySessionAsync().catch(rejectHandler.bind(rejects)),
				local.setServerAsync("www.example.com", "notimportant").catch(rejectHandler.bind(rejects)),
				local.setCompressionAsync(false, null).catch(rejectHandler.bind(rejects)),
				local.addCertificateAsync("notimportant", "notimportant").catch(rejectHandler.bind(rejects)),
				local.removeCertificateAsync().catch(rejectHandler.bind(rejects))
			]).then(function (value) {
				assert.equal(rejects.length, 5);
				for (var i = 0; i < rejects.length; i++) {
					var reason = rejects[i];
					assert.notEqual(reason, null);
					assert.equal(reason.message, 'No server block defined');
				}
				done();
			}).catch(function (error) {
				done(error);
			});
		});
	});
});

function rejectHandler(reason) {
	this.push(reason);
}