var Promise = require("bluebird")
var underscore = require("underscore")

function MessageReceiver(){

	this._receiveHandler = function(){}
	this.receive = function(fn){
		this._receiveHandler = fn
	}
	var that = this;
	process.on("message",function(message){
		var id = message.id;
		var data = message.data
		var processingResult = null
		try {
			if ( !underscore.isArray(data) ) {
				processingResult = that._receiveHandler.call(null,data)
			} else {
				processingResult = that._receiveHandler.apply(null,data)
			}
			if ( underscore.isFunction(processingResult.then ) ) {
				processingResult.then(function(result){
					process.send({
						id : id,
						data : result
					})
				}).catch(function(reason){
					process.send({
						id : id,
						is_error : true,
						data : reason
					})
				})
			} else {
				process.send({
					id : id,
					data : processingResult
				})
			}	
		}catch(e){
			console.log("Error on child worker",e.stack)
			process.send({
				id : id,
				is_error : true,
				data : e
			})
		}
		
	})
}

module.exports = MessageReceiver
