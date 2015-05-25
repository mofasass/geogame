/**
 * Set up a namespace for the game
 */

GeoGame = {
  Views: {},
  Models: {},
  Collections: {},
};

/**
 * Custom leaflet marker used for highlighting enemy position
 */

var enemyMarker = L.icon({
    iconUrl: './img/enemy.png',
    iconSize:     [44, 70],
    iconAnchor:   [22, 0]
});

/**
 * Model for keepeing track of what is going on inside a room. This is 
 * the model of the `room` view as well as the `game` view.
 */

GeoGame.Models.Room = Backbone.Model.extend({

  idAttribute: 'name',

  defaults: {
    start: false
  },

  initialize: function() {

    _.bindAll(this, 'updateUsers', 'setGameStarted', 'gameOver');

    this.set({
      users: new GeoGame.Collections.UsersCollection
    });   
  },

  /**
   * Method called for joining this room. Joining a room is done by sending 
   * a join request to the server containing the room name - the server then
   * binds the socket id that the request was sent from to a username, and 
   * adds the `currentUser` to the room.
   */

  joinRoom: function() {
    window.socket.emit('join', this.get('name'));
    window.socket.on('users', this.updateUsers);
    window.socket.on('starting', this.setGameStarted);
    window.socket.on('victory', this.gameOver);
  },

  /**
   * Method called for making `currentUser` leave the room. This method
   * removes all the room specific listeners, and tells the server to remove 
   * the user from the room. 
   */

  leaveRoom: function() {
    window.socket.removeListener('victory', this.gameOver);
    window.socket.removeListener('users', this.updateUsers);
    window.socket.removeListener('start', this.setGameStarted);
    window.socket.emit('leave', {roomName: this.get('name')});
  },

  /**
   * Method called when a user is victorious. The method simply navigates to 
   * the start page of the app, clears all the attributes of the `currentUser`
   * and dsplays a message stating who has won.
   *
   * @param {String} data Contains the name of the winner
   */

  gameOver: function(data) {

    window.Router.navigate('', {trigger: true}); // "restart" game

    var text  = data + ' has won the game!',
      alert = new GeoGame.Views.Popup({text: text}),
      name  = window.currentUser.get('name'),
      newAttrs = window.currentUser.defaults;

    window.currentUser.name = name;

    $('body').append(alert.$el);
    window.currentUser.clear().set(newAttrs); // "reset" user
  },

  /**
   * Called by a socket listener as soon as an attribute of a user us changed.
   * The method receives the new attributes, and updates the user models of the
   * client accordingly.
   *
   * @param {Array} data An array of the users in the room.
   */

  updateUsers: function(data) {
    for (var i = 0; i < data.length; i++) {
      if (data[i].name == window.currentUser.get('name'))
        data[i] = window.currentUser;
    }
    this.get('users').set(data);
  },

  initiateGame: function() {
    window.socket.emit('start');
  },

  setGameStarted: function() {
    this.set({start: true});
  }

})

/**
 * This collection acts as a wrapper for all the rooms. Other models and views 
 * listen to this collection to know wether rooms are created or deleted.
 */

GeoGame.Collections.Rooms = Backbone.Collection.extend({

  model: GeoGame.Models.Room,
    
  initialize: function() {
    _.bindAll(this, 'populate');
    window.socket.on('rooms', this.populate);
  },

  /**
   * Method called when the server sends a list of rooms to the client. 
   * the collection.set method is used here, which is not your commmon `add`
   * method - It will also remove and update rooms to match the supplied 
   * argument exactly.
   *
   * @param {Array} An array of all the currently existing rooms 
   */

  populate: function(rooms) {
    this.set(rooms);
  },

  addNewRoom: function(roomName) {
    window.socket.emit('room', roomName);
  },

  /**
  * Asks the server what rooms there are. This is ran once when initiated.
  */

  askForRooms: function() {
    window.socket.emit('rooms');
  }

})

/**
 * The user model contains besides the player name also the coordinates of the
 * user and the coorinates of the users triangle
 */

GeoGame.Models.User = Backbone.Model.extend({

  idAttribute: 'name',

  defaults: {
    ready: false,
    first: false,
    second: false, 
    third: false
  },

  initialize: function() {
    this.listenTo(this, 'change', this.sendUser);
  },

  checkIfCurrentUser: function() {
    return this === window.currentUser;
  },

  /**
   * Called everytime any attribute in the user is changes. Sends the complete
   * user to the server, so that the server can make the opponent syncronize.
   */

  sendUser: function() {
    if (this.checkIfCurrentUser())
      window.socket.emit('user', this.toJSON());
  }

})

/**
 * User collection. Used in the `room` model to keep track of the users inside 
 * the room. Makes listening to changes of the cempeting users easy, which is
 * why it is used instead of a normal array.
 */

