var responseStr = process.argv[2]
process.on("message",function(message){
	var id = message.id;
	var data = message.data;

	process.send({
		id : id,
		data : responseStr+data
	})

})