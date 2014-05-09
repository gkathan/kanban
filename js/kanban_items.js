/** kanban_items
* depends on:
	+ kanban_core.js
	+ kanban_util.js
	 * @version: 0.6
 * @author: Gerold Kathan (www.kathan.at)
 * @date: 2014-03-16
 * @copyright: 
 * @license: 
 * @website: www.kathan.at
 */




//the data as it is read on init = flat JSON table
var initiativeData;
var targetData;

// depending on context we filter this data for every view
var filteredInitiativeData;

var postitData;

// hierarchical data enriched with y-coords based on lanestructure
var itemTree;
var targetTree;


//top root parent of nested item hierarchy
var NEST_ROOT="root";
// nest -level
var ITEMDATA_NEST;

var ITEMDATA_FILTER;

//depth level 
// set in createLaneHierarchy()
var ITEMDATA_DEPTH_LEVEL;





/**
 * the values in the override mean % of space the lanes will get => has to sum to 100% 
 */
var itemDataConfig;
/**
 * "auto": takes the sum of subitems as basline and calculates the distribution accordingly - the more items the more space
 * "equal": takes the parent length of elements and calculates the equal distributed space (e.g. lane "bwin" has 4 sublanes => each sublane gets 1/4 (0.25) for its distribution
 * "override": takes specified values and overrides the distribution with those values => not implemented yet ;-)
 */




// scaling of graphical elements (itemblock,circle, circle icon)	
var ITEM_SCALE=0.8;
var ITEM_FONTSCALE=1.5;
// when to wrap name of item
var ITEM_TEXT_MAX_CHARS = 30;
var ITEM_TEXT_SWAG_MAX_CHARS =20;

// the relative scaling compared to ITEM 
// if set to 1 = TACTICS are in same SIZE than corp ITEMS
// if set to e.g. 0.5 TACTICS are half the size
var TACTIC_SCALE=0.9;


var POSTIT_SCALE=1;
var CUSTUM_POSTIT_SCALE=1;



//on item doubleclick
var ITEM_ISOLATION_MODE = false;


// ----------------------------------------------------------------------------------------------------------------
// ---------------------------------------------- TARGETS SECTION ---------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------


/** renders the targets
*/
function drawTargets(){
	d3.selectAll("#targets,#targetDependencies").remove();
	
	var drag_item = _registerDragDrop();
	tooltip.attr("class","targetTooltip");
	
	//initiatives groups
	var gTargets = svg.append("g").attr("id","targets");
	
	svg.append("g").attr("id","targetDependencies");
	


	//target block
	_drawText(gTargets,"TARGET",x(KANBAN_END)+(TARGETS_COL_WIDTH/2),(-5),{"size":"14px","color":COLOR_BPTY,"opacity":0.3,"anchor":"middle","weight":"bold"});
	
	gTargets.append("rect")
		.attr("x",x(KANBAN_END))
		.attr("width",TARGETS_COL_WIDTH)
		.attr("y",0)
		.attr("height",y(100))
		.style("fill","white")
		.style("opacity",0.1);
	
	var groups = gTargets.selectAll("targets")
	.data(targetData)
	.enter()
	// **************** grouped item + svg block + label text
	.append("g")
	.attr("id",function(d){return "target_"+d.id})
	.each(function(d){
		var _size = d.size*ITEM_SCALE;
		
		// if we want to show exactly targets on their dates .....
		// var _itemXTarget = x(new Date(d.targetDate));
		
		//other option is to put them (visually cleaner) always after the timeline
		var _itemXTarget = x(KANBAN_END)+(TARGETS_COL_WIDTH/2);
		
		
		var _yOffset = getSublaneCenterOffset(getFQName(d));
		var _sublane = getSublaneByNameNEW(getFQName(d));
		
		if (_sublane) {
			var _sublaneHeigth = _sublane.yt2-_sublane.yt1;
			var _itemY = y(_sublane.yt1-_yOffset)+getInt(d.sublaneOffset);
			
			d3.select(this)
				.style("opacity",d.accuracy/10);
			
			
			// ------------  targeticon & names & postits --------------
			// if isCorporate flag is not set use "tactic" icon 
			var _iconRef=d.Type;
			
			_drawXlink(d3.select(this),"#"+_iconRef,(_itemXTarget-(1.2*_size)),(_itemY-(1.2*_size)),{"scale":_size/10});

			//prio
			_drawText(d3.select(this),d.ranking,_itemXTarget,(_itemY+1.3),{"anchor":"middle","size":"4px","color":"white","weight":"normal"});
			
			_drawItemName(d3.select(this),d,_itemXTarget,(_itemY)+ parseInt(_size)+(6+(_size/5)*ITEM_FONTSCALE));
			
			//_drawPostit(d3.select(this),d);

			// transparent circle on top for the event listener
			d3.select(this)
				.append("circle")
					.attr("id","event_circle_"+d.id)
					.attr("cx",_itemXTarget)
					.attr("cy",_itemY)
					.attr("r",_size)
					.style("opacity",0)
					.on("mouseover", function(d){onTooltipOverHandler(d,tooltip);}) 
						
					.on("mousemove", function(d){onTooltipMoveHandler(tooltip);})
					.on("dblclick",	function(d){onTooltipDoubleClickHandler(tooltip,d3.select(this),d);})
					.on("mouseout", function(d){onTooltipOutHandler(d,tooltip);})

			// ------------  dependencies --------------
			// this should be extracted into function...

			//if (!isNaN(parseInt(d.initiatives))){
			if (d.initiatives){
				//console.log("============================== "+d.id+" depends on: "+d.dependsOn); 
				
				var _dependingItems = d.initiatives.split(",");
				//console.log("target depending items: "+_dependingItems);

				// by default visibility is hidden
				var dep = d3.select("#targetDependencies")
						.append("g")
						.attr("id","depID_"+d.id)
						.style("visibility","hidden");
				
				for (var j=0;j<_dependingItems.length;j++) {	
					var _d=_dependingItems[j];
					//lookup the concrete item 
					var _dependingItem = getItemByID(initiativeData,_d);
					// do not draw line to items out of KANBAN range 
					if (_dependingItem && new Date(_dependingItem.actualDate) >= KANBAN_START){
						var _depYOffset = getSublaneCenterOffset(getFQName(_dependingItem));
						//console.log("found depending item id: "+_dependingItem.id+ " "+_dependingItem.name);
						var _fromX = x(new Date(_dependingItem.actualDate))	
						var _depsublane = getSublaneByNameNEW(getFQName(_dependingItem));
						if (_depsublane){
							var _fromY = y(_depsublane.yt1-_depYOffset)+getInt(_dependingItem.sublaneOffset);
							// put lines in one layer to turn on off globally
							_drawLine(dep,_fromX,_fromY,_itemXTarget-_size-2,_itemY,"targetDependLine",[{"end":"arrow_blue"}]);
						}
					}
				} // end for loop
				//console.log ("check depending element: "+d3.select("#item_block_"+d.dependsOn).getBBox());
			} // end if dependcies
			
			// drag test	
			d3.select(this).data([ {"x":0, "y":0, "lane":d.lane} ]).call(drag_item);
		} // end if null check

	}) //end each()
} //end drawTargets


