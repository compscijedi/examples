//########################
//# LAWN - ROUTING
//########################

_nsdavis.lawn.routing = {
	address: "",
	calendarDate: "",
	data_branches: [],
	data_events: [],
	data_techs: [],
	locationArray: [],
	lockedIndices: [],
	mapOptions: {},
	mapResponse: [],
	moveEvents: [],
	routingLocationArray: [],
	response: {},
	techID: ""	
}

_nsdavis.lawn.initRoutingUI = function(_callback) {
	var _date = _nsdavis.lawn.routing.calendarDate ? _nsdavis.lawn.routing.calendarDate : _nsdavis.lawn.calendarDate ? _nsdavis.lawn.calendarDate : new Date();
	var _dob = _$("div_optimize_button");
	_nsdavis.lawn.routingLocationArray = [];
	_nsdavis.lawn.routing.lockedIndices = [];
	_nsdavis.lawn.routing.moveEvents = [];
	
	if (_dob.childNodes.length == 1) {
		_$("div_location_table").innerHTML = "";
		_$("div_map_display").innerHTML = "";
		_callback = _nsdavis.lawn.getRoute;
		_$("i_route_date").value = new Date(_date).format("d"); //_$("i_date").value;
		_nsdavis.lawn.routing.calendarDate = _$("i_route_date").value;
		_nsdavis.utils.initOptions({data:_nsdavis.lawn.data_techs,id:"select_route_tech",id_column:"user_id",name_column:"user_name",prompt:"Select Technician"});
		
		if (arguments[1]) {
			_nsdavis.utils.selectOption(_$("select_route_tech"), arguments[1]);
		} else if (!_nsdavis.lawn.routing.techID) {
			var _tech = _nsdavis.cookies.get("calendar_tech") ? _nsdavis.cookies.get("calendar_tech") : "";
			_nsdavis.utils.selectOption(_$("select_route_tech"), _tech);
			_nsdavis.lawn.routing.techID = _tech;
		} else {
			_nsdavis.utils.selectOption(_$("select_route_tech"), _nsdavis.lawn.routing.techID);
		}
		
		var _opt = document.createElement("a");
		_opt.className = "button fr";
		_opt.setAttribute("href","javascript:void(0);");
		_opt.innerHTML = "Optimize";
		_dob.appendChild(_opt);
		_NSEvents.addEventListener(_opt,"click",function(){
			var _this = this.tagName == "A" ? this : _NSUtils.getSrcElement(e,"A");
			
			_nsdavis.lawn.initRoutingUI(_nsdavis.lawn.getOptimizedRoute, "");
		});
		
		_nsdavis.lawn.syncRouteDate(true, false);
	} else {
		if (arguments[1]) {
			_nsdavis.utils.selectOption(_$("select_route_tech"), arguments[1]);
			_$("i_route_date").value = new Date(_date).format("d"); //_$("i_date").value;
			_nsdavis.lawn.routing.calendarDate = _$("i_route_date").value;
			_nsdavis.lawn.syncRouteDate(true, false);
		} else if (_nsdavis.lawn.routing.techID) {
			_nsdavis.utils.selectOption(_$("select_route_tech"), _nsdavis.lawn.routing.techID);
			_$("i_route_date").value = new Date(_date).format("d"); //_$("i_date").value;
			_nsdavis.lawn.routing.calendarDate = _$("i_route_date").value;
			_nsdavis.lawn.syncRouteDate(true, false);
		} else {
			var _tech = _nsdavis.cookies.get("calendar_tech") ? _nsdavis.cookies.get("calendar_tech") : "";
			_nsdavis.utils.selectOption(_$("select_route_tech"), _tech);
			_nsdavis.lawn.routing.techID = _tech;
			_$("i_route_date").value = new Date(_date).format("d"); //_$("i_date").value;
			_nsdavis.lawn.routing.calendarDate = _$("i_route_date").value;
			_nsdavis.lawn.syncRouteDate(true, false);
		}
	}
	
	if (_callback){
		if (arguments[1]) {
			_callback(arguments[1]);
		} else {
			_callback(_nsdavis.lawn.routing.techID);
		}
	}
}

_nsdavis.lawn.refreshRoutingUI = function() {
	var _tech = _$("select_route_tech")[_$("select_route_tech").selectedIndex].value;
	var _date = _$("i_route_date").value;
	
	_nsdavis.lawn.routing.techID = _$("select_route_tech")[_$("select_route_tech").selectedIndex].value == "" ? _$("select_route_tech")[_$("select_route_tech").selectedIndex].value : _$("select_route_tech")[_$("select_route_tech").selectedIndex].value;
	_nsdavis.lawn.routing.calendarDate = _date;
	_nsdavis.lawn.initRoutingUI(_nsdavis.lawn.getRoute);
}

_nsdavis.lawn.initMap = function() {
	_nsdavis.lawn.routing.mapOptions = {
		elt: _$("div_map"),
		zoom: 10,
		latLng: {
			lat: 0,
			lng: 0
		},
		mtype: 'map',
		bestFitMargin: 0,
		zoomOnDoubleClick: true
	};
	_nsdavis.lawn.routing.setOptions(_nsdavis.lawn.routing.mapOptions,function(){
		window.map = new MQA.TileMap(_nsdavis.lawn.routing.mapOptions);
	});
}

