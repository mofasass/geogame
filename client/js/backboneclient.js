/*
TODO:

* Write a description

*/

GeoGame = {
	Views: {},
	Models: {},
	Collections: {},
};

GeoGame.Models.Room = Backbone.Model.extend({

})

GeoGame.Collections.Rooms = Backbone.Collection.extend({

	model: GeoGame.Models.Room,

	initialize: function() {

		_.bindAll(this, 'populate');

		window.socket.emit('rooms'); // Ask what rooms there are
		window.socket.on('rooms', this.populate);
	},

	populate: function(rooms) {
		this.set(rooms);
	},

	addNewRoom: function(roomModel) {
		window.socket.emit('room', roomModel.toJSON());
	}

})

GeoGame.Models.User = Backbone.Model.extend({

	initialize: function() {
		this.listenTo(this, 'change:name', this.sendNewName);
	},

	sendNewName: function() {
		window.socket.emit('user', this.toJSON())
	}

})

GeoGame.Views.StartScreen = Backbone.View.extend({
// Will need to check if display name is taken

	tagName: 'section', // Make the el a <section> element

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

	setDisplayName: function() {
		var displayName = this.$el.find('input').val(),
			text;

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

		text = 'Bla bla bla';
		instructions = new GeoGame.Views.Popup({text: text});
		this.$el.append(instructions.$el);
	}

})

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

GeoGame.Views.Rooms = Backbone.View.extend({

	tagName: 'ul',

	events: {
		'click #create_room': this.createRoom
	},

	initialize: function() {
		this.collection = new GeoGame.Collections.Rooms();
		this.listenTo(this.collection, 'add', this.render);
		this.render();
	},

	render: function() {
		var template = _.template($('#rooms_temp').html());
		this.$el.html(template({rooms: this.collection.toJSON()}));

		alert('as')
	},

	createRoom: function() {
		var room = new GeoGame.Models.Room({
			name: currentUser.get('name')
		});

		this.collection.addNewRoom(room);
		window.Router.navigate('room/' + room.get('name'), {trigger: true});

	}

})

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
		console.log(roomName)
	},

	loadView: function(view) {
		this.view && this.view.remove();
		this.view = view;
		$('body').html(view.$el);
	}

})

/**
* Start backbone history that makes t possible to change the URL without the browser reloading 
* the site
*/

window.currentUser = new GeoGame.Models.User();
window.Router = new GeoGame.Router();
window.socket = io('http://localhost:3000')

Backbone.history.start(); 