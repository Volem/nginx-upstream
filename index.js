'use strict';
var nginxConf = require('nginx-conf').NginxConfFile;
var SecureCallback = require('secure-callback');
var BunyanLogger = require('./bunyanlogger.js');
var LogBase = require('./logbase.js');
var logger = new LogBase();

var secure = new SecureCallback();

function backendExists(servers, checkedHost) {
	if (!servers) {
		return -1;
	}
	for (var i = 0; i < servers.length; i++) {
		if (servers[i]._value == checkedHost || servers[i]._value == checkedHost + ' down') {
			return i;
		}
	}
	if (servers._value == checkedHost || servers._value == checkedHost + ' down') {
		return 0;
	}

	return -1;
}

function backendEnabled(checkedHost) {
	var checkedHostStr = new String(checkedHost);
	return !checkedHostStr.endsWith('down');
}

function setStickyCookie(conf, cookieName, enable) {
	var headers = conf.nginx.server.location.add_header;
	var isEnabled = false;
	for (var index = 0; index < headers.length; index++) {
		var element = headers[index];
		if (enable) {
			if (element._value == 'Set-Cookie "' + cookieName + '=true; Expires=Thu, 01-Jan-1970 00:00:01 GMT"') {
				isEnabled = true;
				conf.nginx.server.location.add_header[index]._value = 'Set-Cookie "' + cookieName + '=true"';
			}
		} else {
			if (element._value == 'Set-Cookie "' + cookieName + '=true"') {
				conf.nginx.server.location.add_header[index]._value = 'Set-Cookie "' + cookieName + '=true; Expires=Thu, 01-Jan-1970 00:00:01 GMT"';
			}
		}
	}
	if (enable && !isEnabled) {
		conf.nginx.server.location._add('add_header Set-Cookie "' + cookieName + '=true"');
	}
}