_nsdavis.lawn.getBranchRoutingLat = function(_input, _callback) {
	if (_nsdavis.lawn.routing.techID != ""){
		var _branch = _nsdavis.lawn.data_branches.matchAssociative("branch_id",_nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_nsdavis.lawn.routing.techID)].user_branch_id)[0];
		
		if (_branch){
			var _json = {
				location: {
					street: _branch.branch_address ? _branch.branch_address : "",
					city: _branch.branch_city ? _branch.branch_city : "",
					state: _branch.branch_state ? _branch.branch_state : "",
					postalCode: _branch.branch_zip ? _branch.branch_zip : "",
				}
			};
			var _XHR = new XMLHttpRequest();
			_XHR.open("POST",_nsdavis.lawn.data.mapQuestGeocodeURL,true);
			_XHR.setRequestHeader("Content-Type","application/json; charset=UTF-8");
			_XHR.send(JSON.stringify(_json));
			_XHR.onreadystatechange = function(){
				if (_XHR.readyState == 4) {
					if (_XHR.status == 200) {
						var _response = JSON.parse(_XHR.response);
						
						if (_response.results.length){
							_input = _response.results[0].locations[0].latLng.lat;
							if (_callback){
								_callback();
							}
						} else {
							_input = 0;
							if (_callback){
								_callback();
							}
						}
					}
				}
			}
		} else {
			_input = 0;
			if (_callback){
				_callback();
			}
		}
	} else {
		_input = 0;
		if (_callback){
			_callback();
		}
	}
}

_nsdavis.lawn.getBranchRoutingLng = function(_input, _callback) {
	if (_nsdavis.lawn.routing.techID != ""){
		var _branch = _nsdavis.lawn.data_branches.matchAssociative("branch_id",_nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_nsdavis.lawn.routing.techID)].user_branch_id)[0];
		
		if (_branch){
			var _json = {
				location: {
					street: _branch.branch_address ? _branch.branch_address : "",
					city: _branch.branch_city ? _branch.branch_city : "",
					state: _branch.branch_state ? _branch.branch_state : "",
					postalCode: _branch.branch_zip ? _branch.branch_zip : "",
				}
			};
			var _XHR = new XMLHttpRequest();
			_XHR.open("POST",_nsdavis.lawn.data.mapQuestGeocodeURL,true);
			_XHR.setRequestHeader("Content-Type","application/json; charset=UTF-8");
			_XHR.send(JSON.stringify(_json));
			_XHR.onreadystatechange = function(){
				if (_XHR.readyState == 4) {
					if (_XHR.status == 200) {
						var _response = JSON.parse(_XHR.response);
						
						if (_response.results.length){
							_input = _response.results[0].locations[0].latLng.lng;
							if (_callback){
								_callback();
							}

						} else {
							_input = 0;
							if (_callback){
								_callback();
							}
						}
					}
				}
			}
		} else {
			_input = 0;
			if (_callback){
				_callback();
			}
		}
	} else {
		_input = 0;
		if (_callback){
			_callback();
		}
	}
}

_nsdavis.lawn.selectTech = function() {
	_nsdavis.lawn.routing.techID = _$("select_route_tech")[_$("select_route_tech").selectedIndex].value == "" ? _$("select_tech")[_$("select_tech").selectedIndex].value : _$("select_route_tech")[_$("select_route_tech").selectedIndex].value;
}

_nsdavis.lawn.pickRouteDate = function(_date,_ignoreRefresh) {
	_nsdavis.lawn.routing.calendarDate = _date;
	_nsdavis.lawn.syncRouteDate("",_ignoreRefresh);
	_nsdavis.lawn.initRoutingUI(_nsdavis.lawn.getRoute);
}

_nsdavis.lawn.setRouteDate = function(_ignorePick) {
	var _value = _$("i_route_date").value;
	
	if (_value.isDate()) {
		var _date = new Date(_value).format("d");
		_nsdavis.lawn.routing.calendarDate = _date;
		_nsdavis.utils.cal.setDate();
		_nsdavis.lawn.syncRouteDate(_ignorePick);
	}
}

_nsdavis.lawn.syncRouteDate = function(_ignorePick,_ignoreRefresh) {
	var _date = new Date(_nsdavis.lawn.routing.calendarDate);
	
	if (!_ignorePick) {
		_nsdavis.utils.cal.input = _nsdavis.utils.cal.input == "" || _nsdavis.utils.cal.input == _$("i_date") ? _$("i_route_date") : _nsdavis.utils.cal.input;
		_nsdavis.utils.cal.pickDate(_date.format("d"));
	}
	
	if (!_ignoreRefresh) {
		_nsdavis.lawn.refresh();
	}
}

_nsdavis.lawn.getEvents = function(_calendardate,_techID,_callback) {
	var _date = new Date(_calendardate).format("d");
	var _queryString = "sitetoken=" + _nsdavis.sitetoken + "&sessionid=" + escape(_nsdavis.sessionID) + "&rpc=getServiceOrdersScheduledByDate&serviceorder_service_date=" + escape(_date) + "&user_id_list=" + _techID + "&dt=" + escape(new Date());
	_nsdavis.ajax.get(_nsdavis.dataAdapterURL + "?" + _queryString, function(_response) {
		var _data = new _NSXML.stringToArray(_response,"Table");
		_nsdavis.lawn.routing.data_events = _data;
	
		if (_callback) {
			_callback();
		}
	
	});
}