GeoGame.Collections.UsersCollection = Backbone.Collection.extend({
  model: GeoGame.Models.User
})

/**
 * The start screen view.
 */

GeoGame.Views.StartScreen = Backbone.View.extend({

  tagName: 'section',

  events: {
    'click #instructions': 'showInstructions',
    'click #continue_game': 'setDisplayName'
  },

  initialize: function() {
    this.render();
  },

  render: function() {
    var template = _.template($('#startscreen_temp').html());
    this.$el.html(template);
  },

  /**
   * This method is called when the user clicks the "continue" button. 
   * It sets the users name, and tells the router to move on to the `rooms`
   * view if the users indeed specified a username.
   */

  setDisplayName: function() {
    var displayName = this.$el.find('input').val(),
      text, instructions;

    if (!displayName) {
      text = 'Please set a display name before continuing';
      instructions = new GeoGame.Views.Popup({text: text});
      this.$el.append(instructions.$el);
      return;
    }

    window.currentUser.set({
      name: displayName
    });

    window.Router.navigate('rooms', {trigger: true});
  },

  showInstructions: function() {
    var instructions, text;

    text = 'Catch your opponents pointers by creating a triangle that wraps all the opponents pointers - before the opponens wraps all your pointers!';
    instructions = new GeoGame.Views.Popup({text: text});
    this.$el.append(instructions.$el);
  }

})

/**
 * The popup view is used troughout the game as an replacement to the standard 
 * alert window, which is just too ungly to actually be used. 
 * The popup is appended to any element of the DOM - the CSS will make sure that
 * it will appear on top of everything else.
 */

GeoGame.Views.Popup = Backbone.View.extend({

  className: 'popup', // set the class of the el element so I can reference it in the CSS

  events: {
    'click .close': 'remove' // remove is a build in function in backbone that removes the view
  },

  initialize: function(options) {
    this.text = '';
    if (options && options.text)
      this.text = options.text;
    this.render();
  },

  render: function(argument) {
    var template = _.template($('#popup_temp').html());
    this.$el.html(template({text: this.text}));
  }

})

/**
 * The view shoing all the available rooms/games for the user.
 */

GeoGame.Views.Rooms = Backbone.View.extend({

  tagName: 'section',

  events: {
    'click #create_room': 'createRoom',
    'click .game': 'clickedGame'
  },

  initialize: function() {
    this.collection = window.rooms;
    this.collection.askForRooms();
    this.listenTo(this.collection, 'add remove', this.render);
    this.render();
  },

  render: function() {
    var template = _.template($('#rooms_temp').html());
    this.$el.html(template({rooms: this.collection.toJSON()}));
  },

  createRoom: function() {
    this.collection.addNewRoom(currentUser.get('name'));
    this.joinGame(currentUser.get('name'));
  },

  clickedGame: function(e) {
    var gameName = e.currentTarget.dataset.gamename;
    this.joinGame(gameName);
  },

  joinGame: function(gameName) {
    window.Router.navigate('room/' + gameName, {trigger: true});  
  }

})

/*
* View of a user inside a room. 
*/

GeoGame.Views.User = Backbone.View.extend({

  tagName: 'li',

  initialize: function() {
    this.render();
    this.listenTo(this.model, 'all', this.render);
  },

  render: function() {
    var template = _.template($('#user_temp').html()),
      user   = this.model.toJSON();

    this.$el.html(template({user: user}));
    // The class `ready` is added to the `el` for the CSS to highlight
    if (this.model.get('ready')) this.$el.addClass('ready');
  }

})

/**
 * The room view.
 */

