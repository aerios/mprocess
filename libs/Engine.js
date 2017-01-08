var underscore = require('underscore');
var Promise = require("when/es6-shim/Promise")
var spawn = require('child_process').spawn;
var fork = require('child_process').fork;
var util = require('util');
var EventEmitter = require("events").EventEmitter
var MessageReceiver = require("./MessageReceiver")

var alphabetList = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
var createRandomId = function(num) {
	var str = ""
	num = num || 10;
	while (num--) {
		str += alphabetList.charAt(Math.random() * (alphabetList.length - 1));
	}
	return str;
}

var Mailbox = {}

function setMessageDelivery(instance,messageId,resolver,rejecter,message){	
	// console.log(messageId)
	var tid = setTimeout(function(){		
		rejecter(new Error("Process not receiving response from send() after 5 minutes : "+JSON.stringify(message)))
	},5 * 1000 * 60)
	Mailbox[messageId] = {
		resolver:resolver,
		rejecter:rejecter,
		message:message,
		timeout:tid,
		id:messageId
	}	
}

function MyProcess(proc, args, type, stdOpt) {
	var that = this;
	this._doneStack = []
	this._messageStack = {}
	this._rawMessageEmitter = new EventEmitter

	this.options = {}
	this._child = null;
	this.stdPrOut = {
		resolve:null,
		reject:null
	}
	this._stdPr = new Promise(function(resolve,reject){
		that.stdPrOut.resolve = resolve;
		that.stdPrOut.reject = reject
	})
	type = type || MyProcess.SPAWN;
	this.options.proc = proc;
	this.options.args = args;
	this.options.type = type;
	this.options.stdOpt = stdOpt;
	if (type == MyProcess.DETACH_MODE) {
		var out = stdOpt.out;
		var err = stdOpt.err;
		this.options.stdOpt = {};
		this.options.stdOpt.stdio = ['ignore'];
		this.options.stdOpt.detached = true;
		if (out) this.options.stdOpt.stdio.push(out);
		if (out && err) this.options.stdOpt.stdio.push(err);
		this.options.type = MyProcess.SPAWN;
		this._detachOnInit = true;
	} else {
		this.options.stdOpt = this.options.stdOpt || {};
	}
}

function run() {

	if (!this.options.proc) throw new Error("No process specified")
	if (this._child) return this.promise;;

	var child;
	var type = this.options.type;
	var stdOpt = this.options.stdOpt;
	var proc = this.options.proc;
	var args = this.options.args
	var stdBuffer = "";
	var that = this;
	//flush done stack
	if (type == 'spawn') {
		child = spawn(proc, args, stdOpt);
		if(child.stdout){
			child.stdout.on("data",function(str){				
				stdBuffer += str.toString()
			}).on("close",function(){
				that.stdPrOut.resolve(stdBuffer.trim());
			}).on("error",function(err){
				that.stdPrOut.reject(err)
			})
		}
	} else if (type == 'fork') {
		var path = args.shift();
		stdOpt.stdio = 'ignore';
		child = fork(path, args, stdOpt);
	}

	this._child = child;
	var pr = new Promise(function(resolve, reject) {
		child.on('exit', function(code, signal) {
			if (!code) {
				resolve(code)
			} else {
				var err = new Error("Process exited with code "+code+" and signal "+signal)
				err.code = code;
				err.signal = signal
				reject(err)
			}
		})
	});

	while (this._doneStack.length) {
		var dfn = this._doneStack.shift()
		pr.then(dfn, dfn)
	}
	this.promise = pr;

	if (this._detachOnInit) {
		child.unref();
	}	
	if(this._child.listeners("message").length == 0){
		this._child.on("message",function(message){
			var id = message.id;
			var data =  message.data;
			var isError = message.is_error
			if(id){
				// console.log(id,that)
				var metaData = Mailbox[id];
				clearTimeout(metaData.timeout);
				var resolver = metaData.resolver;
				var rejecter = metaData.rejecter;
				if(isError){
					var err = new Error("Error on child worker")
					if(underscore.isObject(data)){
						underscore.extend(err,data)
					}else{
						err = new Error(data)
					}
					rejecter(err)
				}else{
					resolver(data);
				}
				Mailbox[id] = null;
			}else{
				that._rawMessageEmitter.emit("message",message)
			}
		})
	}
	return pr;
}

function kill(signal) {
	if (this._child && !this._is_killed_invoked) {
		this._is_killed_invoked = true;
		this._child.kill(signal)
	}else{
		throw new Error("Child already exited");
	}
}

function done(fn) {
	if (this._child) {
		this.promise.then(fn, fn)
	} else {
		this._doneStack.push(fn)
	}
}

function clone() {
	return new MyProcess(
		this.options.proc,
		this.options.args,
		this.options.type,
		this.options.stdOpt
	)
}

function send(data) {
	var that = this;
	var pr = new Promise(function(resolve, reject) {
		if (that._child) {
			if (that.options.type == MyProcess.FORK) {
				var rid = createRandomId()
				var message = {
					data: data,
					id: rid
				}
				setMessageDelivery(that,rid,resolve,reject,message)			
				that._child.send(message)
			}else{
				reject(new Error("Unforked process can't use send() method"))
			}
		}else{
			reject(new Error("Process hasn't been run"))
		}
	})
	return pr;
}

function tell(data){
	if(this._child.send){
		this._child.send(data)
	}else{
		throw new Error("send() method is not available")
	}
}

function getProcess(){
	return this._child;
}

function onStdOutFinish(fn){
	this._stdPr.then(fn)
}

function onStdOutError(fn){
	this._stdPr.catch(fn)
}

function onMessage(fn){
	this._rawMessageEmitter.on("message",fn)
}

MyProcess.prototype.run = run;
MyProcess.prototype.kill = kill;
MyProcess.prototype.done = done;
MyProcess.prototype.clone = clone;
MyProcess.prototype.send = send;
MyProcess.prototype.tell = tell
MyProcess.prototype.ask = send;
MyProcess.prototype.getProcess = getProcess
MyProcess.prototype.onStdOutFinish = onStdOutFinish
MyProcess.prototype.onStdOutError = onStdOutError
MyProcess.prototype.onMessage = onMessage


MyProcess.SPAWN = "spawn";
MyProcess.FORK = "fork";
MyProcess.DETACH_MODE = 'detach_mode';
MyProcess.getMessageReceiver = function(){
	return new MessageReceiver()
}

module.exports = MyProcess;