_nsdavis.lawn.getBranches = function(_callback){
	var _queryString = "sitetoken=" + _nsdavis.sitetoken + "&sessionid=" + escape(_nsdavis.sessionID) + "&rpc=getBranchesAndLocations&dt=" + escape(new Date());
	_nsdavis.ajax.get(_nsdavis.dataAdapterURL + "?" + _queryString, function(_response) {
		_nsdavis.lawn.data_branches = new _NSXML.stringToArray(_response,"Table");

		if (_callback){
			_callback();
		}

	},"post");
}

_nsdavis.lawn.getRoute = function(_techID) {
	var _button = _techID ? true : false;
	var _tech = _techID ? _techID : _nsdavis.lawn.routing.techID ? _nsdavis.lawn.routing.techID : "";
	_nsdavis.lawn.routing.techID = _tech;
	_nsdavis.lawn.routing.lockedIndices = [];
	var _startdate = _techID ? (_nsdavis.lawn.routing.calendarDate ? new Date(_nsdavis.lawn.routing.calendarDate).format("d") : new Date(_nsdavis.lawn.calendarDate).format("d") ) : new Date(_nsdavis.lawn.calendarDate).format("d");
	var _enddate = _techID ? (_nsdavis.lawn.routing.calendarDate ? new Date(_nsdavis.lawn.routing.calendarDate).add("d",1).add("s",-1).format("d") : new Date(_nsdavis.lawn.calendarDate).format("d") ) : new Date(_nsdavis.lawn.calendarDate).format("d");
	var _queryString = "sitetoken=" + _nsdavis.sitetoken + "&sessionid=" + escape(_nsdavis.sessionID) + "&rpc=getScheduleForTechnician&startdate=" + _startdate + "&enddate=" + _enddate + "&user_id=" + _tech + "&dt=" + escape(new Date());
	_nsdavis.ajax.get(_nsdavis.dataAdapterURL + "?" + _queryString, function(_response) {
		var _events = new _NSXML.stringToArray(_response,"Table");
		_events = _events.sort(function(a,b) { return (new Date(a.check_startdate) - new Date(b.check_startdate)); });
		
		if (_events.length > 0) {
			_$("div_location_table").innerHTML = "";
			_$("div_map_display").innerHTML = "";
			_$("tech_name").innerHTML = "";
			_$("div_location_table").appendChild(_nsdavis.utils.loadingElement());
			_$("div_map_display").appendChild(_nsdavis.utils.loadingElement());
			_nsdavis.lawn.routing.data_events = _events;
			_nsdavis.lawn.getBranches(function(){
				var _branches = _nsdavis.lawn.data_branches;
				var _branch = {};
				var _json = {};
				var _location = {};
				_json.locations = [];
				
				_json.mapState = {
					width: 750,
					height: 500
				}
				
				_json.options = {
					doReverseGeocode: "false",
					narrativeType: "none",
					shapeFormat: "cmp"
				};
				
				if (!_json.locations.length){
					try {
						_branch = _branches.matchAssociative("branch_id",_nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_tech)].user_branch_id)[0];	//ASK JONATHON TO ADD user_branch_id TO genGetUsers
						_location.street = _branch.branch_address ? _branch.branch_address : "";
						_location.adminArea5 = _branch.branch_city ? _branch.branch_city : "";
						_location.adminArea3 = _branch.branch_state ? _branch.branch_state : "";
						_location.postalCode = _branch.branch_zip ? _branch.branch_zip : "";
					} catch(e) { console.log(e); }
					_json.locations.push(_location);
					
					if (_events.length){
						var _toDelete = [];
						
						for (var i=0; i < _events.length; i++) {
							_location = {};
							
							if (_events[i].timeblock_id && (parseInt(_events[i].timeblock_id) != 0)){
								_toDelete.push(i);//_events.splice(i,1);
								//_delete = _nsdavis.lawn.routing.data_events.splice(i,1);
								continue;
							}
							
							if (_events[i].customer_street) {
									_location.street = _events[i].customer_street ? _events[i].customer_street : "";
									_location.adminArea5 = _events[i].customer_city ? _events[i].customer_city : "";
									_location.adminArea3 = _events[i].customer_state ? _events[i].customer_state : "";
									_location.postalCode = _events[i].customer_zip ? _events[i].customer_zip : "";
									
									if (_events[i].serviceorderschedule_is_locked == "true"){
										_nsdavis.lawn.routing.lockedIndices.push(i);
									}
									
									_json.locations.push(_location);
							}
						}
						
						for (var j = _toDelete.length - 1; j >= 0; j--){
							var _delete = _events.splice(_toDelete[j],1);
							_delete = _nsdavis.lawn.routing.data_events.splice(_toDelete[j],1);
						}
					}
					_json.locations.push(_json.locations[0]);
					_nsdavis.lawn.routing.locationArray = _json.locations;
				}
				
				for (var i = 0; i < _events.length; i++){
					_nsdavis.lawn.routing.data_events[i].duplicates = [];
					var _check = _events.matchAssociative("customer_id",_events[i].customer_id);
					if (_check.length > 1){
						for (var j = 0; j < _check.length; j++){
							_nsdavis.lawn.routing.data_events[i].duplicates.push(_check[j].serviceorderschedule_id);
						}
					}
				}
				
				var _XHR = new XMLHttpRequest();
				_XHR.open("POST",_nsdavis.lawn.data.mapQuestRouteURL,true);
				_XHR.setRequestHeader("Content-Type","application/json; charset=UTF-8");
				_XHR.send(JSON.stringify(_json));
				_XHR.onreadystatechange = function(){
					if (_XHR.readyState == 4) {
						if (_XHR.status == 200) {
							var _mapResponse = JSON.parse(_XHR.response);
							_nsdavis.lawn.routing.mapResponse = _mapResponse;
							console.log(_mapResponse);
							console.log(_events);
							_$("tech_name").innerHTML = _nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_tech)].user_name;
							var _div = _$("div_location_table");
							_div.innerHTML = "";
							var _thead = document.createElement("thead");
							var _tbody = document.createElement("tbody");
							var _labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
							
							for (var i = 1; i < _mapResponse.route.locations.length - 1; i++) {
								if (_nsdavis.lawn.routing.data_events[i-1]){
									_nsdavis.lawn.routing.data_events[i-1].latLng = _mapResponse.route.locations[i].latLng;
								}
							}
							
							for (var j = 0; j < _mapResponse.route.locations.length; j++){
								var _tr = document.createElement("tr");
								var _td = document.createElement("td");
								_td.className = "w5p fl";
								_td.innerHTML = _labels[j];
								_tr.appendChild(_td);
								_td = document.createElement("td");
								var _address = document.createElement("div");
								_address.className = "fl";
								_address.innerHTML = _mapResponse.route.locations[j].street + " " + _mapResponse.route.locations[j].adminArea5 + ", " + _mapResponse.route.locations[j].adminArea3 + " " + _mapResponse.route.locations[j].postalCode;
								_td.appendChild(_address);
								_address = document.createElement("div");
								_address.className = "fr";
								
								for (var i = 0; i < _events.length; i++){
									if (!_events[i].used && _nsdavis.lawn.routing.data_events[i].latLng.lat == _mapResponse.route.locations[j].latLng.lat && _nsdavis.lawn.routing.data_events[i].latLng.lng == _mapResponse.route.locations[j].latLng.lng){
										_address.innerHTML = _events[i].serviceorder_product_list;
										
										if (_events[i].serviceorderschedule_is_locked == "true"){
											_tr.className = _tr.className + " locked";
										}
										
										_events[i].used = true;
										break;
									}
								}
								
								_td.appendChild(_address);
								_tr.appendChild(_td);
								_tbody.appendChild(_tr);
							}
							
							for (var i = 0; i < _events.length; i++) {
								_events[i].used = false;
							}
				
							var _table = new _nsdavis.utils.tableElement("table_locations","table w100p s open",_thead,_tbody);
							_table.className += " draggable";
							_div.appendChild(_table);
							_nsdavis.dragrow.init(_nsdavis.lawn.initUpdateRoute);
							
							if (_button){
								if (_nsdavis.cookies.get("lawn_tab") != 2){
									_nsdavis.ui.selectTab("ul_tabs","div_content","button_tabs",2);
								}
							}
							
							_nsdavis.lawn.routing.getDraggableMap(_mapResponse);
							
							var table_locations = _$("table_locations");

							for (var i = 1; i < table_locations.tBodies[0].rows.length - 1; i++){
								for (var j = 0; j < _nsdavis.lawn.routing.mapResponse.route.locations.length; j++){
									var _test = _nsdavis.lawn.routing.mapResponse.route.locations[j].street + " " + _nsdavis.lawn.routing.mapResponse.route.locations[j].adminArea5 + ", " + _nsdavis.lawn.routing.mapResponse.route.locations[j].adminArea3 + " " + _nsdavis.lawn.routing.mapResponse.route.locations[j].postalCode;
									var _test1 = table_locations.tBodies[0].rows[i].cells[1].children[0].innerHTML;

									if (_test == _test1){
										_nsdavis.lawn.routingLocationArray.push(_nsdavis.lawn.routing.mapResponse.route.locations[j]);
										continue;
									}
								}
							}
						}
					}
				}
				_$("div_map").show();
			});
		} else {
			_$("tech_name").innerHTML = _nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_tech)].user_name;
			_nsdavis.utils.selectOption(_$("select_route_tech"), _tech);
			_$("div_location_table").innerHTML = "There are no services scheduled for this day.";
			_$("div_map_display").innerHTML = "";
			
			if (_button){
				if (_nsdavis.cookies.get("lawn_tab") != 2){
					_nsdavis.ui.selectTab("ul_tabs","div_content","button_tabs",2);
				}
			}
		}
	},"post");
}