/** gets for an item all associated targets this items is contributing to
 */
function _getTargetsByItem(item){
	var _targets = new Array();
	for (var t in targetData){
		var _initiatives = targetData[t].initiatives;
		if (_initiatives){
			console.log("* initiatives of "+targetData[t].id+": "+_initiatives);
			var _items = _initiatives.split(",");
			for (var j in _items){
				console.log("  + checking "+_items[j]+ "=="+ item.id);
				if (_items[j]==item.id){
					_targets.push(targetData[t].id);
				} 
			}
		}
	}
	return _targets;
}

/** gets for an item all associated metrics this items is contributing to
 */
function _getMetricsByItem(item){
	var _metrics = new Array();
	for (var m in metricData){
		var _targets = metricData[m].targets;
		if (_targets){
			console.log("* targets of "+metricData[m].id+": "+_targets);
			var _items = _targets.split(",");
			for (var j in _items){
				if (_items[j]==item.id){
					_metrics.push(metricData[m].id);
				} 
			}
		}
	}
	return _metrics;
}


// ----------------------------------------------------------------------------------------------------------------
// ---------------------------------------------- ITEMS SECTION ---------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------

/** renders the items
*/
function drawItems(){
	
	d3.selectAll("#initiatives,#dependencies,#sizings").remove();
	
	var drag_item = _registerDragDrop();

	tooltip.attr("class","itemTooltip");
	
	svg.append("g").attr("id","dependencies");
	var gSizings = svg.append("g")
	.attr("id","sizings")
	.style("opacity","0");

	//initiatives groups
	var gItems = svg.append("g").attr("id","initiatives").append("g").attr("id","items");
	
	//labels
	var gLabels = gSizings.append("g")
		.attr("id","labels")
		.style("opacity",0);
	
	filteredInitiativeData = initiativeData.filter(function(d){
		var _filterStart=(new Date(d.planDate)>=KANBAN_START ||new Date(d.actualDate)>=KANBAN_START);
		var _filterEnd=new Date(d.planDate)<=KANBAN_END;
		//var _filterTargets = (d.Type !="target");
		var _filterOnKanban = (d.onKanban ==1);
		
		if (ITEMDATA_FILTER){
			return _filterStart && _filterEnd &&  _filterOnKanban && eval(_buildFilter(ITEMDATA_FILTER));
		}
		return _filterStart && _filterEnd;
	});
	
	var groups = gItems.selectAll("items")
	// filter data if ITEMDATA_FILTER is set
	.data(filteredInitiativeData)
	.enter()
	// **************** grouped item + svg block + label text
	.append("g")
	.attr("id",function(d){return "item_"+d.id})
	.each(function(d){
		var _size = d.size*ITEM_SCALE;
		if (!d.isCorporate) _size = _size * TACTIC_SCALE;
		var _itemXPlanned = x(new Date(d.planDate));
		var _itemXActual = x(new Date(d.actualDate));
		var _itemXStart = x(new Date(d.startDate));
		var _itemX;
		if (!d.actualDate) _itemX =_itemXPlanned; 
		else _itemX = _itemXActual
		
		if (d.state!="done" && new Date(d.actualDate)<=TODAY){
			_itemX = x(TODAY);
			//d.state="delayed";
			d.actualDate = yearFormat(TODAY);
		}
		var _yOffset = getSublaneCenterOffset(getFQName(d));
		var _sublane = getSublaneByNameNEW(getFQName(d));
		var _sublaneHeigth = _sublane.yt2-_sublane.yt1;
		var _itemY = y(_sublane.yt1-_yOffset)+getInt(d.sublaneOffset);
		// ------------  line if delayed  before plan--------------
		var _lineX1= _itemXPlanned;
		var _lineX2= _itemX-_size-(_size/2);
		// flags whether elements are beyond KANBAN_END, KANBAN_START (in case of timemachine or delays)
		var _endBeyond=false;
		var _startBeyond=false;
		var _endActualBeyond=false;
		var _startActualBeyond=false;
		
		if (new Date(d.planDate) < KANBAN_START){
			 _lineX1 = x(KANBAN_START)+3; 
			 _startBeyond=true;
		 }
		if (new Date(d.actualDate) < KANBAN_START){
			 _startBeyond=true;
		}
		
		if (new Date(d.actualDate) > KANBAN_END){
			 _lineX2 = x(KANBAN_END)-3;
			 _endActualBeyond=true;
		}
		if (new Date(d.actualDate) > KANBAN_END){
			 _startActualBeyond=true;
		}
		
		if (d.state !="killed"){
			if (d.actualDate>d.planDate) _drawItemDelayLine(d3.select(this),_lineX1,_lineX2,_itemY);
			// ------------  line if before plan--------------
			else if (d.actualDate<d.planDate) _drawItemDelayLine(d3.select(this),_itemX,(_itemXPlanned-_size-(_size/2)),_itemY);
			
			d3.select(this)
				.style("opacity",d.accuracy/10);
			
			// ------------  circles --------------
			if (d.Type !=="target"){
				// only draw circle if we are inside KANBAN_START/END 
				if (!_startActualBeyond && !_endBeyond){
					d3.select(this)
						.append("circle")
							.attr("id","item_circle_"+d.id)
							.attr("cx",_itemX)
							.attr("cy",_itemY)
							.attr("r",_size)
							.attr("class",function(d){
							if (d.actualDate>d.planDate &&d.state!="done") {return "delayed"} 
							else if (new Date(d.actualDate)>WIP_END) {return "future";} 
							else {return d.state}});
					// ----------- circle icons -------------
					// only append icon if we have declared on in external.svg
					if (document.getElementById("icon_"+d.theme+"."+d.lane+"."+d.sublane)){
						_drawXlink(d3.select(this),"#icon_"+d.theme+"."+d.lane+"."+d.sublane,(_itemX-(1.2*_size/2)),(_itemY-(1.2*_size/2)),{"scale":_size/10});
					}
				}
			} //end if d.Type!="target"
			
		}//end kill check
		
		// ------------  item blocks & names & postits --------------
		// if isCorporate flag is not set use "tactic" icon 
		if (new Date(d.planDate) >KANBAN_START){
			var _iconRef=d.Type;
			if (!d.isCorporate) {
				_iconRef = "tactic";
			}
			
			if (d.state=="killed") _iconRef+="_killed";
			if (!d.ExtId) _iconRef="item_notsynced";
			
			var _diff = new Date()-new Date(d.createDate);
			// 24 hours are NEW ...
			if ( Math.floor(_diff/(60*60*1000))< 24) _iconRef="item_new";
			
			_drawXlink(d3.select(this),"#"+_iconRef,(_itemXPlanned-(1.2*_size)),(_itemY-(1.2*_size)),{"scale":_size/10});
			
			_drawItemName(d3.select(this),d,_itemXPlanned,(_itemY)+ parseInt(_size)+(6+(_size/5)*ITEM_FONTSCALE));
			
			_drawPostit(d3.select(this),d);

		} // end KANBAN_START check
		// if plandate is beyon KANBAN_START - we have to draw the name below the circle (a bit smaller)
		else if (new Date(d.actualDate)>KANBAN_START){
			_drawItemName(d3.select(this),d,_itemXActual,(_itemY+_size+3),0.1);
		}
		// transparent circle on top for the event listener 
		if (d.state!="killed") _drawItemEventListenerCircle(d3.select(this),"event_circle_"+d.id,_itemX,_itemY,_size)
		// and always over the planned block
		_drawItemEventListenerCircle(d3.select(this),"event_planned_circle_"+d.id,_itemXPlanned,_itemY,_size)
		
		
		// ------------- labels for Swag view -------------
		_text = gLabels
		   .append("text")
		   .attr("id","label_"+d.id)
		   //.text(d.name)
		   .style("font-size",5+d.Swag/500+"px")
		   //.style("font-weight","bold")
		   .attr("text-anchor","middle")
		   .attr("x",_itemXPlanned)
		   .attr("y",_itemY);
		
		textarea(_text,d.name,_itemXPlanned,_itemY,ITEM_TEXT_SWAG_MAX_CHARS,(5+d.Swag/500));
		
		// ------------  dependencies --------------
		if (!isNaN(parseInt(d.dependsOn))){
			console.log("============================== "+d.id+" depends on: "+d.dependsOn); 
			
			var _dependingItems = d.dependsOn.split(",");
			console.log("depending items: "+_dependingItems);

			// by default visibility is hidden
			var dep = d3.select("#dependencies")
					.append("g")
					.attr("id","depID_"+d.id)
					.style("visibility","hidden");
			
			for (var j=0;j<_dependingItems.length;j++) {	
				var _d=_dependingItems[j];
				//lookup the concrete item 
				var _dependingItem = getItemByID(filteredInitiativeData,_d);
				if (_dependingItem){
					var _depYOffset = getSublaneCenterOffset(getFQName(_dependingItem));
					//console.log("found depending item id: "+_dependingItem.id+ " "+_dependingItem.name);
					var _toX = x(new Date(_dependingItem.planDate))	
					var _toY = y(getSublaneByNameNEW(getFQName(_dependingItem)).yt1-_depYOffset)+getInt(_dependingItem.sublaneOffset);
					
					// put lines in one layer to turn on off globally
					_drawLine(dep,_itemXPlanned,_itemY,_toX,_toY,"dependLine",[{"end":"arrow_grey"}]);
				}
			} // end for loop
			//console.log ("check depending element: "+d3.select("#item_block_"+d.dependsOn).getBBox());
		} // end if dependcies
		
		// ----------------- startDate indicator ---------------------
		if(d.startDate && new Date(d.startDate)>KANBAN_START){
			console.log("____startDate: "+d.startDate);
			_drawStartDateIndicator(dep,_itemXStart,_itemXPlanned,_itemY,_size);
		}
		// ----------------- sizings --------------------------------

		// sizingPD portfolio view
		if(d.Swag){
			d3.select("#sizings")
			.append("circle")
			.attr("cx", _itemXPlanned)
			.attr("cy", _itemY)
			.attr("r", d.Swag/100)
			.attr("class","sizings "+d.lane)
			.style("opacity",0.4);
		}
		// drag test	
		d3.select(this).data([ {"x":0, "y":0, "lane":d.lane} ]).call(drag_item);
	}) //end each()
} //end drawItems



