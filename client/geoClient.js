/**
 * JS for Mobile Web Development Game of Triangles
 * To be Backbonified
 */

// Server connection
var socket = io.connect('http://127.0.0.1:3000');

// Client handlers
socket.on('posToClient', function(data) {
	jQuery('#chat').prepend("<p style='color: " + data.color + "'>" + data.user + " is in [" + data.lat + ", " + data.lng + "] at " + data.timestamp + "</p>");
});

// Globals
var sessionUuid = null;
var sessionColor = null;

/** 
 * Onload start page
 */
jQuery(document).ready(function() {
	
	setupGlobals();
	
	if (navigator.geolocation) {
		
		// Position watcher
		navigator.geolocation.watchPosition(function(position) {
			// Success (user accepted)
			
			// Location tracing in ON
			jQuery('#indicator').css('background','rgba(0,255,0,0.7)');
			
			console.log("Position at " + new Date().getTime() + " sent to server.");
			socket.emit('pos', {
				user: sessionUuid,
				color: sessionColor,
				lat: position.coords.latitude,
				lng: position.coords.longitude,
				timestamp: new Date().getTime()
			});
		});
    } else {
        jQuery('#indicator').css('background','rgba(255,0,0,0.7)');
    }
});

/**
 * Initialization call
 */
function setupGlobals() {
	// Generate random ID and random color
	var sessionRandom = Math.floor(Math.random() * 360);
	sessionUuid = "USER-" + sessionRandom;
	sessionColor = "hsl(" + sessionRandom + ", 80%, 70%)";
}

/**
 * Geohash function from PUBNUB
 * @param {Number} coord A latitude or a longitude
 * @param {Number} resolution An integer representing zoom level
 * @returns {Number} Geohashed latitude or longitude
 */
function geohash(coord, resolution) {
	var rez = Math.pow(10, resolution || 0);
	return Math.floor(coord * rez) / rez;
}


