var _ = require('underscore')

/**
 * overlay.js
 * Functions to measure triangles overlap ratio
 *
 * overlay(...) is the function to use
 *
 * Extra: special version with canvas drawing. The necesary HTML and CSS are in the comments
 *
 * Needs Underscore.js
 */

/**
 * Checks if a point is within a triangle
 * @param {Array} pointsArray 2D-coordinates of the 1st triangle vertices
 * [{x: x1, y: y1}, {x: x2, y: y2}, {x: x3, y: y3}]
 * @param {Number} x X-coordinate of the point to check
 * @param {Number} y Y-coordinate of the point to check
 * @returns {Boolean} True if point is in triangle, false otherwise
 */
function isInTriangle(pointsArray, x, y) {
	var isWithinRange1, isWithinRange2;
	
	// Point 1 is reference (start point for segmentAngleRad) 
	var refX = pointsArray[0].lng;
	var refY = pointsArray[0].lat;
	var angleBoundary1 = segmentAngleRad(refX, refY, pointsArray[1].lng, pointsArray[1].lat, true);
	var angleBoundary2 = segmentAngleRad(refX, refY, pointsArray[2].lng, pointsArray[2].lat, true);
	var anglePoint = segmentAngleRad(refX, refY, x, y, true);
	
	var smallest = _.min([angleBoundary1, angleBoundary2], function(me) { return me; });
	var largest = _.max([angleBoundary1, angleBoundary2], function(me) { return me; });
	
	if ((largest - smallest) > Math.PI) {
		var cache = largest;
		largest = smallest;
		smallest = cache;
	};
	
	isWithinRange1 = (angleDistance(smallest, anglePoint, "anticlockwise") < angleDistance(smallest, largest, "anticlockwise") ? true : false);
	
	// Point 2 is reference (start point for segmentAngleRad)
	var refX = pointsArray[1].lng;
	var refY = pointsArray[1].lat;
	var angleBoundary1 = segmentAngleRad(refX, refY, pointsArray[2].lng, pointsArray[2].lat, true);
	var angleBoundary2 = segmentAngleRad(refX, refY, pointsArray[0].lng, pointsArray[0].lat, true);
	var anglePoint = segmentAngleRad(refX, refY, x, y, true);
	
	var smallest = _.min([angleBoundary1, angleBoundary2], function(me) { return me; });
	var largest = _.max([angleBoundary1, angleBoundary2], function(me) { return me; });
	
	if ((largest - smallest) > Math.PI) {
		var cache = largest;
		largest = smallest;
		smallest = cache;
	};
	
	isWithinRange2 = (angleDistance(smallest, anglePoint, "anticlockwise") < angleDistance(smallest, largest, "anticlockwise") ? true : false);
	
	return (isWithinRange1 && isWithinRange2);
}

/**
 * Measures the angle betwen the horizontal axis and a segment
 * @param {Number} Xstart X value of the segment starting point
 * @param {Number} Ystart Y value of the segment starting point
 * @param {Number} Xtarget X value of the segment target point
 * @param {Number} Ytarget Y value of the segment target point
 * @param {Boolean} realOrWeb true if Real (Y towards top), false if Web (Y towards bottom)
 * @returns {Number} Angle between 0 and 2PI
 */
function segmentAngleRad(Xstart, Ystart, Xtarget, Ytarget, realOrWeb) {
	
	var result;
	
	if (Xstart == Xtarget) {
		if (Ystart == Ytarget) {
			result = 0; 
		} else if (Ystart < Ytarget) {
			result = Math.PI/2;
		} else if (Ystart > Ytarget) {
			result = 3*Math.PI/2;
		} else {}
	} else if (Xstart < Xtarget) {
		result = Math.atan((Ytarget - Ystart)/(Xtarget - Xstart));
	} else if (Xstart > Xtarget) {
		result = Math.PI + Math.atan((Ytarget - Ystart)/(Xtarget - Xstart));
	}
	
	result = (result + 2*Math.PI) % (2*Math.PI);
	
	if (!realOrWeb) {
		result = 2*Math.PI - result;
	}
	
	return result;
}

/**
* @param {Number} fromAngle Start angle
* @param {Number} toAngle End angle
* @param {String} way Clockwise or anticlockwise
* @returns {Number} The distance on the trigonometric circle
*/
function angleDistance(fromAngle, toAngle, way) {
	fromAngle = (fromAngle + 2*Math.PI) % (2*Math.PI);
	toAngle = (toAngle + 2*Math.PI) % (2*Math.PI);
	if (way == "anticlockwise") {
		if (toAngle > fromAngle) {
			return (toAngle - fromAngle);
		} else {
			return (toAngle + 2*Math.PI - fromAngle);
		}
	} else if (way == "clockwise") {
		if (toAngle > fromAngle) {
			return (2*Math.PI - (toAngle - fromAngle));
		} else {
			return (fromAngle - toAngle);
		}
	} else {
		console.log("Wrong way in angleDistance()");
	}
}