function _drawItemEventListenerCircle(svg,id,x,y,r){
	svg.append("circle")
		.attr("id",id)
		.attr("cx",x)
		.attr("cy",y)
		.attr("r",r)
		.style("opacity",0)
		.on("mouseover", function(d){onTooltipOverHandler(d,tooltip);}) 
		.on("mousemove", function(d){onTooltipMoveHandler(tooltip);})
		.on("dblclick",	function(d){onTooltipDoubleClickHandler(tooltip,d3.select(this),d);})
		.on("mouseout", function(d){onTooltipOutHandler(d,tooltip);})
}


/** 
 * @svg d3 reference
 * @d data 
 */
function _drawPostit(svg,d){
	
	var gPostit= svg.append("g")
	.attr("id",function(d){return "postit_"+d.id})
	
	var _size = d.size*ITEM_SCALE;
	var _itemXPlanned = x(new Date(d.planDate));
	var _itemXActual = x(new Date(d.actualDate));
	var _itemXStart = x(new Date(d.startDate));
	var _yOffset = getSublaneCenterOffset(getFQName(d));
	//d.sublaneOffset = override for positioning of otherwise colliding elements => manual !
	var _itemY = y(getSublaneByNameNEW(getFQName(d)).yt1-_yOffset)+getInt(d.sublaneOffset);
	
	// ------------  postits --------------
	if(d.state=="todo")
	{
		var postit_x_offset = -2*_size+2;
		var postit_y_offset = -2*_size*POSTIT_SCALE;
		var postit_x =_itemXPlanned+postit_x_offset;
		var postit_y =_itemY+postit_y_offset;
		
		var _rmax=5,
			_rmin=-5;						;
		
		var _rotate = Math.floor(Math.random() * (_rmax - _rmin + 1) + _rmin);
		var _scale = (_size/8)*POSTIT_SCALE;
		
		_drawXlink(gPostit,"#postit_yellow",postit_x,postit_y,{"scale":_scale,"rotate":_rotate});
		
		_drawText(gPostit,"todo:",(postit_x+1),(postit_y+5),{"size":(3+_size/6)+"px","color":"red","weight":"bold","anchor":"start","rotate":_rotate,"scale":POSTIT_SCALE})
			.append("tspan")
			.attr("dy",5)
			.attr("x",0)
			.text("id:"+d.id);
	}
}


