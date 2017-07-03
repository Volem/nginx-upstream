var Logger = require('./logbase.js');
var bunyan = require('bunyan');

class BunyanLogger extends Logger {
	constructor(appName) {
		this._logger = bunyan.createLogger({ name: appName });
	}

	_LogDebug(message){
		this._logger.debug(message);
	}

	_LogInfo(message) {
		this._logger.info(message);
	}

	_LogError(err){
		this._logger.error(err);
	}
}

module.exports = BunyanLogger;