/***
 * getOptimizedRoute uses the MapQuest API to get a route optimized between multiple locations. It was used once locations had been assigned to a technician in order to work out the most optimal route
 ***/
_nsdavis.lawn.getOptimizedRoute = function(_techID) {
	var _button = _techID ? true : false;
	var _tech = _techID ? _techID : _nsdavis.lawn.routing.techID ? _nsdavis.lawn.routing.techID : "";
	_nsdavis.lawn.routing.techID = _tech;
	_nsdavis.lawn.routing.lockedIndices = [];
	var _startdate = _techID ? (_nsdavis.lawn.routing.calendarDate ? new Date(_nsdavis.lawn.routing.calendarDate).format("d") : new Date(_nsdavis.lawn.calendarDate).format("d") ) : new Date(_nsdavis.lawn.calendarDate).format("d");
	var _enddate = _techID ? (_nsdavis.lawn.routing.calendarDate ? new Date(_nsdavis.lawn.routing.calendarDate).add("d",1).add("s",-1).format("d") : new Date(_nsdavis.lawn.calendarDate).format("d") ) : new Date(_nsdavis.lawn.calendarDate).format("d");
	var _queryString = "sitetoken=" + _nsdavis.sitetoken + "&sessionid=" + escape(_nsdavis.sessionID) + "&rpc=getScheduleForTechnician&startdate=" + _startdate + "&enddate=" + _enddate + "&user_id=" + _tech + "&dt=" + escape(new Date());
	_nsdavis.ajax.get(_nsdavis.dataAdapterURL + "?" + _queryString, function(_response) {
		var _events = new _NSXML.stringToArray(_response,"Table");
		console.log("Events: %o\nIDs: %o\n",_events.length,_events.getDistinctListFromAssociative("serviceorderschedule_id").length);
		_events = _events.sort(function(a,b) { return (new Date(a.check_startdate) - new Date(b.check_startdate)); });
		if (_events.length > 0) {
			_$("div_location_table").innerHTML = "";
			_$("div_map_display").innerHTML = "";
			_$("tech_name").innerHTML = "";
			_$("div_location_table").appendChild(_nsdavis.utils.loadingElement());
			_$("div_map_display").appendChild(_nsdavis.utils.loadingElement());
		
			_nsdavis.lawn.getBranches(function(){
				var _branches = _nsdavis.lawn.data_branches;
				var _branch = {};
				var _json = {};
				var _location = {};
				_json.locations = [];
				
				_json.mapState = {
					width: 750,
					height: 500

				}
				
				_json.options = {
					doReverseGeocode: "false",
					narrativeType: "none",
					shapeFormat: "cmp"
				};
				
				if (!_json.locations.length){
					try {
						_branch = _branches.matchAssociative("branch_id",_nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_tech)].user_branch_id)[0];
						_location.street = _branch.branch_address ? _branch.branch_address : "";
						_location.adminArea5 = _branch.branch_city ? _branch.branch_city : "";
						_location.adminArea3 = _branch.branch_state ? _branch.branch_state : "";
						_location.postalCode = _branch.branch_zip ? _branch.branch_zip : "";
					} catch(e) { console.log(e); }
					_json.locations.push(_location);
					
					if (_events.length){
						for (var i=0; i < _events.length; i++) {
							_location = {};
							
							if (_events[i].timeblock_id && (parseInt(_events[i].timeblock_id) != 0)){
								var _delete = _events.splice(i,1);
								continue;
							}
							
							if (_events[i].customer_street) {
								if (_json.locations[_json.locations.length - 1].street != _events[i].customer_street || _json.locations[_json.locations.length - 1].adminArea5 != _events[i].customer_city || _json.locations[_json.locations.length - 1].adminArea3 != _events[i].customer_state || _json.locations[_json.locations.length - 1].postalCode != _events[i].customer_zip){
									_location.street = _events[i].customer_street ? _events[i].customer_street : "";
									_location.adminArea5 = _events[i].customer_city ? _events[i].customer_city : "";
									_location.adminArea3 = _events[i].customer_state ? _events[i].customer_state : "";
									_location.postalCode = _events[i].customer_zip ? _events[i].customer_zip : "";
									
									if (_events[i].serviceorderschedule_is_locked == "true"){
										_nsdavis.lawn.routing.lockedIndices.push(i);
									}
									
									_json.locations.push(_location);
								}
							}
						}
					}
					_json.locations.push(_json.locations[0]);
					_nsdavis.lawn.routing.locationArray = _json.locations;
				}

				var _XHR = new XMLHttpRequest();
				_XHR.open("POST",_nsdavis.lawn.data.mapQuestOptimizedRouteURL,true);
				_XHR.setRequestHeader("Content-Type","application/json; charset=UTF-8");
				_XHR.send(JSON.stringify(_json));
				_XHR.onreadystatechange = function(){
					if (_XHR.readyState == 4) {
						if (_XHR.status == 200) {
							var _mapResponse = JSON.parse(_XHR.response);
							_nsdavis.lawn.routing.mapResponse = _mapResponse;
							console.log(_mapResponse);
							console.log(_events);
							_$("tech_name").innerHTML = _nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_tech)].user_name;
							var _div = _$("div_location_table");
							_div.innerHTML = "";
							var _thead = document.createElement("thead");
							var _tbody = document.createElement("tbody");
							var _labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
							
							for (var j = 0; j < _mapResponse.route.locations.length; j++){
								var _tr = document.createElement("tr");
								var _td = document.createElement("td");
								_td.className = "w5p fl";
								_td.innerHTML = _labels[j];
								_tr.appendChild(_td);
								_td = document.createElement("td");
								var _address = document.createElement("div");
								_address.className = "fl";
								_address.innerHTML = _mapResponse.route.locations[j].street + " " + _mapResponse.route.locations[j].adminArea5 + ", " + _mapResponse.route.locations[j].adminArea3 + " " + _mapResponse.route.locations[j].postalCode;
								_td.appendChild(_address);
								_address = document.createElement("div");
								_address.className = "fr";
								
								for (var i = 0; i < _events.length; i++){
									if (!_events[i].used && _nsdavis.lawn.routing.data_events[i].latLng.lat == _mapResponse.route.locations[j].latLng.lat && _nsdavis.lawn.routing.data_events[i].latLng.lng == _mapResponse.route.locations[j].latLng.lng){
										_address.innerHTML = _events[i].serviceorder_product_list;
										if (_events[i].serviceorderschedule_is_locked == "true"){
											_tr.className = _tr.className + " locked";
										}
										_events[i].used = true;
										break;
									}
								}
								
								_td.appendChild(_address);
								_tr.appendChild(_td);
								_tbody.appendChild(_tr);
							}
							
							for (var i = 0; i < _events.length; i++) {
								_events[i].used = false;
							}

							var _table = new _nsdavis.utils.tableElement("table_locations","table w100p s open",_thead,_tbody);
							_table.className += " draggable";
							_div.appendChild(_table);
							_nsdavis.dragrow.init(_nsdavis.lawn.initUpdateRoute);
							
							if (_button){
								if (_nsdavis.cookies.get("lawn_tab") != 2){
									//_nsdavis.cookies.set("lawn_tab",2,999999);
									_nsdavis.ui.selectTab("ul_tabs","div_content","button_tabs",2);
								}
							}

							_nsdavis.lawn.routing.getDraggableMap(_mapResponse);
							var table_locations = _$("table_locations");
								
							for (var i = 1; i < table_locations.tBodies[0].rows.length - 1; i++){
								for (var j = 0; j < _nsdavis.lawn.routing.mapResponse.route.locations.length; j++){
									var _test = _nsdavis.lawn.routing.mapResponse.route.locations[j].street + " " + _nsdavis.lawn.routing.mapResponse.route.locations[j].adminArea5 + ", " + _nsdavis.lawn.routing.mapResponse.route.locations[j].adminArea3 + " " + _nsdavis.lawn.routing.mapResponse.route.locations[j].postalCode;
									var _test1 = table_locations.tBodies[0].rows[i].cells[1].children[0].innerHTML;
									
									if (_test == _test1){
										_nsdavis.lawn.routingLocationArray.push(_nsdavis.lawn.routing.mapResponse.route.locations[j]);
										continue;
									}
								}
							}
						}
					}
				}
				_$("div_map").show();
			});
		} else {
			_$("tech_name").innerHTML = _nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_tech)].user_name;
			_$("div_location_table").innerHTML = "There are no services scheduled for this day.";
			_$("div_map_display").innerHTML = "";
		}
	},"post");
}

