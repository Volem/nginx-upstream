'use strict';
var Logger = require('./logbase.js');
var bunyan = require('bunyan');


class BunyanLogger extends Logger {
	constructor(appName) {
		super();
		this.Logger = bunyan.createLogger({
			name: appName,
			streams: [
				{
					level: 'info',
					stream: process.stdout            
				},
				{
					level: 'error',
					path: './log/' + appName + '.log'
				}
			]
		});
	}

	_LogDebug(message) {
		this.Logger.debug(message);
	}

	_LogInfo(message) {
		this.Logger.info(message);
	}

	_LogError(err) {
		this.Logger.error(err);
	}
}

module.exports = BunyanLogger;