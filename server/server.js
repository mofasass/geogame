
'use strict'

var http = require('http').createServer(),
    io   = require('socket.io')(http),
    rooms = [],
    users = {};

io.sockets.on('connection', function(socket) {
  users[socket.id] = {};  // Save the socket ID 

  /*
  * When the client sends something to the 'user' channel, 
  * that means that the user attributes should be updated.
  */

  socket.on('rooms', function() {
    socket.emit('rooms', rooms);
  });

  socket.on('room', function(data) {
    rooms.push(data);
    socket.emit('rooms', rooms);
  });

  socket.on('user', function(data) {
    users[socket.id] = data;
  });

  socket.on('disconnect', function() {
    delete users[socket.id];
  });

});









http.listen(3000, function(){
  console.log('listening on *:3000');
});