_nsdavis.lawn.initUpdateRoute = function(){
	var _locations = [];
	var _location = {};
	
	try {
		var _branch = _nsdavis.lawn.data_branches.matchAssociative("branch_id",_nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_nsdavis.lawn.routing.techID)].user_branch_id)[0];
		_location.street = _branch.branch_address ? _branch.branch_address : "";
		_location.adminArea5 = _branch.branch_city ? _branch.branch_city : "";
		_location.adminArea3 = _branch.branch_state ? _branch.branch_state : "";
		_location.postalCode = _branch.branch_zip ? _branch.branch_zip : "";
	} catch(e) { console.log(e); }
	_locations.push(_location);

	var table_locations = _$("table_locations");
	
	if (_nsdavis.lawn.routingLocationArray.length == 0) {
		for (var i = 1; i < table_locations.tBodies[0].rows.length - 1; i++){
			for (var j = 0; j < _nsdavis.lawn.routing.mapResponse.route.locations.length; j++){
				var _test = _nsdavis.lawn.routing.mapResponse.route.locations[j].street + " " + _nsdavis.lawn.routing.mapResponse.route.locations[j].adminArea5 + ", " + _nsdavis.lawn.routing.mapResponse.route.locations[j].adminArea3 + " " + _nsdavis.lawn.routing.mapResponse.route.locations[j].postalCode;
				var _test1 = table_locations.tBodies[0].rows[i].cells[1].children[0].innerHTML;
				if (_test == _test1){
					_nsdavis.lawn.routingLocationArray.push(_nsdavis.lawn.routing.mapResponse.route.locations[j]);
					// _locations.push(_nsdavis.lawn.routing.mapResponse.route.locations[j]);
					continue;
				}
			}
		}
	} else {
		var _tmpArray = [];
		for (var i = 1; i < table_locations.tBodies[0].rows.length - 1; i++){
			for (var j = 0; j < _nsdavis.lawn.routingLocationArray.length; j++){
				var _test = _nsdavis.lawn.routingLocationArray[j].street + " " + _nsdavis.lawn.routingLocationArray[j].adminArea5 + ", " + _nsdavis.lawn.routingLocationArray[j].adminArea3 + " " + _nsdavis.lawn.routingLocationArray[j].postalCode;
				var _test1 = table_locations.tBodies[0].rows[i].cells[1].children[0].innerHTML;
				if (_test == _test1){
					_tmpArray.push(_nsdavis.lawn.routingLocationArray[j]);
					// _locations.push(_nsdavis.lawn.routing.mapResponse.route.locations[j]);
					continue;
				}
			}
		}
		_nsdavis.lawn.routingLocationArray = _tmpArray;
	}	
	
	for (var i = 0; i < _nsdavis.lawn.routingLocationArray.length; i++) {
		_locations.push(_nsdavis.lawn.routingLocationArray[i]);
	}
	
	_locations.push(_locations[0]);
	
	var _json = {
		locations: _locations
	};
	
	var _XHR = new XMLHttpRequest();
	_XHR.open("POST",_nsdavis.lawn.data.mapQuestRouteURL,true);
	_XHR.setRequestHeader("Content-Type","application/json; charset=UTF-8");
	_XHR.send(JSON.stringify(_json));
	_XHR.onreadystatechange = function(){
		if (_XHR.readyState == 4) {
			if (_XHR.status == 200) {
				var _mapResponse = JSON.parse(_XHR.response);
				_nsdavis.lawn.routing.mapResponse = _mapResponse;
				var _labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
				for (var i = 0; i < _$("table_locations").tBodies[0].rows.length; i++){
					_$("table_locations").tBodies[0].rows[i].cells[0].innerHTML = _labels[i];
				}
				_nsdavis.lawn.routing.getDraggableMap(_mapResponse);
			}
		}
	}
}