/**
 * Returns the % of overlay for each triangle
 * Needs Underscore.js for the sorting functions
 * @param {Array} pointsArray1 2D-coordinates of the 1st triangle vertices
 * [{x: x1, y: y1}, {x: x2, y: y2}, {x: x3, y: y3}]
 * @param {Array} pointsArray2 2D-coordinates of the 2nd triangle vertices
 * [{x: x1, y: y1}, {x: x2, y: y2}, {x: x3, y: y3}]
 * @param {String} precision "normal", "high" or "extreme"
 * @returns {Array} Array with % of coverage by other triangle
 */
module.exports = function overlay(pointsArray1, pointsArray2, precision) {

	var in1 = 0, in2 = 0, inBoth = 0, inSomething = 0;
	
	// Match precision with number of rectangles
	var prec = (precision == "extreme" ? 1000 : 
		(precision == "high" ? 100 : 
			10
		)
	);
	
	// Define outer rectangle with extremal coordinates
	var points = pointsArray1.concat(pointsArray2);
	var minX = _.min(points, function(point) {
		return point.lng;
	}).lng;
	var maxX = _.max(points, function(point) {
		return point.lng;
	}).lng;
	var minY = _.min(points, function(point) {
		return point.lat;
	}).lat;
	var maxY = _.max(points, function(point) {
		return point.lat;
	}).lat;
	
	totalRectangles = prec * prec;

	// Go through all rectangles and check if rectangle is inside triangles
	for (var i = 0; i < prec; i++) {
			
		var topLeftCornerY = minY + (maxY - minY) * i/prec;
		var centerY = topLeftCornerY + 0.5 * (maxY - minY)/prec;
		for (var j = 0; j < prec; j++) {
			var topLeftCornerX = minX + (maxX - minX) * j/prec;
			var centerX = topLeftCornerX + 0.5 * (maxX - minX)/prec;
			
			// Test if in triangle 1
			var isIn1 = isInTriangle(pointsArray1, centerX, centerY);
			if (isIn1) { 
				in1++;
			}
			// Test if on triangle 2
			var isIn2 = isInTriangle(pointsArray2, centerX, centerY);
			if (isIn2) { 
				in2++;
			}
			// Test if on both
			if (isIn1 && isIn2) { 
				inBoth++;
			}
			// Test if on some
			if (isIn1 || isIn2) {
				inSomething++;
			}
			
		}
	}
	
	return [inBoth/in1, inBoth/in2];
}

/**
 * Animated version of function overlay
 * Needs Underscore.js for the sorting functions
 * @param {Array} pointsArray1 2D-coordinates of the 1st triangle vertices
 * [{x: x1, y: y1}, {x: x2, y: y2}, {x: x3, y: y3}]
 * @param {Array} pointsArray2 2D-coordinates of the 2nd triangle vertices
 * [{x: x1, y: y1}, {x: x2, y: y2}, {x: x3, y: y3}]
 * @param {String} precision 'normal', 'high' or 'extreme'
 * @param {String} canvasID ID of canvas element in the DOM 
 * @returns {Array} Array with % of coverage by other triangle
 */
