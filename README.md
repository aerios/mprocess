# mprocess.js

Simple ChildProcess module wrapper

NodeJS has great module that handle creating, manipulating, and destroying child processes using simple module called Child Process (https://nodejs.org/api/child_process.html). Personally, I think Child Process module compensates javascript single-threaded nature when an application needs to consume more CPU power explicitly. MProcess was developed when I need to send commands to child processes and retrieve the responses. Although this functionality is already managed by Child Process `.send()`, but it lacks state management when a parent process send several commands / messages to several child processes. MProcess works well on maintaining the state of a message ("tell which message is responding which command"). Currently, MProcess only wraps `spawn()` and `fork()` method.

## Installation

`$ npm install mprocess`

## API

### Constructor
```javascript
MProcess(command[,args,][, type][, options])
```
#### Parameters
- command   : The command to run
- args      : Array of arguments for `command`. Default to empty array
- type      : Type of runner. Currently support MProcess.FORK to invoke `fork` or MProcess.SPAWN to invoke `spawn`. Default to MProcess.SPAWN
- options   : Object containing parameter that will control the behaviour of invoked process. Accept all parameter defined in https://nodejs.org/api/child_process.html. Default to `{}`
#### Return
MProcess Object

### Methods

- `run()`    
    After creating new MProcess, the process itself is not automatically created. To create the process, invoke `run()`
- `kill([code])`    
    Kill the underlying process. Custom signal can ben passed to child process via `code`
- `done(fn)`    
    Receive callback as parameter that is invoked when the child process is exited.
    + `fn(ret)` 
            `ret` could be an integer with 0 value, or an object containing `code` and `signal` if the child process not cleanly exited
- `clone()`     
    Create new `MProcess` object based on current instance of `MProcess`
- `send(messsage)`  
    Send `message` to child process. Note that `send()` can only be used if `MProcess` instance is initiated using `MProcess.FORK` type. Return `Promise` and will `resolve` if child process successfully response, and `reject` if child process can't response in timely fashion. 
- `getProcess()`    
    Return `ChildProcess` object of the current instance of `MProcess` or null if `run()` has not been called previously.
- `onStdOutFinish(fn)`  
    Receive callback as parameter that is invoked when the child process finish streaming its standard output. Callback not fired if you supply `options` during instantiation with `{stdio : 'inherit'}`
    + `fn(str)` 
            `str` contains the output string
- `onStdOutError(fn)`   
    Receive callback as parameter that is invoked when the child process experience errors and writing to its std err. Callback not fired if you supply `options` during instantiation with `{stdio : 'inherit'}`
    + `fn(str)` 
            `str` contains the error string

## How to use

### SPAWN

```javascript
var MProcess = require("mprocess")
var processPath = "/path/to/some/javascript/file"
var instance = new MProcess("node",[processPath],MProcess.SPAWN);
instance.run()
instance.done(function(code){
    //code == 0
}) 

```

### FORK

`main.js`
```javascript
var MProcess = require("mprocess")
var processPath = "/path/to/some/worker/file"
var instance = new MProcess("node",[processPath],MProcess.FORK);
instance.run()
instance.send("here my message").then(function(resp){
    // resp contains valid javascript object
}).catch(console.error)
instance.done(function(code){
    //code == 0
}) 

```

To be able answer on parent process `send()`, the worker script must able to do this : 
```javascript
process.on("message",function(message){
    var id = message.id; // message id, internally created by MProcess
    var data = message.data; // will contains 'here my message'
    // some process
    var response = {valid javascript object}
    process.send({
        id : id,
        data : response
    })
})
```

## GitHub

https://github.com/aerios/mprocess