/**
 * helper methode
 */
function _drawItemName(svg,d,x,y,scale,color){
	// ------------  item names --------------
	if (!scale) scale=1;
	var size = d.size*ITEM_SCALE*scale;
	var _textWeight="bold";
	var _textStyle="normal";
	var _textSize = 5+(size/5)*ITEM_FONTSCALE;
	if (!d.isCorporate && !d.Type=="target") {
		_textWeight = "normal";
		_textStyle="italic";
		_textSize =_textSize * TACTIC_SCALE;
	}
	var _textDecoration="";
	//if (d.ExtId!="") _textDecoration="underline";

	var _text =svg.append("text")
	   .style("font-size",_textSize+"px")
	   .style("text-anchor","middle")
	   // !!!!! BOLD and anchor=MIDDLE is not correctly renderered by batik !!!!!
	   //.style("font-weight",_textWeight)
	   .style("font-style",_textStyle)
	   .style("text-decoration",_textDecoration)
	   .style("kerning",-0.25)
	   //.style("letter-spacing",-.2)
	   //google font
	   .style("font-family","arial, sans-serif")
	   .style("fill",function(d){
								if ((d.actualDate>d.planDate && d.state!="done" &&d.state!="killed")) return "red"; 
								else if (d.state=="done") return "green";
								else if (d.state=="todo" || d.state=="killed") return "#aaaaaa"; 
								else if (d.Type=="target") return COLOR_TARGET; 
								return"black";})
	   .attr("x",x)
	   .attr("y",y)
	   //.text(d.name);
		textarea(_text,d.name,x,y,ITEM_TEXT_MAX_CHARS,_textSize-1);
}


/**
 */
function _drawItemDelayLine(svg,x1,x2,y){
	svg
	.append("line")
	.attr("x1", x1)
	.attr("y1", y)
	.attr("x2", x2)
	.attr("y2", y)
	.attr("class", function(d){
		if (d.actualDate>d.planDate &&d.state!="done") {return "delayLine"} 
		else {return "delayLineDone"}})

	.attr("marker-end", function(d){
		if (d.actualDate>d.planDate &&d.state!="done") {return "url(#arrow_red)"} 
		else {return "url(#arrow_green)"}});
}