function overlayAnimated(pointsArray1, pointsArray2, precision, canvasID) {

	// Get context
	var canvas = document.getElementById(canvasID);
	var ctx = canvas.getContext('2d');
	
	// Background
	ctx.beginPath();
	ctx.rect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = '#111';
	ctx.fill();
	
	// Triangles
	ctx.beginPath();
	ctx.moveTo(pointsArray1[0].lng, pointsArray1[0].lat);
	ctx.lineTo(pointsArray1[1].lng, pointsArray1[1].lat);
	ctx.lineTo(pointsArray1[2].lng, pointsArray1[2].lat);
	ctx.lineTo(pointsArray1[0].lng, pointsArray1[0].lat);
	
	ctx.moveTo(pointsArray2[0].lng, pointsArray2[0].lat);
	ctx.lineTo(pointsArray2[1].lng, pointsArray2[1].lat);
	ctx.lineTo(pointsArray2[2].lng, pointsArray2[2].lat);
	ctx.lineTo(pointsArray2[0].lng, pointsArray2[0].lat);
	
	ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
	ctx.lineWidth = 5;
	ctx.lineCap = "round";
	ctx.stroke();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
	ctx.lineWidth = 15;
	ctx.stroke();
	
	// Variables for overlay counters
	var in1 = 0, in2 = 0, inBoth = 0, inSomething = 0;
	
	// Match precision with number of rectangles
	var prec = (precision == 'extreme' ? 100 : 
		(precision == 'high' ? 30 : 
			10
		)
	);
	
	// Define outer rectangle with extremal coordinates
	var points = pointsArray1.concat(pointsArray2);
	var minX = _.min(points, function(point) {
		return point.lng;
	}).lng;
	var maxX = _.max(points, function(point) {
		return point.lng;
	}).lng;
	var minY = _.min(points, function(point) {
		return point.lat;
	}).lat;
	var maxY = _.max(points, function(point) {
		return point.lat;
	}).lat;
	
	totalRectangles = prec * prec;

	// Go through all rectangles and check if rectangle is inside triangles
	// With a time loop for animated version
	var i = 0, j = 0;
	var interv = setInterval(function() {
		if (i < prec) {
			var topLeftCornerY = minY + (maxY - minY) * i/prec;
			var centerY = topLeftCornerY + 0.5 * (maxY - minY)/prec;
			if (j < prec) {
				var topLeftCornerX = minX + (maxX - minX) * j/prec;
				var centerX = topLeftCornerX + 0.5 * (maxX - minX)/prec;
				
				// Local color for rectangle
				var lum = 10;
				var hue = 200;
				
				// Test if in triangle 1
				var isIn1 = isInTriangle(pointsArray1, centerX, centerY);
				if (isIn1) { 
					in1++;
					lum += 20;
					hue += 80;
				}
				// Test if on triangle 2
				var isIn2 = isInTriangle(pointsArray2, centerX, centerY);
				if (isIn2) { 
					in2++;
					lum += 20;
					hue += -80;
				}
				// Test if on both
				if (isIn1 && isIn2) { 
					inBoth++;
				}
				// Test if on some
				if (isIn1 || isIn2) {
					inSomething++;
				}
				
				// Draw filled rectangle
				ctx.beginPath();
				ctx.fillStyle = 'hsla(' + hue + ', 100%, ' + lum + '%, 0.7)';
				ctx.fillRect(topLeftCornerX, topLeftCornerY, (maxX - minX) / prec, (maxY - minY) / prec);
				
				// Draw borders
				ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
				ctx.lineWidth = 0.5;
				ctx.rect(topLeftCornerX, topLeftCornerY, (maxX - minX) / prec, (maxY - minY) / prec);
				ctx.stroke();
				
				// Update DOM indicators
				document.querySelector('#t1').innerHTML = in1;
				document.querySelector('#t2').innerHTML = in2;
				document.querySelector('#t1b').innerHTML = Math.floor(100 * ((in1-inBoth)/(in1) || 0)) + "%";
				document.querySelector('#t2b').innerHTML = Math.floor(100 * ((in2-inBoth)/(in2) || 0)) + "%";
				
				j++;
				
			} else {
				j = 0;
				i++;
			}
		} else {
			clearInterval(interv);
			console.log("Scan complete.");
		}
	}, 5)
	
	return [inBoth/in1, inBoth/in2];
}

// HTML for overlayAnimated()
/*
<h1>Triangles overlay</h1>
<div id="left">	
  <h2>Triangle 1</h2>
  <p id="t1">0</p>
  <h2>Triangle 2</h2>
  <p id="t2">0</p>
</div>
<div id="right">	
  <h2>Balance for triangle 1</h2>
  <p id="t1b">0</p>
  <h2>Balance for triangle 2</h2>
  <p id="t2b">0</p>
</div>
<script type="text/javascript">
  window.onload = function() {
    // Create canvas
    var canvasEl = document.createElement('canvas');
    canvasEl.id = "overlay";
    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;
    document.body.appendChild(canvasEl);
  
    overlayAnimated([
      {x: 100, y: 120}, 
      {x: 800, y: 150}, 
      {x: 100, y: 500}
    ], [
      {x: 200, y: 200},
      {x: 600, y: 50},
      {x: 200, y: 400}
    ], "high", "overlay");
  // Change "high" to "normal" or "extreme" to try different precisions
  }
</script>
*/

// CSS for overlayAnimated()
/*
* {
	margin: 0;
	padding: 0;
	white-space: nowrap;
	overflow: hidden;
	cursor: default;
	border: none;
}
html, body {
	background: #222;
}
h1, h2, p {
	color: #bbb;
	width: 100%;
	text-align: center;
	margin: 10px 0px;
	text-shadow: 0px 0px 2px;
}
h1 {
	font-size: 40px;
	color: #eee;
}
#left, #right {
	display: inline-block;
	vertical-align: top;
	width: 50%;
}
#t1, #t2, #t1b, #t2b {
	font-size: 40px;
	color: #000;
	font-weight: bold;
}
#left, #right {
	margin-bottom: 30px;
}
canvas {
	box-shadow: rgba(0, 0, 0, 0.9) 0px 0px 25px;
	display: block;
}
*/

