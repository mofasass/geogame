var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var counter = 0;

app.get('/', function(req, res){
  res.sendfile('index.html');
});

io.sockets.on('connection', function(socket) {

    //send data to client
    setInterval(function(){
        socket.emit('date', {'date': new Date()});
    }, 1000);
	
	socket.on('disconnect', function() {
		console.log("out");
	});
	
	socket.on('lolipop', function(data) {
		console.log(data);
	});
	
	socket.on('pos', function(data) {
	
		// Log on server
		console.log(data.user + " is in [" + data.lat + ", " + data.lng + "] at " + data.timestamp);
		console.log("Positions recieved: " + (++counter));
		
		// Send back to client
		socket.emit('posToClient', {
			user: data.user,
			color: data.color,
			lat: data.lat,
			lng: data.lng,
			timestamp: data.timestamp
		});
	});
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});