/**
 */
function _drawStartDateIndicator(svg,x1,x2,y,size){
	svg.append("rect")
	.attr("x", x1)
	.attr("y", y-size)
	.attr("width", (x2-x1)-size)
	.attr("height", size*2)
	.style("fill","url(#gradientWhite)")
	.style("opacity",0.6);
	
	svg.append("circle")
	.attr("cx", x1)
	.attr("cy", y)
	.attr("r", size)
	.style("stroke-width","0px")
	.style("stroke","black")
	.style("fill","#ffffff")
	.style("opacity",1);

	svg.append("path").
	attr("transform","translate("+(x1+1)+","+y+") rotate(90)")
	.attr("d",d3.svg.symbol().type("triangle-up"))
	.style("fill","black");
}

/**
 * handler for tooltip mouse over 
 * called within item rendering
 * => is currently doing stuff for items AND targets !!!
 * quite crappy.....
 */
function onTooltipOverHandler(d,tooltip){
	// and fadeout rest
	
	var highlight ="#item_";
	if (d.Type=="target") highlight="#target_";
	
	//bugfix 
	var _tooltipCSS = d.Type+"Tooltip";
	if (d.Type=="innovation") _tooltipCSS= "itemTooltip";
	
	tooltip.attr("class",_tooltipCSS);
	
	d3.select("#item_circle_"+d.id)
	.transition().delay(0).duration(500)
	.attr("r", d.size*ITEM_SCALE*2);
	//.style("cursor","pointer");

	// and the transparent event circle
	d3.select("#event_circle_"+d.id)
	.transition().delay(0).duration(500)
	.attr("r", d.size*ITEM_SCALE*2)
	.style("cursor","pointer");

	d3.select("#vision").transition().delay(0).duration(500).style("opacity",0.1);
	
	d3.selectAll("#items,#targets").selectAll("g")
		.transition()            
		.delay(0)            
		.duration(500)
		.style("opacity",0.1);
		
	// dim metrics
	d3.select("#metrics").selectAll("[id*=metric_]").transition().delay(0).duration(500).style("opacity",0.1)	
	// and highlight depending metrics
	//test hardcoded
	
	
	if (d.Type=="target"){
		// get metrics to be highlighted
		for (var m in metricData){
			//comma delimited string shit
			var _targets = metricData[m].targets;
			if (_targets){
				 var _targetsArray= _targets.split(",");
				 if (_targetsArray.indexOf(d.id) >-1) d3.selectAll("[id*=metric_"+metricData[m].id+"]").transition().delay(100).duration(500).style("opacity",1);
			}
		}
	}
	
	//d3.selectAll("[id*=metric_251]").transition().delay(100).duration(500).style("opacity",1);
	//d3.selectAll("[id*=metric_253]").transition().delay(100).duration(500).style("opacity",1);
	
	//highlight the selected mouseover element
	
	
	d3.select(highlight+d.id)
		.transition()            
		.delay(100)            
		.duration(500)
	.style("opacity",1);
		
	console.log("highlight"+highlight+d.id);
		
	//render HTML based on Type	
	if (d.Type=="target")
		tooltip.html(_targetTooltipHTML(d));
	else
		tooltip.html(_itemTooltipHTML(d));
	
	tooltip.style("visibility", "visible");
	tooltip.style("top", (d3.event.pageY-40)+"px").style("left",(d3.event.pageX+25)+"px");

	
	// uuuuuaaaah - that caused me 1 hour to find 
	// this tooltip shit handler is still handling for 2 different types (items AND targets)
	// need to differentiate type here ....
		if (d.Type=="target"){
		d3.select("#depID_"+d.id)
			.transition()            
			.delay(200)            
			.duration(500)
			.style("visibility","visible")
			.style("opacity",1);
	}	
	
	
	var _dependingItems;
	if (d.dependsOn){
		// highlight also depending items
		_dependingItems = d.dependsOn.split(",");
	}
	// in case of targets
	if (d.initiatives){
		// highlight also depending items
		_dependingItems = d.initiatives.split(",");
	}
	
	var _targets=_getTargetsByItem(d);

	

	
	if (_dependingItems) _highlightItems(_dependingItems,filteredInitiativeData,"#item_");
	
	if (_targets){
		_highlightItems(_targets,targetData,"#target_");
		// and connect 
		//[TODO]
		// draw line from d.id to each in _targets.id
	}
}


function _highlightItems(items,data,type){
		for (var j=0;j<items.length;j++) {	
			var _di = items[j];
			
			var _item = getItemByID(data,_di);
			
			if (_item){
				var dep=d3.select(type+_di)
					.transition()            
					.delay(200)            
					.duration(500)
					.style("opacity",1);
			}
		}// end check depending items
}


/** returns HTML for item tooltip content
 */
