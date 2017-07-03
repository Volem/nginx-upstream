'use strict';

class LogBase {
	Debug(message){
		this._LogDebug(message);
	}

	Info(message){
		this._LogInfo(message);
	}
	
	Error(message){
		this._LogError(new Error(message));
	}
}

module.exports = LogBase;