_nsdavis.lawn.routing.getDraggableMap = function(_input){
	var _latLngs = [];
	
	for (var l = 0; l < _input.route.locations.length; l++){
		var _obj = {
			latLng: _input.route.locations[l].latLng
		}
		_latLngs.push(_obj);
	}
	
	_nsdavis.lawn.routing.mapOptions = {
		elt: _$("div_map_display"),
		zoom: 10,
		latLng: {
			lat: 0,
			lng: 0
		},
		mtype: 'map',
		bestFitMargin: 0,
		zoomOnDoubleClick: true
	};
	
	_$("div_map_display").innerHTML = ""
	
	_nsdavis.lawn.routing.setOptions(_nsdavis.lawn.routing.mapOptions,function(){
		window.map = new MQA.TileMap(_nsdavis.lawn.routing.mapOptions);
		MQA.withModule('mousewheel', 'smallzoom', 'new-route', function() {
			map.addRoute({
				request: {
					locations: _latLngs
				},
				display: {
					draggable: true
				}
			});
			map.addControl(new MQA.SmallZoom());
			map.enableMouseWheelZoom();
		});
	});
}

_nsdavis.lawn.routing.setOptions = function(_input, _callback){
	_nsdavis.lawn.getBranchRoutingLat(_input.latLng.lat,function(){
		_nsdavis.lawn.getBranchRoutingLng(_input.latLng.lng,function(){
			if (_callback){
				_callback();
			}
		});
	});
}