function _itemTooltipHTML(d){
	//[TODO] fix the indicator dynmic color bar  and overall table mess here ;-)	
	var _indicator;
	if (d.actualDate>d.planDate &&d.state!="done") _indicator="red";
	else if (d.state=="done") _indicator ="green";
	else if (d.state=="planned") _indicator ="gold";
	
	var _health;
	if (d.health=="green") _health="green";
	else if (d.health=="amber") _health ="gold";
	else if (d.health=="red") _health ="red";
	
	var _v1Link = "http://v1.bwinparty.corp/V1-Production/Epic.mvc/Summary?oidToken=Epic%3A";
	
	
	var _htmlBase ="<table><col width=\"30\"/><col width=\"85\"/><tr><td style=\"font-size:4px;text-align:left\">[id: "+d.id+"]</td><td style=\"font-size:4px;text-align:right\">";
	if (d.ExtId)
		_htmlBase+=" <a href=\""+_v1Link+d.ExtId+"\" target=\"new\">[v1: "+d.ExtId+"]</a>";
	_htmlBase+="</td></tr>";
	_htmlBase+="<tr class=\"header\" style=\"height:4px\"/><td colspan=\"2\"><div class=\"indicator\" style=\"background-color:"+_indicator+"\">&nbsp;</div><b style=\"padding-left:4px;font-size:7px\">"+d.name +"</b></td></tr>"+(d.name2 ? "<tr><td class=\"tiny\">title2:</td><td  style=\"font-weight:bold\">"+d.name2+"</td></tr>" :"");
	_htmlBase+="<tr><td class=\"tiny\"style=\"width:20%\">lane:</td><td><b>"+d.lane+"."+d.sublane+"</b></td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">owner:</td><td><b>"+d.productOwner+"</b></td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">Swag:</td><td><b>"+d.Swag+" PD</b></td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">started:</td><td><b>"+d.startDate+"</b></td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">planned:</td><td><b>"+d.planDate+"</b></td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">state:</td><td class=\"bold\">"+d.state+"</td></tr>";

	if (d.actualDate>d.planDate &&d.state!="done"){ 
		_htmlBase=_htmlBase+"<tr><td class=\"tiny\">delayed:</td><td><b>"+diffDays(d.planDate,d.actualDate)+" days</b></td></tr>";
	}
	else if (d.actualDate>d.planDate &&d.state=="done"){
		_htmlBase=_htmlBase+ "<tr><td class=\"tiny\">done:</td><td><b>"+d.actualDate+"</b> </td></tr><tr><td class=\"small\">delay: </td><td><b>"+diffDays(d.planDate,d.actualDate)+" days</b></td></tr>";
	}
	else if (d.state=="done"){
		_htmlBase=_htmlBase+"<tr><td class=\"tiny\">done:</td><td><b>"+d.actualDate+"</b> </td></tr>";
	}
	else if (d.state=="todo"){
		_htmlBase=_htmlBase+"<tr><td class=\"tiny\">DoR:</td><td class=\"small\" style=\"text-align:left\">"+d.DoR+"</td></tr>";
		
	}
	if (d.health!=""){
		_htmlBase=_htmlBase+"<tr><td class=\"tiny\">health:</td><td><div class=\"health\" style=\"background-color:"+_health+"\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></td></tr>";
	}
	if (d.healthComment!=""){
		_htmlBase=_htmlBase+"<tr><td class=\"tiny\">comment:</td><td class=\"small\" style=\"text-align:left\">"+d.healthComment+" </td></tr>";
	}
	if (d.programLead!=""){
		_htmlBase=_htmlBase+"<tr><td class=\"tiny\">lead:</td><td><b>"+d.programLead+"</b> </td></tr>";
	}
	_htmlBase=_htmlBase+"<tr><td class=\"tiny\">DoD:</td><td class=\"small\" style=\"text-align:left\">"+d.DoD+"</td></tr>";
	_htmlBase = _htmlBase+"<tr> <td colspan=\"2\"  style=\"text-align:right\"><a id=\"flip\" class=\"small\" style=\"text-align:right\" >[flip it]</a></td></table>";

	return _htmlBase;
	
}

/** returns HTML for item tooltip content
 */
function _targetTooltipHTML(d){
	var _htmlBase ="<table><col width=\"35\"/><col width=\"160\"/><tr><td style=\"font-size:5px;text-align:left\">[id: "+d.id+"]</td><td style=\"font-size:5px;text-align:right\"></td></tr><tr class=\"header\" style=\"height:4px\"/><td colspan=\"2\"><b style=\"padding-left:4px;font-size:7px;color:"+COLOR_TARGET+"\">"+d.name +"</b></td></tr>"+(d.name2 ? "<tr><td class=\"small\">title2:</td><td  style=\"font-weight:bold\">"+d.name2+"</td></tr>" :"")+"<tr><td class=\"tiny\">owner:</td><td><b>"+d.targetOwner+"</b></td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">target date:</td><td><b>"+d.targetDate+"</b> </td></tr>";
	
	_htmlBase+="<tr><td class=\"tiny\">syndicate:</td><td class=\"small\" style=\"text-align:left\">"+wiki2html.parse(d.syndicate)+"</td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">scope:</td><td class=\"small\" style=\"text-align:left\">"+wiki2html.parse(d.scope)+"</b> </td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">non-scope:</td><td class=\"small\" style=\"text-align:left\">"+wiki2html.parse(d.nonScope)+"</b> </td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">risk:</td><td class=\"small\" style=\"text-align:left\">"+wiki2html.parse(d.risk)+"</b> </td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">metrics:</td><td class=\"small\" style=\"text-align:left\">"+wiki2html.parse(d.metrics)+"</b> </td></tr>";
	_htmlBase+="<tr><td class=\"tiny\">prio:</td><td><b>"+d.ranking+"</b> </td></tr>";
	
	_htmlBase = _htmlBase+"<tr> <td colspan=\"2\"  style=\"text-align:right\"><a id=\"flip\" class=\"small\" style=\"text-align:right\" >[flip it]</a></td></table>";

	return _htmlBase;
}


/**
 * handler for tooltip mouse move 
 * called within item rendering
 */
