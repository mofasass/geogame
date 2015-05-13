# geogame

## Tech I think we should use, and how
I know there's loads of misspelling in the README; I hope the messsage is clear despite that!

### Node and socket.io

Node is a serverside version of javascript. There is a library called socket.io, which makes handeling socket connections very easy. Node and socket.io are the technologies that will allow us to send real-time messages between the server and the client.

#### How the web server will work
The web server we should be using is IMO express.js. It is a powerfull but easy-to-use webserver written in node.

Here is an example using express and socket.io. What happends here is that we first require all the modules we will be using; first we get express, then we require nodes built in http handeler, which routes the incoming request from the web to express, and lastly socket.io is required (we also tell socket.io what module contains all the incoming http requests in the last paranthesis).

The last section of code starts the web server on port 3000. What is interesting here is the `io.on` code - in this example, as soon as a new client connects to out web server, the socket.io module will print some stuff to the server console (The server console is basically a black text log where the server prints error messages and stuff). Obviously this is pointless, but we can extend this code to do something more usefull. Also, note that the user will see a "hello world" when visiting this site; we have routed the root of the site (example of a root of a site is http://www.facebook.com/, while http://www.facebook.com/feed/ is not the root) at line 5 to return HTML containing a Hello World header.

``` javascript
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

Now I will show you how we can use socket.io to communicate in real time between the client and the server:

First study this peice of coode:
``` javascript
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});

