GeoGame = {
	Views: {},
	Models: {}
};

GeoGame.Models.User = Backbone.Model.extend({

})

GeoGame.Views.StartScreen = Backbone.View.extend({
// Will need to check if display name is taken

	tagName: 'section', // Make the el a <section> element

	events: {
		'click instruction': 'showInstructions'
	},

	initialize: function() {
		this.render();
	}

	render: function() {
		var template = _.template($('#startscreen_temp'));
		this.$el.html(template);
	},

	showInstructions: function() {
		var instructions, text;

		text = 'Bla bla bla';
		instructions = new GeoGame.View.Popup({text: text});
		this.$el.append(instructions.$el);
	}

})

GeoGame.View.Popup = Backbone.View.extend({

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
		var template = _.template($('#popup_temp'));
		template({text: this.text});
	}

})

GeoGame.Router = Backbone.Router.extend({

	routes: {
		'': 'start'
	},

	start: function() {
		
	},

	loadView: function(View) {
		this.view.remove();
		this.view = view;
	}

})

/**
* Start backbone history that makes t possible to change the URL without the browser reloading 
* the site
*/

window.currentUser = new GeoGame.Models.User();
window.Router = new GeoGame.Router();

Backbone.history.start({
	silent: false
}); 