GeoGame.Views.Room = Backbone.View.extend({

  tagName: 'section',

  events: {
    'click #ready': 'setReady',
    'click #back': 'backToRooms',
    'click #start': 'initiateGame'
  },

  /**
  * The constructor of this view does besides the regular "setting up listeners"
  * also some checks: It will check if the user visiting the room really is
  * defined (maybe someone just copy-pasted the room URL without setting a
  * display name), and it also checks wether the user is trying to visit a 
  * fulll game.
  * The constructor is wrapped inside a debounce - a delay, that makes 
  * sure that the room has been created on the sserver before the user renders 
  * it. This is a poor design choice which is a result of lack of time - 
  * in a perferct world, the room view would not be initiated befor the server 
  * tells the client that the room has been created. 
  */

  initialize: _.debounce(function(options) {

    var popupGameFull;

    this.model = window.rooms.get(options.room);

    if (this.model === undefined) { // Client visiting room URL that does not exist
      window.Router.navigate('', {trigger: true});
      return;
    }

    if (this.model.get('users').length > 2) { // Game full
      popupGameFull = new GeoGame.Views.Popup({text: 'The game is full'});
      $('body').append(popupGameFull.$el);
      window.Router.navigate('rooms', {trigger: true});
    }

    this.listenTo(this.model, 'change:start', this.startGame);
    this.listenTo(this.model.get('users'), 'add remove', this.render);
    this.listenTo(this.model.get('users'), 'remove', this.maybeClose);
    this.model.joinRoom(); // Must happend after the listener is set up
  }, 500),

  render: function () {

    var template = _.template($('#room_temp').html()),
      name   = this.model.get('name'),
      user;

    this.$el.html(template({room: name}));

    for (var i = 0; i < this.model.get('users').length; i++) {
      user = new GeoGame.Views.User({
        model: this.model.get('users').models[i]
      });
      this.$el.find($('ul').append(user.$el));
    }
  },

  /*
  * If the creator of the room leaves the room, a close signal is sent by 
  * the server to kill this room. This will trigger this user to leave this 
  * room by asking the server to make it leave this room - the server responds
  * with a with an empty list of users for this room, which trigger a remove 
  * event - maybeClose checks is the one checking if the list is empty, and if
  * so, transfers the user to the rooms page.
  */

  maybeClose: function() {
    if (this.model.get('users').models[0].get('name') != this.model.get('name'))
      this.backToRooms();
  },

  /**
   * This is pretty much a render method. It will render the map, which
   * trough CSS places itself above the room view.
   */

  startGame: function() {
    var mapView = new GeoGame.Views.Game({
      model: this.model,
      el: this.$el.find('#map')
    });
  },

  initiateGame: function() {

    var allReady = true,
      text = 'Your opponent has to be ready',
      notAllReady;

    for (var i = 0; i < this.model.get('users').length; i++) {
      if (!this.model.get('users').models[i].get('ready'))
        allReady = false;

    }

    if (allReady && this.model.get('users').length == 2) {
      this.model.initiateGame();
    } else {
      notAllReady= new GeoGame.Views.Popup({text: text});
      this.$el.append(notAllReady.$el);
    }
  },

  /**
   * Called when the `currentUser` clicks ready. The method creates the "start
   * game" button, removes the "Ready" button and sets the `currentUser`
   * attribute `ready` to true.
   */

  setReady: function() {
    var button;
    this.$el.find('#ready').remove();

    // If this user is the owner of the game
    if (this.model.get('name') == window.currentUser.get('name')) {
      button = document.createElement('button');
      button.setAttribute('id', 'start');
      button.className = 'button';
      button.innerHTML = 'Start game';
      this.$el.find('.control-button-set').append(button);
    }
    
    window.currentUser.set({ready: true});

  },

  backToRooms: function() {
    window.currentUser.set({ready: false});
    window.Router.navigate('rooms', {trigger: true});
  },

  remove: function() {

    /*
    * If the view is closed, make sure that the user
    * is removed from the game
    */

    if (this.model) this.model.leaveRoom();

    /*
    * The following code is how the built in backbone.view.remove code, 
    * but since I have overridden the remove method in this view, I have to
    * manually add the rest of the code, so that the view receives its 
    * normal remove behaviour ontop of also remove the user from the room.
    */

        this.undelegateEvents();
        this.$el.remove();
        this.stopListening();
        return this;

  }

})

/**
 * The view that shows the actual map.
 */