String.prototype.endsWith = function (suffix) {
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

class NginxUpstream {
	get NginxConfigFilePath() {
		return this._nginxConfigFilePath;
	}

	set NginxConfigFilePath(v) {
		this._nginxConfigFilePath = v;
	}

	get FileSyncTime() {
		return this._fileSyncTime;
	}

	set FileSyncTime(v) {
		this._fileSyncTime = v;
	}

	constructor(nginxConfigFilePath, fileSyncTime, namespace) {
		if (!nginxConfigFilePath) {
			logger.Error('nginx config file path required');
			throw new Error('nginx config file path required');
		}
		logger = new BunyanLogger('nginx-upstream', namespace);
		this.NginxConfigFilePath = nginxConfigFilePath;
		this.FileSyncTime = fileSyncTime || 50;
	}

	addBackend(host, callback) {
		let filesyncTime = this.FileSyncTime;
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			let commonException = handleCommonFileExceptions(err, path, err || conf.nginx.upstream);
			if (commonException) {
				return secure.respond(callback, commonException);
			}

			if (backendExists(conf.nginx.upstream.server, host) == -1) {
				conf.nginx.upstream._add('server', host);
				conf.flush();
				setTimeout(function () {
					logger.Info('Backend server added => ' + host + '. File : ' + path);
					secure.respond(callback, null);
				}, filesyncTime);
				return;
			} else {
				logger.Info('Backend server already exists => ' + host + '. File : ' + path);
				secure.respond(callback, 'Backend server already exists => ' + host);
			}
		});
	}

	backendList(callback) {
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			let commonException = handleCommonFileExceptions(err, path, err || conf.nginx.upstream);
			if (commonException) {
				return secure.respond(callback, commonException);
			}

			let serversDTO = [];
			let server = conf.nginx.upstream.server;
			if (server && Array.isArray(server)) {
				serversDTO = new Array(server.length);
				for (let i = 0; i < server.length; i++) {
					serversDTO[i] = {
						host: server[i]._value.replace(' down', ''),
						enabled: backendEnabled(server[i]._value)
					};
				}
			} else if (server) {
				serversDTO = new Array(1);
				serversDTO[0] = {
					host: server._value.replace(' down', ''),
					enabled: backendEnabled(server._value)
				};
			} else {
				logger.Info('No backend server defined under upstream. File : ' + path);
			}
			return secure.respond(callback, null, serversDTO);
		});
	}

	removeBackend(host, callback) {
		let filesyncTime = this.FileSyncTime;
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			let commonException = handleCommonFileExceptions(err, path, err || conf.nginx.upstream);
			if (commonException) {
				return secure.respond(callback, commonException);
			}

			var serverIndex = backendExists(conf.nginx.upstream.server, host);
			if (serverIndex > -1) {
				conf.nginx.upstream._remove('server', serverIndex);
				conf.flush();
				setTimeout(function () {
					logger.Info('Backend server removed => ' + host + '. File : ' + path);
					secure.respond(callback, null);
				}, filesyncTime);
				return;
			} else {
				logger.Info('Backend server not found => ' + host + '. File : ' + path);
				return secure.respond(callback, 'Backend server not found => ' + host);
			}
		});
	}

	toggleBackend(host, callback) {
		let filesyncTime = this.FileSyncTime;
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			let commonException = handleCommonFileExceptions(err, path, err || conf.nginx.upstream);
			if (commonException) {
				return secure.respond(callback, commonException);
			}
			
			let serverIndex = backendExists(conf.nginx.upstream.server, host);
			if (serverIndex > -1) {
				let server = conf.nginx.upstream.server;
				let backendValue;
				if (server && Array.isArray(server)) {
					backendValue = server[serverIndex]._value;
				} else {
					backendValue = server._value;
				}

				let message = '';
				let enabled = null;

				if (backendValue.indexOf('down') == -1) {
					if (server && Array.isArray(server)) {
						server[serverIndex]._value = server[serverIndex]._value + ' down';
					} else {
						server._value = server._value + ' down';
					}
					message = 'Disabled backend server => ' + host;
					enabled = false;
				} else {
					if (server && Array.isArray(server)) {
						server[serverIndex]._value = host;
					} else {
						server._value = host;
					}
					message = 'Enabled backend server => ' + host;
					enabled = true;
				}
				conf.flush();
				setTimeout(function () {
					(message);
					logger.Info(message + '. File : ' + path);
					secure.respond(callback, null, enabled);
				}, filesyncTime);
				return;
			} else {
				logger.Info('Backend server not found. => ' + host + '. File : ' + path);
				return secure.respond(callback, 'Backend server not found. => ' + host);
			}
		});
	}

	setCompression(enable, types, callback) {
		let filesyncTime = this.FileSyncTime;
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			let commonException = handleCommonFileExceptions(err, path, err || conf.nginx.upstream);
			if (commonException) {
				return secure.respond(callback, commonException);
			}

			if (!conf.nginx.server) {
				logger.Error('No server block defined');
				return secure.respond(callback, 'No server block defined');
			}

			if (!conf.nginx.server.gzip) {
				conf.nginx.server._add('gzip ' + (enable ? 'on' : 'off'));
			} else {
				conf.nginx.server.gzip._value = (enable ? 'on' : 'off');
			}
			var gzipTypesConfig = 'text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript';
			if (Array.isArray(types)) {
				gzipTypesConfig = '';
				gzipTypesConfig = types.reduce(function (element, gzipTypesConfig) {
					return gzipTypesConfig + ' ' + element;
				});
				gzipTypesConfig.slice(0, -1);
			}
			if (!conf.nginx.server.gzip_types) {
				conf.nginx.server._add('gzip_types ' + gzipTypesConfig);
			} else {
				conf.nginx.server.gzip_types._value = gzipTypesConfig;
			}
			if (!conf.nginx.server.gunzip) {
				conf.nginx.server._add('gunzip on');
			}
			conf.flush();
			setTimeout(function () {
				logger.Info('Compression is ' + (enable ? 'enabled' : 'disabled') + ' for config : ' + path);
				secure.respond(callback, null, enable);
			}, filesyncTime);
			return;
		});
	}

	toggleStickySession(cookieName, callback) {
		let filesyncTime = this.FileSyncTime;
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			let commonException = handleCommonFileExceptions(err, path, err || conf.nginx.upstream);
			if (commonException) {
				return secure.respond(callback, commonException);
			}
			
			if (!conf.nginx.server) {
				logger.Error('No server block defined');
				return secure.respond(callback, 'No server block defined');
			}

			if (conf.nginx.upstream.ip_hash) {
				conf.nginx.upstream._remove('ip_hash');
				setStickyCookie(conf, cookieName, false);
				conf.flush();
				setTimeout(function () {
					logger.Info('Sticky sessions disabled. File ' + path);
					secure.respond(callback, null, false);
				}, filesyncTime);
				return;
			}

			conf.nginx.upstream._add('ip_hash');
			setStickyCookie(conf, cookieName, true);
			conf.flush();
			setTimeout(function () {
				logger.Info('Sticky sessions enabled. File ' + path);
				secure.respond(callback, null, true);
			}, filesyncTime);
			return;
		});
	}

	setServer(fqdn, sitename, setUpstream, callback) {
		let filesyncTime = this.FileSyncTime;
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			if (err) {
				logger.Error(err);
				return secure.respond(callback, err);
			}
			if (conf.nginx.server && conf.nginx.server.server_name) {
				conf.nginx.server.server_name._value = fqdn;
				if (setUpstream) {
					if (!conf.nginx.upstream) {
						logger.Error('No upstream block defined');
						return secure.respond(callback, 'No upstream block defined');
					}
					conf.nginx.upstream._value = sitename;
				}
				conf.nginx.server.location.proxy_pass._value = 'http://' + sitename;
				conf.flush();
			} else {
				logger.Error('No server block defined');
				return secure.respond(callback, 'No server block defined');
			}
			setTimeout(function () {
				logger.Info('Listen server updated. => ' + fqdn + ' . File' + path);
				secure.respond(callback, null);
			}, filesyncTime);
			return;
		});
	}

	addCertificate(sitename, certificateLocationPath, callback) {
		let filesyncTime = this.FileSyncTime;
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			if (err) {
				logger.Error(err);
				return secure.respond(callback, err);
			}
			if (!conf.nginx.server) {
				logger.Error('No server block defined');
				return secure.respond(callback, 'No server block defined');
			}
			// Removing certificate lines just to be sure that there is no duplication in nginx conf file.
			if (conf.nginx.server.ssl_certificate) {
				conf.nginx.server._remove('ssl_certificate');
			}
			if (conf.nginx.server.ssl_certificate_key) {
				conf.nginx.server._remove('ssl_certificate_key');
			}
			if (!conf.nginx.server.return) {
				conf.nginx.server._add('return', '444');
			}
			var certFileNameWithoutExtension = certificateLocationPath + sitename;
			conf.nginx.server._add('ssl_certificate', certFileNameWithoutExtension + '.pem');
			conf.nginx.server._add('ssl_certificate_key', certFileNameWithoutExtension + '.key');
			if (conf.nginx.server.return) {
				conf.nginx.server._remove('return');
			}
			conf.flush();
			setTimeout(function () {
				logger.Info('SSL Certificate Paths Set. => ' + path);
				secure.respond(callback, null);
			}, filesyncTime);
			return;
		});
	}

	removeCertificate(callback) {
		let filesyncTime = this.FileSyncTime;
		let path = this.NginxConfigFilePath;
		nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
			if (err) {
				logger.Error(err);
				return secure.respond(callback, err);
			}
			if (!conf.nginx.server) {
				logger.Error('No server block defined');
				return secure.respond(callback, 'No server block defined');
			}
			if (conf.nginx.server.ssl_certificate) {
				conf.nginx.server._remove('ssl_certificate');
			}
			if (conf.nginx.server.ssl_certificate_key) {
				conf.nginx.server._remove('ssl_certificate_key');
			}
			if (!conf.nginx.server.return) {
				conf.nginx.server._add('return 444');
			}
			conf.flush();
			setTimeout(function () {
				logger.Info('SSL Certificate Paths Set. => ' + path);
				secure.respond(callback, null);
			}, filesyncTime);
			return;
		});
	}
}

function handleCommonFileExceptions(err, filePath, upstream) {
	if (err) {
		logger.Error(new Error(err));
		return err;
	}

	if (!upstream) {
		logger.Error(new Error('No upstream block defined'));
		return 'No upstream block defined';
	}
	return null;
}

module.exports = NginxUpstream;