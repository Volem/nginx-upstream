"use strict";
var nginxConf = require('nginx-conf').NginxConfFile;
var SecureCallback = require('secure-callback');
var debug = require('debug')('Development');

var secure = new SecureCallback();

function backendServerExists(servers, checkedHost) {
    if (servers == undefined) {
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
    if (checkedHost != undefined) {
        var checkedHostStr = new String(checkedHost);
        return !checkedHostStr.endsWith('down');
    }
    return null;
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
                secure.respond(callback, err);
                debug(err);
                return;
            }
            if (backendServerExists(conf.nginx.upstream.server, host) == -1) {
                conf.nginx.upstream._add('server', host);
                conf.flush();
                setTimeout(function () {
                    secure.respond(callback, null);
                    debug('Backend server added => %s', host);
                }, filesyncTime);
                return;
            } else {
                secure.respond(callback, 'Backend server already exists => ' + host);
                debug('Backend server already exists => %s', host);
            }
        });
    }

    backendServerList(callback) {
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                secure.respond(callback, err);
                debug(err);
                return;
            }

            if (conf.nginx.upstream == 'undefined') {
                secure.respond(callback, 'No upstream block defined');
                debug('No upstream block defined');
                return;
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
            secure.respond(callback, null, serversDTO);
            debug('List of backend servers returned');
            return;
        });
    }

    removeBackendServer(host, callback) {
        var filesyncTime = this.FileSyncTime;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                secure.respond(callback, err);
                debug(err);
                return;
            }

            if (conf.nginx.upstream == 'undefined') {
                secure.respond(callback, 'No upstream block defined');
                debug('No upstream block defined');
                return;
            }

            var serverIndex = backendServerExists(conf.nginx.upstream.server, host);
            if (serverIndex > -1) {
                conf.nginx.upstream._remove('server', serverIndex);
                conf.flush();
                setTimeout(function () {
                    secure.respond(callback, null);
                    debug('Backend server removed => ' + host);
                }, filesyncTime);
                return;
            } else {
                secure.respond(callback, 'Backend server not found => ' + host);
                debug('Backend server not found => ' + host);
            }
        });
    }

    toggleBackendServer(host, callback) {
        var filesyncTime = this.FileSyncTime;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                secure.respond(callback, err);
                debug(err);
                return;
            }

            if (conf.nginx.upstream == 'undefined') {
                secure.respond(callback, 'No upstream block defined');
                debug('No upstream block defined');
                return;
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
                    secure.respond(callback, null, enabled);
                    debug(message);
                }, filesyncTime);
                return;
            } else {
                secure.respond(callback, 'Backend server not found. => ' + host);
                debug('Backend server not found. => ' + host);
            }
        });
    }

    setCompression(enable, callback) {
        var filesyncTime = this.FileSyncTime;
        var configFile = this.NginxConfigFilePath;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                secure.respond(callback, err);
                debug(err);
                return;
            }

            if (conf.nginx.upstream == 'undefined') {
                secure.respond(callback, 'No upstream block defined');
                debug('No upstream block defined');
                return;
            }

            conf.nginx.server.gzip._value = enable ? 'on' : 'off';
            conf.flush();
            setTimeout(function () {
                secure.respond(callback, null, enable);
                debug('Compression is ' + (enable ? 'enabled' : 'disabled') + ' for config : ' + configFile);
            }, filesyncTime);
            return;
        });
    }

    toggleStickySession(callback) {
        var filesyncTime = this.FileSyncTime;
        var cookieName = this.CookieName;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                secure.respond(callback, err);
                debug(err);
                return;
            }

            if (conf.nginx.upstream == 'undefined') {
                secure.respond(callback, 'No upstream block defined');
                debug('No upstream block defined');
                return;
            }

            if (conf.nginx.upstream.ip_hash) {
                conf.nginx.upstream._remove('ip_hash');
                setStickyCookie(conf, cookieName, false);
                conf.flush();
                setTimeout(function () {
                    secure.respond(callback, null, false);
                    debug('Sticky sessions disabled');
                }, filesyncTime);
                return;
            }

            conf.nginx.upstream._add('ip_hash');
            setStickyCookie(conf, cookieName, true);
            conf.flush();
            setTimeout(function () {
                secure.respond(callback, null, true);
                debug('Sticky sessions enabled');
            }, filesyncTime);
            return;
        });
    }

    setServer(fqdn, sitename, callback) {
        var filesyncTime = this.FileSyncTime;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                secure.respond(callback, err);
                debug(err);
                return;
            }
            try {
                conf.nginx.server.server_name._value = fqdn;
                if (conf.nginx.upstream) {
                    conf.nginx.upstream._value = sitename;
                }
                var proxypass = conf.nginx.server.location.proxy_pass._value;
                conf.nginx.server.location.proxy_pass._value = 'http://' + sitename;
                conf.flush();
            }
            catch (ex) {
                secure.respond(callback, ex);
                debug(ex);
                return;
            }
            setTimeout(function () {
                secure.respond(callback, null);
                debug('Listen server updated. => ' + fqdn);
            }, filesyncTime);
            return;
        });
    }

    addCertificate(sitename, certificateLocationPath, callback) {
        var filesyncTime = this.FileSyncTime;
        var configFile = this.NginxConfigFilePath;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                secure.respond(callback, err);
                debug(err);
                return;
            }
            try {
                // Removing certificate lines just to be sure that there is no duplication in nginx conf file.
                conf.nginx.server._remove('ssl_certificate');
                conf.nginx.server._remove('ssl_certificate_key');
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
            }
            catch (ex) {
                secure.respond(callback, ex);
                debug(ex);
                return;
            }
            setTimeout(function () {
                secure.respond(callback, null);
                debug('SSL Certificate Paths Set. => ' + configFile);
            }, filesyncTime);
            return;
        });
    }

    removeCertificate(sitename, callback) {
        var filesyncTime = this.FileSyncTime;
        var configFile = this.NginxConfigFilePath;
        nginxConf.create(this.NginxConfigFilePath, function (err, conf) {
            if (err) {
                secure.respond(callback, err);
                debug(err);
                return;
            }
            try {
                conf.nginx.server._remove('ssl_certificate');
                conf.nginx.server._remove('ssl_certificate_key');
                if (!conf.nginx.server.return) {
                    conf.nginx.server._add('return 444');
                }
                conf.flush();
            }
            catch (ex) {
                secure.respond(callback, ex);
                debug(ex);
                return;
            }
            setTimeout(function () {
                secure.respond(callback, null);
                debug('SSL Certificate Paths Set. => ' + configFile);
            }, filesyncTime);
            return;
        });
    }
}

module.exports = NginxUpstream;