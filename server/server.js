/**
 * The server side js for the game "Game of triangles".
 * Please see the readme for documentation.
 */

'use strict'

var http      = require('http').createServer(),
    io        = require('socket.io')(http),
    Promise   = require('bluebird'),
    overlay   = require('./overlay'),
    knex = require('knex')({
      client: 'sqlite3',
      connection: {
        filename: './app.db'
      }
    }),
    bookshelf = require('bookshelf')(knex);

var GeoGame = {}; // Set up game namespaace

/**
 * The user model. This model is resposible for checking if the user has won
 */ 

GeoGame.User = bookshelf.Model.extend({

  idAttribute: 'name',

  initialize: function() {
    this.listenTo(this, 'change', this.checkIfWon);
  },

  /**
   * Called every time an attribute of the user id changed. 
   * Checks wether the user has won by applying out `overlay` function to the
   * coordinates.
   *
   * @param {Object} model The user model that triggered the event.
   */

  checkIfWon: function(model) {

    var first    = model.get('first'),
        second   = model.get('second'),
        third    = model.get('third'),
        socketId = model.get('socket'),
        thisName = model.get('name'),
        room     = io.sockets.connected[socketId].room,
        opponent, opponentCoords, thisCoords, ratio, winner, room;

    if (room === undefined) return;
    
    for (var i = 0; i < rooms.get(room).get('users').length; i++) {
      if (rooms.get(room).get('users').models[i].get('name') != thisName)
        opponent = rooms.get(room).get('users').models[i];
    }

    // For somebody to win, at least one user has to have put down 3 pins. 
    if ((opponent !== undefined &&
      !((opponent.get('first') && opponent.get('second') && opponent.get('third')) ||
        (model.get('first') && model.get('third') && model.get('third')))) || 
        opponent === undefined
        ) {
      return;
    }

   /**
    * Since the function that checks wether triangles overlap requires an array
    * of two objects, where every object contains three points (triangles, duh)
    * we need to create points if any user has not yeat places all three pins. 
    * So, what what is happening here is that, lets say point two and three is 
    * not yet placed by a user, points one is cloned and added as point two and
    * three aswell - this is to make the function work, which was initially
    * designed by us for a 3 vs 3 setup, where non-existing points like this were... 
    * Nonexisting. 
    */

    opponentCoords = [opponent.get('first'),
                      opponent.get('second'),
                      opponent.get('third')];

    if (!opponentCoords[1])
      opponentCoords[1] = opponentCoords[0];
    if (!opponentCoords[2])
      opponentCoords[2] = opponentCoords[1];

    thisCoords = [first, second, third];

    if (!thisCoords[1])
      thisCoords[1] = first;
    if (!thisCoords[2])
      thisCoords[2] = thisCoords[1];

    ratio = overlay(thisCoords, opponentCoords, 'extreme');

    if (ratio[0] == 1) {
      winner = model.get('name');
    } else if (ratio[1] == 1) {
      winner = opponent.get('name');
    }

    if (winner !== undefined) {
      room = io.sockets.connected[model.get('socket')].room;
      io.sockets.to(room).emit('victory', winner);
    }
  }
})

/**
 * The room model
 */

GeoGame.Room = bookshelf.Model.extend({

  idAttribute: 'name',

  initialize: function() {
    this.set({
      users: new GeoGame.Users
    });

    this.get('users').on('add remove', this.emitUsers.bind(this));
    this.get('users').on('remove', this.maybeDeleteRoom.bind(this));
  },

  /**
   * Triggered as soon as a user either joins or leaves the room. 
   * Sends a list of the users in the room to the client when this happend.
   * The client will then update the visuals accordingly.
   */

  emitUsers: function() {
    io.to(this.get('name')).emit('users', this.get('users').toJSON());
  },

  /**
   * Triggered only when users leaves the room. Checks wether the room is
   * empty, and if so, deletes the rooom
   */

  maybeDeleteRoom: function() {
    if (this.get('users').length == 0)
      rooms.remove(this.get('name'));
  }

})

/**
 * Collections holding on to all the rooms. This is initiated as a global
 * variable, and keeps track of all the existing rooms. 
 */

GeoGame.Rooms = bookshelf.Collection.extend({
  model: GeoGame.Room,

  initialize: function() {
    this.on('all', this.emitRooms, this); 
  },

  /**
   * Sends out a list of all the rooms to the clients as soon as a room is
   * either added or eleted
   */

  emitRooms: function() {
    // Tell the client how all the rooms look
    io.sockets.emit('rooms', rooms.listRooms());
  },

  /**
  * Used to create a list of all the available rooms. This is used instead of
  * running toJSON on the collection, because running toJSON will create an array
  * of the `users` attribute, which would replace the users _COLLECTION_ on the 
  * front end (each room has a users collection front end just like here on the
  * server side) with the array. We don't want that, so we simply create a list
  * all room names with this method instead.
  */

  listRooms: function() {
    var rooms = this.toJSON();
    for (var i = 0; i < this.length; i++) {
      delete rooms[i].users;
    }
    return rooms;
  }
});

/**
 * Collection of users. Used a a global variable to keep track of all the
 * connected clients. 
 */

GeoGame.Users = bookshelf.Collection.extend({
  model: GeoGame.User
});

io.sockets.on('connection', function(socket) {

  // Host is starting the game, tell the other player
  socket.on('start', function() {
    io.sockets.to(socket.room).emit('starting');
  });

  // Client asking what rooms there are
  socket.on('rooms', function() {
    socket.emit('rooms', rooms.listRooms());
  });

  // Client creating a room
  socket.on('room', function(roomName) {
    var room = new GeoGame.Room({name: roomName});
    rooms.add(room);
  });

  // Client joining a room
  socket.on('join', function(roomName) {

    var thisUser = users.find(function(obj) {
      return obj.get('socket') == socket.id;
    });

    socket.join(roomName);
    socket.room = roomName; // add an attribute to the socket to reference later
    rooms.get(roomName).get('users').add(thisUser);

  });

  // Client leaving a room
  socket.on('leave', function(data) {

    var thisUser = users.find(function(obj) {
      return obj.get('socket') == socket.id;
    });

    socket.leave(data.roomName);
    socket.room = undefined;
    rooms.get(data.roomName).get('users').remove(thisUser.get('name'));
  })

  /**
  * When the client sends something to the 'user' channel, 
  * that means that the user attributes should be updated.
  * This method makes sure that if the user is in a room, the other
  * user in teh room are notified about the user changes (such as a
  * new position).
  */

  socket.on('user', function(data) {

    var thisUser = users.find(function(obj) {
      return obj.get('socket') == socket.id;
    });

    if (thisUser !== undefined) {
      thisUser.set(data);
    } else {
      thisUser = new GeoGame.User(data);
      thisUser.set({socket: socket.id});
      users.add(thisUser);
    }

    if (socket.room !== undefined) {
      socket.to(socket.room).emit(
        'users', rooms.get(socket.room).get('users').toJSON()
      );
    }
  });

  // Socket connetion is lost
  socket.on('disconnect', function() {

    var thisUser;

    if (socket.room) {
      socket.leave(socket.room);
      thisUser = users.find(function(obj) {
        return obj.get('socket') == socket.id;
      });
      rooms.get(socket.room).get('users').remove(thisUser);
    }
  });

});

// Globals
var rooms = new GeoGame.Rooms();
var users = new GeoGame.Users();

http.listen(3000, function(){
  console.log('listening on *:3000');
});