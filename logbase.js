'use strict';
const Debug = require('debug');


class LogBase {
	constructor(namespace) {
		if(!namespace){
			this.debug = Debug('development');
			return;
		}
		this.debug = Debug(namespace);
	}

	Debug(message) {
		this.debug(message);
		this._LogDebug(message);
	}

	Info(message) {
		this.debug(message);
		this._LogInfo(message);
	}

	Error(message) {
		this.debug(message);
		this._LogError(new Error(message));
	}
}

module.exports = LogBase;