var MProcess = require("../index")
var expect = require("chai").expect
var sinon = require("sinon")
var underscore = require('underscore')
var Promise = require("when/es6-shim/Promise")

describe("MProcess",function(){
	it("should be able to spawn new process",function(done){
		var processPath = __dirname + "/process/simple.js"
		var instance = new MProcess("node",[processPath]);
		instance.run()
		instance.done(function(code){
			expect(code).to.be.equal(0)
			done()
		})
	})
	it("should be able to SPAWN and receive output from child",function(done){
		var x = 2;
		var y = 3;
		var processPath = __dirname + "/process/simple.js"
		var instance = new MProcess("node",[processPath]);
		var instance2 = new MProcess("node",[processPath,2,3]);
		instance.run()
		instance2.run()
		var text
		var after = underscore.after(4,function(){
			done()
		})
		instance.onStdOutFinish(function(str){
			expect(str).to.be.equal('Please define parameter x and y');
			after();
		})		
		instance2.onStdOutFinish(function(str){
			expect(str).to.be.equal("6");
			after();
		})
		instance.done(function(code){
			expect(code).to.be.equal(0)
			after();
		})		
		instance2.done(function(code){
			expect(code).to.be.equal(0)
			after();
		})
	})

	it("should be able to FORK and receive response from child",function(done){

		var message = new Date().getTime();
		var param = "Message delivered "
		var worker = new MProcess("node",[__dirname + "/process/worker.js",param],MProcess.FORK);
		worker.run();
		worker.send(message).then(function(resp){
			expect(resp).to.be.equal(param +message)
			done()
		}).catch(done)
	})
	it("should be able to KILL child",function(done){

		var message = new Date().getTime();
		var param = "Message delivered "
		var worker = new MProcess("node",[__dirname + "/process/worker.js",param],MProcess.FORK);
		worker.run();
		worker.done(function(ret){
			if(ret == 0){
				done(new Error("Child should not exited normally"))
			}else{
				expect(ret.signal).to.be.equal("SIGTERM")
				done()
			}
		})
		worker.kill();
	})
})