GeoGame.Views.Game = Backbone.View.extend({

  events: {
    'click .placecorner': 'placeCorner',
  },

  initialize: function() {

    var opponent;

    this.render();

    // Find the opponent model
    for (var i = 0; i < this.model.get('users').length; i++) {
      if (this.model.get('users').models[i] !== window.currentUser) {
        this.opponent = this.model.get('users').models[i];
        break;
      }
    }

    this.listenTo(this.opponent, 'change:lat change:lng', this.updateOpponent);
    this.listenTo(this.opponent, 'change:first change:second change:third', this.updateCorners);
  },

  render: function() {

    var map = L.map(this.el),
      PlacePinButton, ClearPinsButton

    this.map = map; // Saves the map object to an attribute of this view

    this.$el.addClass('active'); // Make the map visible trough CSS

    map.locate({
      setView: true,
      maxZoom: 16,
      watch: true // Continues watching user position,
    });

    L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png')
      .addTo(map);

    PlacePinButton = L.Control.extend({ // Create a custom leaflet map controler
        options: {
            position: 'bottomright',
        },
        onAdd: function() {
                var placeCorner = L.DomUtil.create('div', 'placecorner');
                return placeCorner;
        }
    });

    // Everytime the `currentUser` is located, plot the position on the map.
    map.on('locationfound', _.bind(this.updatePosition, this));
    map.addControl(new PlacePinButton());

  },

  /**
  * Updates the opponents triangle. It will not plot points, only lines drawn.
  */

  updateCorners: function(opponent) {

    var coords, last, line, endLine,
      lineStyle = {
        color: 'red',
        weight: 2,
        opacity: 1,
        smoothFactor: 1
      };

    if (opponent.changed.second !== undefined) {
      coords = opponent.changed.second;
      last = opponent.get('first');
    } else if (opponent.changed.third !== undefined) {
      coords = opponent.changed.third;
      last = opponent.get('second');
      // Draw a line from the last to the first point to close the triangle
      endLine = new L.Polyline([coords, opponent.get('first')], lineStyle);
      endLine.addTo(this.map);
    }

    if (coords === undefined) return;
    line = new L.Polyline([last, coords], lineStyle);
    line.addTo(this.map);
  },

  updatePosition: function(e) {
    window.currentUser.set({
      lat: e.latlng.lat,
      lng: e.latlng.lng
    });
  },

  /**
   * Called when the user clicks the "place pin" icon ón the bottom right.
   * Places a marker on the map and plots a line if possible. It also updates
   * the user model with the coorinates of the markers, which then is sent to
   * the serer trough the user model.
   */

  placeCorner: function() {

    var coords, last, a, b, line, endLine,
      lineStyle = {
      color: 'white',
      weight: 2,
      opacity: 1,
      smoothFactor: 1
    };

    coords = {
    	lat: window.currentUser.get('lat'),
    	lng: window.currentUser.get('lng')
    };

    if (!window.currentUser.get('first')) {
      window.currentUser.set({first: coords});
    } else if (!window.currentUser.get('second')) {
      window.currentUser.set({second: coords})
      last = 'first';
    } else if (!window.currentUser.get('third')) {
      window.currentUser.set({third: coords})
      last = 'second';
    }

    L.marker(coords).addTo(this.map);
    if (last === undefined) return; // No lines to draw yet
    line = new L.Polyline([window.currentUser.get(last), coords], lineStyle);

    if (last == 'second') {
      // Draw a line from the last to the first point to close the triangle
      endLine = new L.Polyline([window.currentUser.get('third'),
                    window.currentUser.get('first')],
                    lineStyle);
      endLine.addTo(this.map);
    }
    line.addTo(this.map);
  },

  /**
   * Method for updating the position of the opponent. 
   *
   * @param {Object} opponentModel The model of the opponent
   */

  updateOpponent: function(opponenModel) {

    var lat = opponenModel.get('lat'),
      lng = opponenModel.get('lng');

    if (!this.opponentMarker) {

      this.opponentMarker = L.marker([lat, lng], {icon: enemyMarker})
        .addTo(this.map);
    } else {
      this.opponentMarker.setLatLng([lat, lng]).update();
    }
    
  },

  /**
  * Since the `el` element is hardcoded in this view, it should not be removed
  * when the view is removed - it should simply be emptied, so that it can
  * be re-used. Also, the map fullscreen mode is deactivated, and the location
  * listener is deactivated.
  */

  remove: function() {
    this.map.stopLocate()
    this.$el.removeClass('active');
        this.undelegateEvents();
        this.$el.empty();
        this.stopListening();
        return this;
  }

})

/**
 * The router of the game. In this app, the router is used by the different views
 * to render the different sections of the game. To make this behaviour possible, 
 * the `loadView` method has been written that removes the old view rendered, and 
 * inserts a new view into the DOM. 
 */

GeoGame.Router = Backbone.Router.extend({

  routes: {
    '': 'start',
    'rooms': 'showRooms',
    'room/:roomName': 'showRoom'
  },

  start: function() {
    this.loadView(new GeoGame.Views.StartScreen());
  },

  showRooms: function() {
    this.loadView(new GeoGame.Views.Rooms());
  },

  showRoom: function(roomName) {
    this.loadView(new GeoGame.Views.Room({room: roomName}));
  },

  loadView: function(view) {
    this.view && this.view.remove();
    this.view = view;
    $('main').html(view.$el);
  }

})

/**
 * Make sure that sub objects in models get serialized correctly.
 * For example, collections inside models do not get serialized 
 * properly when called `toJSON` on the model without this change.
 */

Backbone.Model.prototype.toJSON = function() {
    var json = _.clone(this.attributes);
    for (var attr in json) {
        if ((json[attr] instanceof Backbone.Model) ||
            (json[attr] instanceof Backbone.Collection)) {
            json[attr] = json[attr].toJSON();   
        }
    }
    return json;
};

/**
 * Setting up globals. Even though all globals live in the window namespace, 
 * it is also written here to make the code more readable.
 */

window.socket = io('http://localhost:3000')
window.currentUser = new GeoGame.Models.User();
window.rooms = new GeoGame.Collections.Rooms();
window.Router = new GeoGame.Router();

Backbone.history.start(); // Starts the app.