function onTooltipMoveHandler(tooltip){
	return tooltip.style("top", (d3.event.pageY-40)+"px").style("left",(d3.event.pageX+25)+"px");
}

/**
 * handler for tooltip doubleclick handling 
 */
function onTooltipDoubleClickHandler(tooltip,svg,d){
	console.log("doubleclick: "+d3.select(this)+" svg: "+svg);
	if (!ITEM_ISOLATION_MODE){
		d3.selectAll("#items,#targets").selectAll("g").selectAll("circle").on("mousemove",null);
		d3.selectAll("#items,#targets").selectAll("g").selectAll("circle").on("mouseout",null);
		d3.selectAll("#items,#targets").selectAll("g").selectAll("circle").on("mouseover",null);
	
		d3.selectAll("#metrics,#queues,#lanes,#version,#axes").style("opacity", .5);
		
		ITEM_ISOLATION_MODE=true;
		console.log("...in ITEM_ISOLATION mode...");
		var _x = get_metrics(svg.node()).x-margin.left;
		var _y = get_metrics(svg.node()).y-margin.top;
		console.log("...x: "+_x+"  y: "+_y);
		
		d3.select("#item_"+d.id).append("text").attr("id","isolationtext").text("ISOLATION MODE").style("font-size","6px").style("fill","grey").attr("x",_x).attr("y",_y).style("text-anchor","middle");;

		d3.select("#flip").on("click", function(){
				var front = document.getElementById('tooltip');
				
				// -- experiment with diff_trail from initiatives
				var _diff_trail;
				$.when($.getJSON(dataSourceFor("initiatives_diff_trail")+"/"+d._id)
					.done(function(initiatives_diff_trail){
						
						_diff_trail=initiatives_diff_trail;
						//else throw new Exception("error loading diff_trail")
						
						
						var back_content="change trail:";
						var _diff="";
						for (var d in _diff_trail){
							//_diff+="<div style=\"font-size:6px\">"+JSON.stringify(_diff_trail[d].diff)+"</div>";
							// do not look at _id and changeDate
							for (var c in _diff_trail[d].diff){
								if (c!="_id" &&c!="changeDate"&&c!="createDate")
									_diff+="<div style=\"font-size:6px\">"+_diff_trail[d].timestamp+"<br><b>* "+c+": "+JSON.stringify(_diff_trail[d].diff[c])+"</b></div>";
							}
						}
						
						back_content += _diff+"<br><a id=\"flip_close\" class=\"small\" style=\"text-align:left\" >[flip back]</a>"; // Generate or pull any HTML you want for the back.
						console.log("...flip...");
						// when the correct action happens, call flip!
						back = flippant.flip(front, back_content);
						
						d3.select("#flip_close").on("click", function(){
							back.close();
						});
								
						
						
					}));

				// -- experiment with diff_trail from initiatives
				
				
				
			});
	}
	else {
		if (back) back.close();
		
		d3.selectAll("#items,#targets").selectAll("g").selectAll("circle").on("mousemove", function(d){onTooltipMoveHandler(tooltip);})
		d3.selectAll("#items,#targets").selectAll("g").selectAll("circle").on("mouseout", function(d){onTooltipOutHandler(d,tooltip);})
		d3.selectAll("#items,#targets").selectAll("g").selectAll("circle").on("mouseover", function(d){onTooltipOverHandler(d,tooltip);})
		
		console.log("...EXIT ITEM_ISOLATION mode...");
		ITEM_ISOLATION_MODE=false;	
		d3.selectAll("#metrics,#queues,#lanes,#version,#axes").style("opacity",1);
		d3.select("#isolationtext").remove();
	}
}


/**
 * handler for tooltip mouse out 
 * called within item rendering
 */
function onTooltipOutHandler(d,tooltip){
	tooltip.style("visibility", "hidden");
	
	var highlight ="#item_";
	if (d.Type=="target") highlight="#target_";
	
	d3.select("#item_circle_"+d.id)
		.transition().delay(0).duration(500)
		.attr("r", d.size*ITEM_SCALE);
			//.transition().delay(0).duration(500)

	d3.select("#event_circle_"+d.id)
		.transition().delay(0).duration(500)
		.attr("r", d.size*ITEM_SCALE);
			//.transition().delay(0).duration(500)
					
	d3.select("#vision").transition().delay(0).duration(500).style("opacity",1);

	
	// show metrics
	d3.select("#metrics").selectAll("[id*=metric_]").transition().delay(0).duration(500).style("opacity",1)	
	
		
	d3.select("#depID_"+d.id)
		.transition()            
		.delay(200)            
		.duration(500)
		.style("visibility","hidden");

	//set all back to full visibility /accuracy
	d3.selectAll("#items,#targets").selectAll("g")
		.transition()            
		.delay(100)            
		.duration(500)
		//.style("opacity",d.accuracy/10);
		.style("opacity",1);

	d3.select(highlight+d.id)
		.transition()
		.delay(0)
		.duration(100)
		.style("opacity",d.accuracy/10);

	if (d.dependsOn){
		// de.highlight also depending items
		var _dependingItems = d.dependsOn.split(",");

		for (var j=0;j<_dependingItems.length;j++) {	
			var _di = _dependingItems[j];
			
			var _item = getItemByID(filteredInitiativeData,_di);
		
			if (_item){
			
			var dep=d3.select("#item_"+_di)
			dep.selectAll("circle")
				.transition()            
				.delay(0)            
				.duration(500)
				.attr("r", _item.size*ITEM_SCALE);
			}
		} // end de- check depending items
	}
}