_nsdavis.lawn.routing.getMap = function(_input){
	var _json = "";
	_json += "&size=750,500";
	_json += "&shapeformat=cmp";
	_json += "&bestfit="+_input.route.boundingBox.ul.lat+","+_input.route.boundingBox.ul.lng+","+_input.route.boundingBox.lr.lat+","+_input.route.boundingBox.lr.lng;
	_json += "&shape="+_input.route.shape.shapePoints;
	_json += "&scenter="+_input.route.locations[0].latLng.lat+","+_input.route.locations[0].latLng.lng;
	_json += "&ecenter="+_input.route.locations[_input.route.locations.length - 1].latLng.lat+","+_input.route.locations[_input.route.locations.length - 1].latLng.lng;
	
	if (_input.route.locations.length > 2){
		_json += "&stops=";
		for (var i = 1; i < _input.route.locations.length - 1; i++){
			var _string = 'abcdefghijklmnopqrstuvwxyz';
			var _label = _string.charAt(i%_string.length);
			var _stop = _label+","+_input.route.locations[i].latLng.lat+","+_input.route.locations[i].latLng.lng;
			if (i < _input.route.locations.length - 2){
				_stop += "|";
			}
			_json += _stop;
		}
	}
	
	_json += "&session="+_input.route.sessionId;
	var _div = document.createElement("div");
	_div.className = "w50p ofa";
	var _img = document.createElement("img");
	_img.setAttribute("src",_nsdavis.lawn.data.mapQuestMapURL + _json);
	_img.style.width = "750px";
	_img.style.height = "500px";
	_div.appendChild(_img);
	_$("div_routing").appendChild(_div);
}

