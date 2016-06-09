/***********************************************
 *	Drag and Drop Rows Library
 *	June 6, 2013
 *	Built by: Jonathan Davis
 *	Based on:
 *		-f dragtable v1.0, built by Dan Vanderkam
 ***********************************************/
 
_nsdavis.dragrow = {
	dragRadiusSq: 100,	//minimum size of mouse motino to detect drag event rather than click
	obj: new Object(),	//global object to hold information during drag
	originXY: null,		//stores the original xy values for the dragged object and cursor
	oldXY: null,		//stores the values for where the cursor was previously
	lastMove: null,		//stores the direction of the last registered mouse movement
	offsetX: 0,
	cursorOffset: 0,
	callback: null,
	rowIDs: [],
    scrollElement: null,

	newRowOrder: function () {
	    var rowIDs = [];
	    var rows = _nsdavis.dragrow.obj.table.tBodies[0].rows;
	    for (var i = 0; i < rows.length; i++) {
	        // var rowID = rows[i].getAttribute("data-id");
	        // rowIDs.push(rowID);
	        rowIDs.push(rows[i]);
	    }
	    _nsdavis.dragrow.rowIDs = rowIDs;
	},
	
	//Set the minimum drag distance to recognize a drag event instead of a click event
	setMinDragDistance: function(x){			
		_nsdavis.dragrow.dragRadiusSq = x*x;
	},
	
	//Need to check for specific browsers due to browser inconsistencies
	browser: (function(ua){			
		var r = {
			isIE: false,
			isNS: false,
			version: null
		};
		
		if (ua.indexOf("MSIE") >= 0){
			this.isIE = true;
			this.version = parseFloat(ua.substr(ua.indexOf("MSIE") + 4));
			return r;
		} else if (ua.indexOf("Netscape6/") >= 0 || ua.indexOf("Gecko") >= 0){
			this.isNS = true;
			this.version = ua.indexOf("Netscape6/") ? parseFloat(ua.substr(ua.indexOf("Netscape6/") + 10)) : 6.1;
			return r;
		}

	})(navigator.userAgent),

	//Check for css3 property support
	getCss3: function(properties){
		var root = document.documentElement;
		
		for (var i=0;i<properties.length;i++){
			if (properties[i] in root.style){
				return properties[i];
			}
		}
	},
	
	//Initialize and make tables draggable
	init: function (_callback) {
	    _nsdavis.dragrow.callback = _callback;
		_nsdavis.dragrow.obj.zIndex = 0;
		var _table = document.getElementsByTagName('table');
		
		for (var i=0;i<_table.length;i++){
			if (_table[i].className.search(/\bdraggable\b/) != -1){
				_nsdavis.dragrow.makeDraggable(_table[i]);
			}
		}
	},
	
	makeDraggable: function(table){
	    //Safari fix to get the tbody element
	    if (table.tBodies[0] == null) {
	        table.tBodies[0] = table.getElementsByTagName('tbody')[0];
	    }

	    _nsdavis.dragrow.scrollElement = table.parentElement;

	    var rows = table.tBodies[0].rows;
	    // for (var i = 0; i < rows.length; i++) {
	    for (var i = 1; i < rows.length - 1; i++) {
			if (rows[i].className.indexOf("locked") >= 0){
				continue;
			}
		    rows[i].addEventListener('mousedown', _nsdavis.dragrow.startDrag, false);
		}
		
		//Sync table order with cookie, if any exists
		if (_nsdavis.dragrow.cookiesEnabled() && table.id){
			_nsdavis.dragrow.replay(table);
		}
	},
	
	//Copied from dragtable.js, used to find element further up DOM
	findUp: function(el, tag){	
		do {
			if (el.nodeName && el.nodeName.search(tag) != -1){
				return el;
			}
		} while (el = el.parentNode);
		
		return null;
	},
	
	//Clone the element passed in
	fullCopy: function(element, deep){
		var newElement = element.cloneNode(deep);
		newElement.className = element.className;
		newElement.style.cssText = element.style.cssText;
		return newElement;
	},
	
	//used to find the position of a particular event (with IE fix)
	eventPosition: function(event){	
		var XY;
		
		if (_nsdavis.dragrow.browser.isIE){
			XY = {
			    x: window.event.clientX + document.documentElement.scrollLeft + document.body.scrollLeft + _nsdavis.dragrow.scrollElement.scrollLeft,
			    y: window.event.clientY + document.documentElement.scrollTop + document.body.scrollTop + _nsdavis.dragrow.scrollElement.scrollTop
			}
			return XY;
		}
		
		XY = {
		    x: event.pageX + _nsdavis.dragrow.scrollElement.scrollLeft,
		    y: event.pageY + (_$("contenta").children.length > 0 ? _$("contenta").scrollTop : _$("contentb").scrollTop)
			//scrollElement.scrollTop and scrollLeft both always return 0 in firefox and chrome, must use the content element to get scroll distance.
		}
		
		return XY;
	},
	
	absolutePosition: function(el, stopAtRelative) {	//Find the position of the passed element on the page
		var elx = 0, ely = 0;
		var XY;
		
		do {
			//var cStyle = _nsdavis.dragrow.browser.isIE ? el.currentStyle : window.getComputedStyle(el);
			//console.log(cStyle);
			//var supportFixed = !(_nsdavis.dragrow.browser.isIE && _nsdavis.dragrow.browser.version < 7);
			if (el.tagName == "BODY" || el.tagName == "body"){
				break;
			}elx += el.offsetLeft;
			ely += el.offsetTop;
		} while (el = el.offsetParent);
		
		XY = {
			x: elx,
			y: ely
		}
		
		return XY;
	},
	
	//Adjust column opacity
	fadeColumn: function(col, sec, fade){
		for (var i=0;i<sec.rows.length;i++){
			sec.rows[i].cells[col].style.opacity = fade;
		}
	},
  
	startDrag: function(event, id){	//Sets the appropriate event handlers and puts the data into the global _nsdavis.dragrows.obj object
		var dObj = _nsdavis.dragrow.obj;
		var pos = _nsdavis.dragrow.eventPosition(event);
		
		if (_nsdavis.dragrow.browser.isIE){
			dObj.origNode = window.event.srcElement;
		} else {
			dObj.origNode = event.target;
		}
		
		//Drag the entire table cell, not just the clicked element (which could be just the text, an a tag, etc.)
		dObj.origNode = _nsdavis.dragrow.findUp(dObj.origNode, /TR/);
		
		//Copy contents into a div and drag that div instead (since table headers can't be dragged)
		var table = _nsdavis.dragrow.findUp(dObj.origNode, "TABLE");
		dObj.table = table;
		dObj.startRow = _nsdavis.dragrow.findRow(table, pos.y);
		if (dObj.startRow == -1) return;
		var newElement = _nsdavis.dragrow.fullCopy(table, false);
		newElement.style.margin = '0';
		
	    //Copy the column of data
		var copySecRow = function (row, sec) {
		    var newSec = _nsdavis.dragrow.fullCopy(sec, false);
		    var cells = sec.rows[row].cells;
		    var _tr = _nsdavis.dragrow.fullCopy(sec.rows[row], false);
		    
			if (sec.rows[row].offsetHeight) {
		        _tr.style.height = sec.rows[row].offsetHeight + "px";
		    }
		    
			for (var i = 0; i < cells.length; i++) {
		        var _td = _nsdavis.dragrow.fullCopy(cells[i], true);
		        if (cells[i].offsetWidth) {
		            _td.style.width = cells[i].offsetWidth + "px";
		        }
		        _tr.appendChild(_td);
		    }
		    
		    newSec.appendChild(_tr);

		    return newSec;
		};

		newElement.appendChild(copySecRow(dObj.startRow, table.tBodies[0]));
		//for (var i=0;i<table.tBodies.length;i++){
		//    newElement.appendChild(copySecRow(dObj.startRow, table.tBodies[i]));
		//}
		if (table.tFoot){
		    newElement.appendChild(copySecRow(dObj.startRow, table.tFoot));
		}
		
		//Wait to add element until a drag event is confirmed
		dObj.addedNode = false;
		dObj.tableContainer = document.body;
		dObj.elementNode = newElement;
		dObj.elementNode.style.width = dObj.table.offsetWidth + "px";
		dObj.elementNode.style.position = "fixed";
		
		//Save the starting positions of the cursor and element
		var elementXY = _nsdavis.dragrow.absolutePosition(dObj.table.tBodies[0].rows[dObj.startRow], false);
		_nsdavis.dragrow.originXY = {
			cursorX: pos.x,
			cursorY: pos.y,
			elementX: elementXY.x,
			elementY: elementXY.y
		};
		_nsdavis.dragrow.updateXY(pos);
		
		if (isNaN(_nsdavis.dragrow.originXY.elementX)){
			_nsdavis.dragrow.originXY.elementX = 0;
		}
		
		if (isNaN(_nsdavis.dragrow.originXY.elementY)){
			_nsdavis.dragrow.originXY.elementY = 0;
		}
		
		dObj.elementNode.style.border = "none";
		//dObj.elementNode.style.opacity = "0.8";
		
		//Update zIndex
		dObj.elementNode.style.zIndex = 9999;
		
		//create listeners and capture mousemove and mouseup events
		if (_nsdavis.dragrow.browser.isIE){
			document.attachEvent("onmousemove", _nsdavis.dragrow.moveDrag);
			document.attachEvent("onmouseup", _nsdavis.dragrow.endDrag);
			window.event.cancelBubble = true;
			window.event.returnValue = false;
		} else {
			document.addEventListener("mousemove", _nsdavis.dragrow.moveDrag, true);
			document.addEventListener("mouseup", _nsdavis.dragrow.endDrag, true);
			event.preventDefault();
		}
	},
	
	//Move the floating header with the mouse, reorder columns, and add blank column
	moveDrag: function (event) {
		var dObj = _nsdavis.dragrow.obj;
		
		//Get cursor position
		var pos = _nsdavis.dragrow.eventPosition(event);
		var dx = _nsdavis.dragrow.originXY.cursorX - pos.x;
		var dy = _nsdavis.dragrow.originXY.cursorY - pos.y;
		if (!dObj.addedNode && (dx*dx)+(dy*dy) > _nsdavis.dragrow.dragRadiusSq){
			dObj.tableContainer.appendChild(dObj.elementNode);
			//dObj.tableContainer.appendChild(dObj.blankNode);
			//_nsdavis.dragrow.placeRow(dObj.table, dObj.startRow, dObj.startRow, dObj.elementNode);
			//_nsdavis.dragrow.placeCol(dObj.table, dObj.startCol, dObj.startCol, dObj.blankNode);
			dObj.addedNode = true;
		}
		
		//Move dragged element by the same amount as the cursor
		//TODO: Elastic motion?
		dObj.elementNode.style.left = (pos.x - _nsdavis.dragrow.scrollElement.scrollLeft - dObj.elementNode.offsetWidth / 4) + "px";
		dObj.elementNode.style.top = (pos.y - _nsdavis.dragrow.scrollElement.scrollTop - 10 - (_$("contenta").children.length > 0 ? _$("contenta").scrollTop : _$("contentb").scrollTop)) + "px";
		
		//Reset border styles
		//for (var j = 0; j < dObj.table.tbody.rows[0].cells.length; j++) {
		//	dObj.table.tHead.rows[0].cells[j].style.borderLeft = "1px solid #D2D3D3";
		//	dObj.table.tHead.rows[0].cells[j].style.borderRight = "1px solid #D2D3D3";
		//}
		
		//Reorder columns, add blank column to show placement
		if (dObj.addedNode){
			//Create drop shadow
			var shadow = _nsdavis.dragrow.getCss3(['boxShadow','MozBoxShadow','WebkitBoxShadow']);
			switch (shadow){
				case "boxShadow":
					dObj.elementNode.style.boxShadow = "3px 3px 5px 3px rgba(60, 60, 60, 0.8)";
					break;
				case "MozBoxShadow":
					dObj.elementNode.style.MozBoxShadow = "3px 3px 5px 3px rgba(60, 60, 60, 0.8)";
					break;
				case "WebkitBoxShadow":
					dObj.elementNode.style.WebkitBoxShadow = "3px 3px 5px 3px rgba(60, 60, 60, 0.8)";
					break;
			}
			//Set opacity
			_nsdavis.dragrow.fadeColumn(dObj.startRow, dObj.table.tHead, "0.2");
			for (var i=0;i<dObj.table.tBodies.length;i++){
				_nsdavis.dragrow.fadeColumn(dObj.startRow, dObj.table.tBodies[i], "0.2");
			}
			if (dObj.table.tFoot){
				_nsdavis.dragrow.fadeColumn(dObj.startRow, dObj.table.tFoot, "0.2");
			}
			
			if (_nsdavis.dragrow.checkDirection(pos) != false){
				if (_nsdavis.dragrow.checkDirection(pos) == "up"){
					dObj.lastMove = "up";
					_nsdavis.dragrow.updateXY(pos);
					var targetRow = _nsdavis.dragrow.findMovingRow(dObj.table, pos.y, "up");
					dObj.table.tBodies[0].rows[targetRow].style.borderTop = "4px solid #FFAA00";
				} else {
					dObj.lastMove = "down";
					_nsdavis.dragrow.updateXY(pos);
					var targetRow = _nsdavis.dragrow.findMovingRow(dObj.table, pos.y, "down");
					dObj.table.tBodies[0].rows[targetRow].style.borderBottom = "4px solid #FFAA00";
				}
			} else {
			    var targetRowIndex = _nsdavis.dragrow.findRow(dObj.table, pos.y);
				_nsdavis.dragrow.updateXY(pos);
			    if (targetRowIndex > -1) {
			        if (dObj.lastMove == "up") {
			            dObj.table.tBodies[0].rows[targetRowIndex].style.borderTop = "4px solid #FFAA00";
			        } else {
			            dObj.table.tBodies[0].rows[targetRowIndex].style.borderBottom = "4px solid #FFAA00";
			        }
			    }
			}

			var targetRowIndex = _nsdavis.dragrow.findRow(dObj.table, pos.y);
			for (var j = 0; j < dObj.table.tBodies[0].rows.length; j++) {
			    if (j != targetRowIndex) {
			        dObj.table.tBodies[0].rows[j].style.borderTop = "1px solid #D2D3D3";
			        dObj.table.tBodies[0].rows[j].style.borderBottom = "1px solid #D2D3D3";
			        dObj.table.tBodies[0].rows[j].style.opacity = "1";
			    } else { //prevent both top and bottom borders from being colored.
					if (dObj.lastMove == "up") {
						dObj.table.tBodies[0].rows[j].style.borderBottom = "1px solid #D2D3D3";
						dObj.table.tBodies[0].rows[j].style.opacity = "1";
					} else {
						dObj.table.tBodies[0].rows[j].style.borderTop = "1px solid #D2D3D3";
						dObj.table.tBodies[0].rows[j].style.opacity = "1";
					}
				}
			}
		}
		if (_nsdavis.dragrow.browser.isIE){
			window.event.cancelBubble = true;
			window.event.returnValue = false;
		} else {
			event.preventDefault;
		}
	},
	
	updateXY: function(pos){
		_nsdavis.dragrow.oldXY = {
			x: pos.x,
			y: pos.y
		};
	},
	
	checkDirection: function(pos){
		if (pos.y < _nsdavis.dragrow.oldXY.y){
			return "up";
		} else if (pos.y > _nsdavis.dragrow.oldXY.y){
			return "down";
		} else {
			return false;
		}
	},
	
	//Stop capturing events, place column
	endDrag: function(event){
		if (_nsdavis.dragrow.browser.isIE){
			document.detachEvent("onmousemove", _nsdavis.dragrow.moveDrag);
			document.detachEvent("onmouseup", _nsdavis.dragrow.endDrag);
		} else {
			document.removeEventListener("mousemove", _nsdavis.dragrow.moveDrag, true);
			document.removeEventListener("mouseup", _nsdavis.dragrow.endDrag, true);
		}
		
		var dObj = _nsdavis.dragrow.obj;
		var pos = _nsdavis.dragrow.eventPosition(event);
		var targetRow = _nsdavis.dragrow.findRow(dObj.table, pos.y);
		
		
		if (targetRow > 0 && dObj.lastMove == "up") { // drop at the right place based on the last movement
			targetRow--;
		}
		
		//Reset table header border styles and opacity
		for (var j = 0; j < dObj.table.tBodies[0].rows.length; j++) {
		    dObj.table.tBodies[0].rows[j].style.borderTop = "1px solid #D2D3D3";
		    dObj.table.tBodies[0].rows[j].style.borderBottom = "1px solid #D2D3D3";
		    dObj.table.tBodies[0].rows[j].style.opacity = "1";
		}
		
		//Reset table body opacity
		for (var i=0;i<dObj.table.tBodies.length;i++){
			for (var j=0;j<dObj.table.tBodies[i].rows.length;j++){
				for (var k=0;k<dObj.table.tBodies[i].rows[j].cells.length;k++){
					dObj.table.tBodies[i].rows[j].cells[k].style.opacity = "1";
				}
			}
		}
		
		//Reset table foot opacity
		if (dObj.table.tFoot){
			for (var j=0;j<dObj.table.tHead.rows[0].cells.length;j++){
				dObj.table.tFoot.rows[0].cells[j].style.opacity = "1";
			}
		}
			
		if (targetRow >= 0 && targetRow != dObj.table.rows.length - 1 && targetRow != dObj.startRow) {
			//Check if drag event or not
			if (!dObj.addedNode){
				//Fire click event to other method
				switch (dObj.table.getAttribute("id")){
					case "table_schedules":
						_nsdavis.schedules.sortTable(targetRow);
						break;
					case "table_exceptions":
						_nsdavis.schedules_exceptions.sortTable(targetRow);
						break;
					case "table_plant":
						_nsdavis.schedules_plant.sortTable(targetRow);
						break;
					case "table_vendor":
						_nsdavis.schedules_vendor.sortTable(targetRow);
						break;
				}
				return;
			} else {
				_nsdavis.dragrow.placeRow(dObj.table, dObj.startRow, targetRow, dObj.elementNode);
				
				//set cookie
				if (dObj.table.id && _nsdavis.dragrow.cookiesEnabled()){
					_nsdavis.dragrow.remember(dObj.table.id, dObj.startRow, targetRow);
				}
			}
			
			dObj.tableContainer.removeChild(dObj.elementNode);
		
			_nsdavis.dragrow.newRowOrder();
			if (_nsdavis.dragrow.callback) _nsdavis.dragrow.callback();
		} else {
			
			dObj.tableContainer.removeChild(dObj.elementNode);
		}
	},
	
	//Find the column that the x value is sitting over
	findCol: function(table, x){
		var header = table.tHead.rows[0].cells;
		
		for (var i=0;i<header.length;i++){
			var pos = _nsdavis.dragrow.absolutePosition(header[i], false);
			if (pos.x <= x && x <= pos.x + header[i].offsetWidth){
				return i;
			}
		}
		
		return -1;
	},

	findRow: function(table, y){
	    var rows = table.tBodies[0].rows;
	    
		for (var i=0;i<rows.length;i++) {
	        var pos = _nsdavis.dragrow.absolutePosition(rows[i], false);
	        if (pos.y <= y && y <= pos.y + rows[i].offsetHeight){
	            return i;
	        }
	    }
	    
		return -1
	},
	
	//Find the column that the x value has moved over
	findMovingCol: function(table, x, direction){
		var header = table.tHead.rows[0].cells;
		
		for (var i=0;i<header.length;i++){
			var pos = _nsdavis.dragrow.absolutePosition(header[i], false);
			
			if (direction == "left"){
				//Shift position checking to the 
				pos.x += (header[i].offsetWidth/4);
			} else if (direction == "right"){
				pos.x -= (header[i].offsetWidth/4);
			}
			
			if (pos.x <= x && x <= pos.x + header[i].offsetWidth){
				return i;
			}
		}
		
		return -1;
	},

	findMovingRow: function(table, y, direction) {
	    var rows = table.tBodies[0].rows;
	    
		for (var i = 0; i < rows.length; i++) {
	        var pos = _nsdavis.dragrow.absolutePosition(rows[i], false);

	        if (direction == "up") {
	            pos.y += (rows[i].offsetHeight / 4);
	        } else if (direction == "down") {
	            pos.y -= (rows[i].offsetHeight / 4);
	        }

	        if (pos.y <= y && y <= pos.y + rows[i].offsetHeight) {
	            return i;
	        }
	    }
	    
		return -1;
	},
	
	//Move the empty column - based on discussions in comp.lang.javascript
	moveCol: function(table, start, target){
		for (var i=table.rows.length-1;i>=0;i--){
			var x = table.rows[i].removeChild(table.rows[i].cells[start]);
			
			if (target < table.rows[i].cells.length){
				table.rows[i].insertBefore(x, table.rows[i].cells[target]);
			} else {
				table.rows[i].appendChild(x);
			}
		}
	},

	moveRow: function (table, start, target) {
	    for (var i = table.rows.length - 1; i >= 0; i--) {
	        var x = table.rows.removeChild(table.rows[start]);
	        
			if (target < table.rows.length) {
	            table.rows.insertBefore(x, table.rows[target]);
	        } else {
	            table.rows[i].appendChild(x);
	        }
	    }
	},
	
	//Place a column in the empty column index - based on discussions in comp.lang.javascript
	placeCol: function(table, start, target, data){
		for (var i=table.rows.length-1;i>=0;i--){
			var x = table.rows[i].removeChild(table.rows[i].cells[start]);
			
			if (target < table.rows[i].cells.length){
				table.rows[i].insertBefore(x, table.rows[i].cells[target]);
			} else {
				table.rows[i].appendChild(x);
			}
		}
	},

	placeRow: function (table, start, target, data) {
		var row = table.rows[start];
		var targetRow = table.rows[target];
		targetRow.parentNode.insertBefore(row, targetRow.nextSibling);
	},
	
	// Cookie functions based on http://www.quirksmode.org/js/cookies.html
	// Cookies won't work for local files.
	cookiesEnabled: function() {
		return (window.location.protocol != 'file:') && navigator.cookieEnabled;
	},

	createCookie: function(name,value,days) {
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; expires="+date.toGMTString();
		} else {
			var expires = "";
		}

		var path = document.location.pathname;
		document.cookie = name+"="+value+expires+"; path="+path
	},

	readCookie: function(name) {
		var nameEQ = name + "=";
		var cokieArray = document.cookie.split(';');
		
		for(var i=0;i < cokieArray.length;i++) {
			var piece = cokieArray[i];
			while (piece.charAt(0)==' ') piece = piece.substring(1,piece.length);
			if (piece.indexOf(nameEQ) == 0) return piece.substring(nameEQ.length,piece.length);
		}
		
		return null;
	},

	eraseCookie: function(name) {
		_nsdavis.dragrow.createCookie(name,"",-1);
	},
	
	remember: function(id, a, b){
		var cookieName = "_nsdavisArrangement-"+id;
		var prev = _nsdavis.dragrow.readCookie(cookieName);
		var newVal = "";
		
		if (prev) {
			newVal = prev+",";
		}
		
		newVal += a+"/"+b;
		_nsdavis.dragrow.createCookie(cookieName, newVal, _nsdavis.dragrow.cookieDays);
	},
	
	replay: function(table){
		if (!_nsdavis.dragrow.cookiesEnabled()) return;
		
		var idString = _nsdavis.dragrow.readCookie("_nsdavisArrangement-"+table.id);
		
		if (!idString) return;
		
		var drags = idString.split(',');
		
		for (var i=0;i<drags.length;i++){
			var pair = drags[i].split('/');
			if (pair.length != 2) continue;
			var a = parseInt(pair[0],10);
			var b = parseInt(pair[1],10);
			if (isNaN(a) || isNaN(b)) continue;
		}
	}
}