io.sockets.on('connection', function(socket){
    //send data to client
    setInterval(function(){
        socket.emit('date', {'date': new Date()});
    }, 1000);
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

What happends here is that the server will send a date object to the client 1 second after the client has connected to the web site.

Lets have a look at the client side code to understand hwo the client reads this message:

```html
<html>
  <head>
    <script src="/socket.io/socket.io.js"></script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.js"></script>  </head>
  <body>
    <script>
      var socket = io.connect();

      socket.on('date', function(data){
        $('#date').text(data.date);
      });
    </script>
    <div id="date"></div>
  </body>
</html>
```

Here we conbine socket.io and jQuery. Nodte that the socket.io library has to be required in the client side code aswell (line 3).

When the row `var socket = io.connect();` is ran by the cellphones webbrowser, the web servers `io.sockets.on('connection'` is triggered. As I mentioned, the web server sends a date object 1 second after a new connection is established, and you can see in client code just above how we deal with it; important to notice however is that socket.io uses channels: the date object is sent in the "date" channel (`socket.emit('date', {'date': new Date()});`), and the client is listening to the date channel (`socket.on('date', function(data){`). This channel could be named anything really, for example `lol`: `socket.on('lol', function(data){`


So, now we have made the server communicate with the client. If we want the client to answer, we could do something like this: 

```html
<html>
  <head>
    <script src="/socket.io/socket.io.js"></script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.js"></script>  </head>
  <body>
    <script>
      var socket = io.connect();

      socket.on('date', function(data){
        $('#date').text(data.date);
        socket.emit('lolipop', 'I got the date bro')
      });
    </script>
    <div id="date"></div>
  </body>
</html>
```

This will make the client respond to the server (in the lolipop channel) when the client recieved a date object. 

The server code:


``` javascript
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});

io.sockets.on('connection', function(socket){
    //send data to client
    setInterval(function(){
        socket.emit('date', {'date': new Date()});
    }, 1000);

     //recieve client data
    socket.on('lolipop', function(data){
        console.log(data);
    });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

The server will print the message the cient sends ("i got the message bro") to the server cosole.

So, that's basic real time comminucation between a server and a web browser for you. We will use the same methods, but send coordinates instead. The challenge here is to store every web browser connection on the server, create rooms, etc. I think we will run a function in intervals to check of the triangles overlap, etc.

### Open Street Map and leaflet.js
I have included some example code in the client folder. That html-page shows a touch-friendly map in a webbrowser that works well in a smartphone.

### Backbone.js

I guess this may be "hard" part, but trust me, back bone is not hard. I suggest we use it to make it easier for us. I will illustrate how backbone.js is supposed to be used by first writing a lassical messy jQuery app without backbone, and then apply backbone on it. 

This app shows a log in button. If user user clicks it, a login form is displayed, and if the login form is submitted the user credentials are sent to a fake login-API AJAX style:

```html
<button>Show Log in</button>

<div id="loginform">
    <form>
    <input type="text" id="username">
    <input type="password" id="pw">
    <input type="submit">
    </form>
</div>

<script>

$('#loginform').hide();

$('button').on('click', function() {
    $('#loginform').show()
})

$('#form').on('submit', function(e) {
    var username = $('#username').val(),
        pw       = $('#pw').val();

    $.ajax({
        url: 'http://api.example.com/login',
        method: 'POST',
        data: {username: username, password: pw}
    });

    // Stop the form from being submittet by the web broswer - we have already submitted it AJAX style.
    e.preventDefault();
})

</script>
```

The problem with this  code is that there is no structure - imagine code like this in a big project; what if someone change a element ID, or the API URL changes - you will have to find and replace everywhere. Or what if you show the login form in multiple places - if you want to change the id name, you will have to change the id in all places.

Same think with backbone. Some quick notes before:
Backbone have Views and Models. Models are supposed to communicate with servers, while Views renders html and handle events. The views usually have a reference to a model so that the view can tell the server stuff when the user clicks somewhere, BUT, the models should never have any view login in them.

Every view has something called `el`, which stands for element. The `el` is the element that the content of a view should be inserted into. It is possible to tell backbbone what type of element the `el` should be, but it defaults to a div.

```javascript
<script type="text/template" id="login_button">
    <button>Show Log in</button>
</script>


<script type="text/template" id="login_form">
    <form>
    <input type="text" id="username">
    <input type="password" id="pw">
    <input type="submit">
    </form>
</script>

User = Backbone.Model.extend({

    url: function() {
        return 'http://api.example.com';
    },

    loginUser: function(user, pass) {
        $.ajax({
            url: 'http://api.example.com/login',
            method: 'POST',
            data: {username: user, password: pass}
        });
    }

})


Loginform = Backbone.View.extend({

    events: {
        'submit form': 'submitForm' // When the form is submitted, run the submitForm method
    }
    
    /**
    * This method is ran automatically when a instance of this class is initialized
    */

    initialize: function() {
        this.render(); // As soon as this class is started, render the html
    },

    render: function() {
        var template = _.template($('#login_form'));
        this.$el.html(template);
    },

    submitForm: function() {
        var username = $('#username').val(),
            pw       = $('#pw').val();

        window.currentUser.loginUser(username, pw); // Notice how I user the user model to communicate with the server

    }

});

LoginButton = Backbone.View.extend({

    events: {
        'click button': 'showForm'
    },

    initialize: function() {
        this.render();
    },

    render: function() {
        var template = _.template($('#login_button'));
        this.$el.html(template);
    },

    showForm: function() {
        /*
        Important: remember that the form view renders as soon as we create it.
        But where does it render its stuff? Actually, it only renders to its "el" element, 
        but that element is not placed in the DOM unless we put it in the DOM (DOM is the HTML Document).
        Until we place the el element into the dom, the loginform will be kept in memory by the 
        web browser.
        */
        var formView = new Loginform();

        /*
        Here I append the el of the form view to the el of this view, so it will appear right after
        the "show log in" button, just like in out crappy jQuery app
        */
        this.$el.append(formView.$el); 

    }
})


window.currentUser = new User();
var button = new LoginButton();
$('body').html(button.$el); // I put the contet of the button view into the DOM.
```

Notice how Backbone will centralize everything.

### Suggestion of how to do this project

I think the front end application can largely be developed seperatly from the server initially. 

Front end steps (we will need to discuss this OFC!):
1. Code the HTML and layout base.
2. Code the welcome screen explaining the game rules, and maybe an accept button?
3. Code the pre-game screen where people join a game and select "ready"
4. Code the game code itself

#### Regarding step 3 and 4
Theese steps are the "big steps". Step 3 includes some sub-steps:
* Someone will have to write the HTML and CSS for the layout
* Someone will have to write the Javascript. The javascript part here is supposed to tell the server that there is a new user when someone enters the site, and it should also be able to recieve data from the server telling it that the game starts -> move to the gamme view. It should handle click-events when the user clicks "ready", send this to the server.

Step 4 pretty much only includes Javascript writing. There is barely any HTML and CSS here, since the only thing visible in game mode is prety much the map (I think?).
At step 4, we need to make the app:
* Send user coords to the server
* recieve others coords at from the server and plot them
* We need to draw lines between the coords to create triangles
* We need a handeler for when the game ends that says "You lost/won" -> Back to start page