_nsdavis.lawn.acceptRoute = function() {
	var _events = _nsdavis.lawn.routing.data_events;
	var _durationCount = 0;
	var _locations = [];
	var _location = {};
	
	try {
		var _branch = _nsdavis.lawn.data_branches.matchAssociative("branch_id",_nsdavis.lawn.data_techs[_nsdavis.lawn.data_techs.associativeIndex("user_id",_nsdavis.lawn.routing.techID)].user_branch_id)[0];
		_location.street = _branch.branch_address ? _branch.branch_address : "";
		_location.adminArea5 = _branch.branch_city ? _branch.branch_city : "";
		_location.adminArea3 = _branch.branch_state ? _branch.branch_state : "";
		_location.postalCode = _branch.branch_zip ? _branch.branch_zip : "";
	} catch(e) { console.log(e); }
	_locations.push(_location);
	
	for (var i = 0; i < _nsdavis.lawn.routingLocationArray.length; i++) {
		_locations.push(_nsdavis.lawn.routingLocationArray[i]);
	}
	
	_locations.push(_location);
	
	for (var i = 1; i < _locations.length - 1; i++){
		for (var j = 0; j < _events.length; j++){
			if (!_events[j].used) {
				if (_events[j].latLng.lng == _locations[i].latLng.lng && _events[j].latLng.lat == _locations[i].latLng.lat) {
					if (i == _locations.length - 1){
						var _callback = _nsdavis.lawn.refreshMatrix;
					} else {
						var _callback = "";
					}
					if (_events[j].serviceorderschedule_is_locked != "true"){
						_nsdavis.lawn.routing.moveEvents.push(_events[j].serviceorderschedule_id);
					}
					_events[j].used = true;
					break;
				}
			}
		}
	}
	for (var i = 0; i < _events.length; i++) {
		_events[i].used = false;
	}
	_nsdavis.lawn.routing.checkDuplicates(_nsdavis.lawn.routing.moveEvents);
}

_nsdavis.lawn.routing.checkDuplicates = function(_input){
	
	for (var i = 0; i < _nsdavis.lawn.routing.data_events.length; i++){
		if (_nsdavis.lawn.routing.data_events[i].duplicates.length){
			for (var j = 0; j < _nsdavis.lawn.routing.data_events[i].duplicates.length; j++){
				if (_input.indexOf(_nsdavis.lawn.routing.data_events[i].duplicates[j]) < 0){
					if (_input.indexOf(_nsdavis.lawn.routing.data_events[i].serviceorderschedule_id) >= 0){
						_input.splice(_input.indexOf(_nsdavis.lawn.routing.data_events[i].serviceorderschedule_id), 0, _nsdavis.lawn.routing.data_events[i].duplicates[j]);
					} else {
						_input.push(_nsdavis.lawn.routing.data_events[i].duplicates[j]);
					}
				}
			}
		}
	}
	
	_nsdavis.lawn.routing.initEventMove(_input, function(){
		if (_$("select_tech").childNodes.length > 1) {
			_nsdavis.utils.selectOption(_$("select_tech"), _$("select_route_tech")[_$("select_route_tech").selectedIndex].value);
		}
		_nsdavis.lawn.refreshMatrix();
		var _index = _nsdavis.cookies.get("lawn_tab") ? _nsdavis.cookies.get("lawn_tab") : 0;
		_nsdavis.lawn.selectTab(_index);
	});
}

_nsdavis.lawn.cancelRoute = function(){
	var _index = _nsdavis.cookies.get("lawn_tab") ? _nsdavis.cookies.get("lawn_tab") : 0;
	_nsdavis.lawn.selectTab(_index);
}

_nsdavis.lawn.routing.initEventMove = function(_input, _callback) {
	var _queryString = "sitetoken=" + _nsdavis.sitetoken + "&sessionid=" + escape(_nsdavis.sessionID) + "&rpc=updateScheduledServiceOrderList&serviceorderschedule_id_list=" + _input.join(",") + "&dt=" + escape(new Date());
	_nsdavis.ajax.get(_nsdavis.dataAdapterURL + "?" + _queryString, function(_response) {
		if (_callback){
			_callback();
		}
	},"post");
}

//#######################
//# DATA
//#######################

_nsdavis.lawn.data = {
	mapQuestMatrixURL: "http://www.mapquestapi.com/directions/v2/routematrix?key=mapQuestKey",
	mapQuestRouteURL: "http://www.mapquestapi.com/directions/v2/route?key=mapQuestKey",
	mapQuestOptimizedRouteURL: "http://www.mapquestapi.com/directions/v2/optimizedroute?key=mapQuestKey",
	mapQuestMapURL: "http://open.mapquestapi.com/staticmap/v4/getmap?key=mapQuestKey",
	mapQuestDragRouteURL: "http://www.mapquestapi.com/directions/v2/dragroute?key=mapQuestKey",
	mapQuestGeocodeURL: "http://www.mapquestapi.com/geocoding/v1/address?key=mapQuestKey"
}

//########################
//# DISTANCE
//########################


/***
 * testDistance checks the distance "as the crow flies" between two GPS coordinates. It was used to get a close approximation of the distance between customer locations.
 ***/
_nsdavis.lawn.testDistance = function(_coords){
	var _phi1 = _coords[0].lat * Math.PI / 180;
	var _phi2 = _coords[1].lat * Math.PI / 180;
	var _deltaLambda = (_coords[1].lng - _coords[0].lng) * Math.PI / 180;
	var _R = 6371;
	var _distance = Math.acos(parseFloat((Math.sin(_phi1)*Math.sin(_phi2) + Math.cos(_phi1)*Math.cos(_phi2)*Math.cos(_deltaLambda)).toFixed(12)))*_R*0.621371;
	
	return _distance;
}