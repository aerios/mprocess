var x = process.argv[2]
var y = process.argv[3]

if(x && y){
	console.log(x * y)
}else{
	console.log("Please define parameter x and y")
}