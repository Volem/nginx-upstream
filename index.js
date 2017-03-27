"use strict";
var nginxConf = require('nginx-conf').NginxConfFile;
var SecureCallback = require('secure-callback');
var debug = require('debug')('Development');

var secure = new SecureCallback();

function backendServerExists(servers, checkedHost) {
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

function backendServerEnabled(checkedHost) {
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

    get CookieName() {
        return this._cookieName;
    }
    set CookieName(v) {
        this._cookieName = v;
    }

    constructor(nginxConfigFilePath, cookieName, fileSyncTime) {
        if (!nginxConfigFilePath) {
            throw new Error("nginx config file path required");
        }
        this.NginxConfigFilePath = nginxConfigFilePath;
        this.FileSyncTime = fileSyncTime || 10;
        this.CookieName = cookieName || "myappcookie";
    }

    addBackendServer(host, callback) {
        var filesyncTime = this.FileSyncTime;

        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);;
            }
            if (!conf.nginx.upstream) {
                debug('No upstream block defined');
                return secure.respond(callback, 'No upstream block defined');
            }
            if (backendServerExists(conf.nginx.upstream.server, host) == -1) {
                conf.nginx.upstream._add('server', host);
                conf.flush();
                setTimeout(function () {
                    debug('Backend server added => %s', host);
                    secure.respond(callback, null);
                }, filesyncTime);
                return;
            } else {
                debug('Backend server already exists => %s', host);
                secure.respond(callback, 'Backend server already exists => ' + host);
            }
        });
    }

    backendServerList(callback) {
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);
            }

            if (!conf.nginx.upstream) {
                debug('No upstream block defined');
                return secure.respond(callback, 'No upstream block defined');
            }
            var serversDTO = [];
            var server = conf.nginx.upstream.server;
            if (server && server.constructor === Array) {
                serversDTO = new Array(server.length);
                for (var i = 0; i < server.length; i++) {
                    serversDTO[i] = {
                        host: server[i]._value.replace(' down', ''),
                        enabled: backendServerEnabled(server[i]._value)
                    };
                }
            } else if (server) {
                serversDTO = new Array(1);
                serversDTO[0] = {
                    host: server._value.replace(' down', ''),
                    enabled: backendServerEnabled(server._value)
                };
            } else {
                debug('No backend server defined under upstream');
            }
            debug('List of backend servers returned');
            return secure.respond(callback, null, serversDTO);
        });
    }

    removeBackendServer(host, callback) {
        var filesyncTime = this.FileSyncTime;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);
            }

            if (!conf.nginx.upstream) {
                debug('No upstream block defined');
                return secure.respond(callback, 'No upstream block defined');
            }

            var serverIndex = backendServerExists(conf.nginx.upstream.server, host);
            if (serverIndex > -1) {
                conf.nginx.upstream._remove('server', serverIndex);
                conf.flush();
                setTimeout(function () {
                    debug('Backend server removed => ' + host);
                    secure.respond(callback, null);
                }, filesyncTime);
                return;
            } else {
                debug('Backend server not found => %s', host);
                return secure.respond(callback, 'Backend server not found => ' + host);
            }
        });
    }

    toggleBackendServer(host, callback) {
        var filesyncTime = this.FileSyncTime;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);
            }

            if (!conf.nginx.upstream) {
                debug('No upstream block defined');
                return secure.respond(callback, 'No upstream block defined');
            }
            var serverIndex = backendServerExists(conf.nginx.upstream.server, host);
            if (serverIndex > -1) {
                var server = conf.nginx.upstream.server;
                var backendServerValue;
                if (server && server.constructor === Array) {
                    backendServerValue = server[serverIndex]._value;
                } else {
                    backendServerValue = server._value;
                }

                var message = '';
                var enabled = null;

                if (backendServerValue.indexOf('down') == -1) {
                    if (server && server.constructor === Array) {
                        server[serverIndex]._value = server[serverIndex]._value + ' down';
                    } else {
                        server._value = server._value + ' down';
                    }
                    message = 'Disabled backend server => ' + host;
                    enabled = false;
                } else {
                    if (server && server.constructor === Array) {
                        server[serverIndex]._value = host;
                    } else {
                        server._value = host;
                    }
                    message = 'Enabled backend server => ' + host;
                    enabled = true;
                }
                conf.flush();
                setTimeout(function () {
                    debug(message);
                    secure.respond(callback, null, enabled);
                }, filesyncTime);
                return;
            } else {
                debug('Backend server not found. => ' + host);
                return secure.respond(callback, 'Backend server not found. => ' + host);
            }
        });
    }

    setCompression(enable, callback) {
        var filesyncTime = this.FileSyncTime;
        var configFile = this.NginxConfigFilePath;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);
            }
            if (!conf.nginx.server) {
                debug('No server block defined');
                return secure.respond(callback, 'No server block defined');
            }
            conf.nginx.server.gzip._value = enable ? 'on' : 'off';
            conf.flush();
            setTimeout(function () {
                debug('Compression is ' + (enable ? 'enabled' : 'disabled') + ' for config : ' + configFile);
                secure.respond(callback, null, enable);
            }, filesyncTime);
            return;
        });
    }

    toggleStickySession(callback) {
        var filesyncTime = this.FileSyncTime;
        var cookieName = this.CookieName;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);
            }

            if (!conf.nginx.upstream) {
                debug('No upstream block defined');
                return secure.respond(callback, 'No upstream block defined');
            }
            if (!conf.nginx.server) {
                debug('No server block defined');
                return secure.respond(callback, 'No server block defined');
            }

            if (conf.nginx.upstream.ip_hash) {
                conf.nginx.upstream._remove('ip_hash');
                setStickyCookie(conf, cookieName, false);
                conf.flush();
                setTimeout(function () {
                    debug('Sticky sessions disabled');
                    secure.respond(callback, null, false);
                }, filesyncTime);
                return;
            }

            conf.nginx.upstream._add('ip_hash');
            setStickyCookie(conf, cookieName, true);
            conf.flush();
            setTimeout(function () {
                debug('Sticky sessions enabled');
                secure.respond(callback, null, true);
            }, filesyncTime);
            return;
        });
    }

    setServer(fqdn, sitename, callback) {
        var filesyncTime = this.FileSyncTime;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);
            }
            if (conf.nginx.server && conf.nginx.server.server_name) {
                conf.nginx.server.server_name._value = fqdn;
                if (!conf.nginx.upstream) {
                    debug('No upstream block defined');
                    return secure.respond(callback, 'No upstream block defined');
                }
                conf.nginx.upstream._value = sitename;
                var proxypass = conf.nginx.server.location.proxy_pass._value;
                conf.nginx.server.location.proxy_pass._value = 'http://' + sitename;
                conf.flush();
            } else {
                debug('No server block defined');
                return secure.respond(callback, 'No server block defined');
            }
            setTimeout(function () {
                debug('Listen server updated. => ' + fqdn);
                secure.respond(callback, null);
            }, filesyncTime);
            return;
        });
    }

    addCertificate(sitename, certificateLocationPath, callback) {
        var filesyncTime = this.FileSyncTime;
        var configFile = this.NginxConfigFilePath;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);
            }
            if (!conf.nginx.server) {
                debug('No server block defined');
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
                conf.nginx.server._add('return 444');
            }
            var certFileNameWithoutExtension = certificateLocationPath + sitename;
            conf.nginx.server._add('ssl_certificate', certFileNameWithoutExtension + '.pem');
            conf.nginx.server._add('ssl_certificate_key', certFileNameWithoutExtension + '.key');
            if (conf.nginx.server.return) {
                conf.nginx.server._remove('return');
            }
            conf.flush();
            setTimeout(function () {
                debug('SSL Certificate Paths Set. => ' + configFile);
                secure.respond(callback, null);
            }, filesyncTime);
            return;
        });
    }

    removeCertificate(callback) {
        var filesyncTime = this.FileSyncTime;
        var configFile = this.NginxConfigFilePath;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                debug(err);
                return secure.respond(callback, err);
            }
            if (!conf.nginx.server) {
                debug('No server block defined');
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
                debug('SSL Certificate Paths Set. => ' + configFile);
                secure.respond(callback, null);
            }, filesyncTime);
            return;
        });
    }
}

module.exports = NginxUpstream;