/** ola - my first class in javascript ;-)
 */
function Postit(id,text,x,y,scale,size,color,textcolor){
	if (!id) this.id=new Date().getTime();
	else this.id=id;
	this.text=text;
	if (!color) this.color="yellow";
	else this.color=color;
	if (!textcolor)	this.textcolor="black";
	else this.textcolor=textcolor;
	if (!scale)	this.scale=1;
	else this.scale=scale;	
	if (!size) this.size=4;
	else this.size=size;	
	this.x=x;
	this.y=y;
	

	
	console.log("constructor: "+this.getInfo());
}

Postit.prototype.getInfo=function(){
	return JSON.stringify(this);
}

Postit.prototype.setTitle=function(title){
	this.title=title;
}


Postit.prototype.save=function(){
	var _insert = JSON.stringify(this);
	console.log("save: "+_insert);

	$.ajax({
        type: "POST",
        url: "/data/insert.php",
        data: _insert,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data){consoloe.log(data);},
        failure: function(errMsg) {
            consoloe.log(errMsg);
        }
  });
}

Postit.prototype.remove=function(){
	var _remove = JSON.stringify(this);
	console.log("delete: "+_remove);

	$.ajax({
        type: "POST",
        url: "/data/remove.php",
        data: _remove,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data){console.log(data);},
        failure: function(errMsg) {
            console.log(errMsg);
        }
  });
}

Postit.prototype.update=function(){
	var _update = JSON.stringify(this);
	console.log("call update: "+_update);

	$.ajax({
        type: "POST",
        url: "/data/update.php",
        data: _update,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data){console.log(data);},
        failure: function(errMsg) {
            console.log(errMsg);
        }
  });
}



Postit.prototype.draw=function(svg){
	var p=this;
	
	var movedX,movedY;
	
	console.log("in draw(): "+this.getInfo());
	//postits drag and drop
	var drag_postit = d3.behavior.drag()
		.on("dragstart", function(d,i) {
		   d3.select(this).style("opacity",0.6);
			movedX=0;
			movedY=0;
			
			console.log("dragstart= d.x: "+d.x+" - d.y: "+d.y+ " p.x: "+p.x+" p.y: "+p.y);
			d3.select(this).attr("transform", function(d,i){
				return "translate(" + [ d.x,d.y ] + ")"
			})
			
		})	

		.on("drag", function(d,i) {
			
			d.x += d3.event.dx
			d.y += d3.event.dy
			
			movedX += d3.event.dx
			movedY += d3.event.dy
			
			console.log("drag= d.x:"+d.x+" - d.y:"+d.y+" p.x: "+p.x+" p.y: "+p.y+ "--- movedX: "+movedX+" movedY: "+movedY);
			
			d3.select(this).attr("transform", function(d,i){
				return "translate(" + [ d.x,d.y ] + ")"
			})
		})	
		.on("dragend",function(d,i){
			//postit update position
			if (movedX>0 || movedY>0){
				p.x=getInt(movedX)+getInt(p.x);
				p.y=getInt(movedY)+getInt(p.y);
			p.update();
			}
			console.log("dragend event: x="+d.x+", y="+d.y+" p.x: "+p.x+" p.y: "+p.y);
			d3.select(this).style("opacity",1);
		
		});
	
	
	var postit=svg.append("g")
		.attr("id","postit_"+this.id)
		.data([ {"x":0, "y":0} ])
		.call(drag_postit);

	var _rmax=3,
		_rmin=-3;						;

	var _rotate = Math.floor(Math.random() * (_rmax - _rmin + 1) + _rmin);
	
	var _split = this.text.split("/");

	_drawXlink(postit,"#postit_"+this.color,this.x,this.y,{"scale":this.scale,"rotate":_rotate,"cursor":"pointer"});

		
	var _x = (getInt(this.x)+Math.sqrt(this.scale)+1);
	var _y = (getInt(this.y)+Math.sqrt(this.scale)-1);
	
	if (this.title){
		postit.append("text")
		.text(this.title)
		.style("text-anchor","start")
		.style("font-size",this.size+"px")
		.style("font-family","courier")
		.style("font-weight","bold")
		.style("cursor","pointer")		
		.style("letter-spacing","-0.1")
		.style("kerning","-0.1")
		
		.style("text-anchor","start")
		.style("fill",this.textcolor)
			.attr("transform","translate("+_x+","+(_y+(4*this.size))+") scale("+this.scale+") rotate("+_rotate+")");
		_y+=4*this.size;
	}
	
	
	var _size = this.size-0.5;
	var t =postit.append("text")
	.style("text-anchor","start")
		.style("font-size",(_size)+"px")
		.style("font-family","courier")
		.style("font-weight","normal")
		.style("cursor","pointer")		
		.style("letter-spacing","-0.1")
		.style("kerning","-0.1")
		
		.style("text-anchor","start")
		.style("fill",this.textcolor)
			.attr("transform","translate("+_x+","+_y+") scale("+this.scale+") rotate("+_rotate+")");
	
	textarea(t,this.text,1,4,16,_size);
	
	postit.append("path")
	.attr("transform","translate("+((22*this.scale)+getInt(this.x))+","+(getInt(this.y)+(2*this.scale))+") rotate("+(45+_rotate)+") scale("+(0.25*this.scale)+")")
	.attr("d",d3.svg.symbol().type("cross"))
	.style("fill","grey")
	.on("click",function(d){postit.remove();p.remove()});	
}

function loadPostits(){
	//d3.json("data/data.php?type=postits",handlePostits);
}



