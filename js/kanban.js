/**
 * @version: 0.1
 * @author: Gerold Kathan (www.kathan.at)
 * @date: 2013-12-20
 * @copyright: 
 * @license: 
 * @website: 
 */


/**
	 -------------------- HOWTO HIDE elements of a lane ----------------------------
	
	 d3.select("#items").selectAll("g").filter(function(d){return d.lane=="bwin"}).style("visibility","hidden")
	
	 d3.select("#items").selectAll("g").filter(function(d){return ((d.sublane=="touch")&&(d.lane=="bwin"))}).style("visibility","visible")
	
	 d3.select("#items").selectAll("g").filter(function(d){return ((d.theme=="topline"))}).style("visibility","hidden")
	 d3.select("#items").selectAll("g").filter(function(d){return ((true))}).style("visibility","hidden")
	
	 -------------------- HOWTO HIDE elements of a column ----------------------------
	
	 d3.select("#items").selectAll("g").filter(function(d){return (new Date(d.planDate)>WIP_END)}).style("visibility","hidden")


	--------------------- HOWTO runtime change e.g. lanedistribution --------------------
	
	1) remove groups
		d3.select("#axes").remove()
		d3.select("#lanes").remove()
		d3.select("#queues").remove()
		d3.select("#items").remove()
		
	2) change data - e.g. reset lanePercentagesOverride
		lanePercentagesOverride=null
	
	3) re-create lane distribution
		createLaneDistribution();

	4) re-draw stuff (ordered)
		drawAxes();
		drawLanes();
		drawQueues();
		drawItems();
	
	
	OR EVEN COOLER
	1) change data e.g. WIP_WINDOW
	2) drawAll()
	
*/

// global variables
var CONTEXT="CONTEXT";

var initiativeData;
var metricData;
var releaseData;

var itemData;

var pieData =[{"type":"sustainable","percentage":63.5},{"type":"notsustainable","percentage":26.5}];


var laneMap;

// percentage distribution = [16,16,8,8,12,14,12,14]
// checksum must be 100 
// this is just an override - if not specified we will calculate even distribution over given number of lanes
//var lanePercentages=[["bwin",18],["pp",14],["foxy",8],["premium",8],["games",12],["techdebt",14],["agile",12],["shared",14]];
var lanePercentagesOverride;


//the concrete domain for Y scale (100-0)
var laneDistribution;


var WIDTH =1200;
var HEIGHT = 1200;

var margin = {top: 200, right: 100, bottom: 50, left: 300};
var width,height;


//time stuff

var yearFormat = d3.time.format("%Y-%m-%d");

var TODAY = new Date();
var TIMEMACHINE;


var WIP_WINDOW_DAYS =90;
var WIP_OFFSET_DAYS =0;
var WIP_START;
var WIP_END;

setWIP();

var KANBAN_START = new Date("2013-09-01");
var KANBAN_END = new Date("2015-01-31");

var METRIC_BASLINE = new Date("2013-12-31");
var METRIC_PROJECTION = new Date("2015-12-31");

// queue metrics
var ITEMS_DONE,ITEMS_WIP,ITEMS_FUTURE,ITEMS_TOTAL,ITEMS_DELAYED,DAYS_DELAYED;
	
var SIZING_DONE,SIZING_WIP,SIZING_FUTURE,SIZING_TOTAL;


var LANE_LABELBOX_WIDTH =100;
	

var x,y,svg,drag,drag_x;

var dataversions={};

var COLOR_BPTY="#174D75";
// size of white space around boxes
var WIDTH_WHITESTROKE ="5px";

/** main etry point
 * 
 */
function render(itemFile,metricFile,releaseFile,svgFile){
	
	dataversions.itemFile=itemFile;
	dataversions.metricFile=metricFile;
	dataversions.releaseFile=releaseFile;
	dataversions.svgFile=svgFile;


	d3.xml("data/"+svgFile, function(xml) {
		
		document.body.appendChild(document.importNode(xml.documentElement, true));

		d3.tsv("data/"+itemFile,handleInitiatives);
		//d3.json("data/initiatives_mysql.json",handleInitiatives);
		// working PHP json export 
		
		//d3.json("data/data.php?type=initiatives",handleInitiatives);
		
		if ("data/"+metricFile)	d3.tsv("data/"+metricFile,handleMetrics);
		
		d3.tsv("data/"+releaseFile,handleReleases);
		
		
	}); // end xml load anonymous 


	
}

/**
 * change TODAY date and see what happens
 * pass date in format "yyyy-mm-dd" or "today" to reset to today
 * */
function timeMachine(date){
	
	if (date!="today") TIMEMACHINE = new Date(date);
	else {
		TIMEMACHINE = null;
		// and reload();
		d3.tsv("data/"+dataversions.itemFile,handleInitiatives);
		
	}
	
	
	setTODAY();
	setWIP();
	drawAll();
}

/** whenever we use the TODAY.add() function we need to set back TODAY to original value...
 * */
function setWIP(){
WIP_START = TODAY.add(WIP_OFFSET_DAYS).days();
setTODAY();
WIP_END = TODAY.add(WIP_WINDOW_DAYS+WIP_OFFSET_DAYS).days();
setTODAY();
}

function setTODAY(){
	if (TIMEMACHINE) TODAY = new Date(TIMEMACHINE);
	else TODAY = new Date();
}


/** main entry from data load
*
*/
function handleInitiatives(data) {
	"use strict";
	initiativeData=data;
	drawInitiatives();
	drawVersion();
}

/**

*/
function drawInitiatives(){

	init();
	initHandlers();
	
	createLaneHierarchy();

	createLaneDistribution();

	

	drawAxes();
	drawLanes();
	drawQueues();
	drawItems();
	drawPostits();

	
}


/**
*
*/
function init(){
	d3.select("#kanban").remove()
		
	width = WIDTH - margin.left - margin.right,
	height = HEIGHT - margin.top - margin.bottom;

	y = d3.scale.linear()
		.domain([0, 100])
		.range([height, 0]);

	x = d3.time.scale()
		.domain([KANBAN_START, KANBAN_END])
		.range([0, width]);


	/*
	//hack to align the year left from year ticks
	x_legend = d3.time.scale()
		.domain([(new Date(KANBAN_START)).add(-6).days(),(new Date(KANBAN_END)).add(-6).days()])
		.range([0, width]);
	*/

	svg = d3.select("svg")
		.attr("width", width + margin.left + margin.right+300)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("id","kanban")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	drag = d3.behavior.drag()
			.on("drag", function(d,i) {
				d.x += d3.event.dx
				d.y += d3.event.dy
				d3.select(this).attr("transform", function(d,i){
					return "translate(" + [ d.x,d.y ] + ")"
				})
			});

	drag_x = d3.behavior.drag()
			.on("drag", function(d,i) {
				d.x += d3.event.dx
				//d.y += d3.event.dy
				d3.select(this).attr("transform", function(d,i){
					return "translate(" + [ d.x,d.y ] + ")"
				})
			});
}

/** draws grid
*
*/
function drawAxes(){	

	d3.select("#axes").remove()
	
	var customTimeFormat = timeFormat([
	  [d3.time.format("%Y"), function() { return true; }],
	  [d3.time.format("%b"), function(d) { return d.getMonth(); }],
	  [d3.time.format("%b %d"), function(d) { return d.getDate() != 1; }],
	  [d3.time.format("%a %d"), function(d) { return d.getDay() && d.getDate() != 1; }],
	  [d3.time.format("%I %p"), function(d) { return d.getHours(); }],
	  [d3.time.format("%I:%M"), function(d) { return d.getMinutes(); }],
	  [d3.time.format(":%S"), function(d) { return d.getSeconds(); }],
	  [d3.time.format(".%L"), function(d) { return d.getMilliseconds(); }]
	 ]);
		
	var formatNumber = d3.format(".1f");

	var xAxis = d3.svg.axis()
		.scale(x)
		.ticks(d3.time.month)
		.tickSize(2, 0)
		.tickPadding(2)
		.tickFormat(d3.time.format("%b"))
		.orient("bottom");

	var xAxisTop = d3.svg.axis()
		.scale(x)
		.ticks(d3.time.month)
		.tickSize(2, 0)
		.tickPadding(2)
		.tickFormat(d3.time.format("%b"))
		.orient("top");
	
	var xAxisYearTop = d3.svg.axis()
		.scale(x)
		.ticks(d3.time.year)
		.tickSize(0,0)
		.tickFormat(d3.time.format("%Y"))
		.tickPadding(11)
		.orient("top");
	
	var xAxisYear = d3.svg.axis()
		.scale(x)
		.ticks(d3.time.year)
		.tickSize(0,0)
		.tickFormat(d3.time.format("%Y"))
		.tickPadding(11)
		.orient("bottom");
	
	//ticksize(width) for lane separators 
	var yAxis = d3.svg.axis()
		.scale(y)
		.tickSize(2)
		.tickFormat("")
		.tickValues(laneDistribution)
		.orient("right");

//################# AXES SECTION #####################

	var gAxes =svg.append("g")
		.attr("id","axes");

	var gy = gAxes.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.call(customAxis);

	var gx = gAxes.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.style("font-size","8px")
		.call(xAxis);

	var gxTop = gAxes.append("g")
		.attr("class", "x axis")
		.style("font-size","8px")
		.call(xAxisTop);
	
	var gxYearTop = gAxes.append("g")
		.attr("class", "x axis year")
		.style("font-weight","bold")
		.style("font-size","10px")
		.style("margin-bottom","40px")
		.call(xAxisYearTop);
	
	var gxYear = gAxes.append("g")
		.attr("class", "x axis year")
		.attr("transform", "translate(0," + height + ")")
		.style("font-weight","bold")
		.style("font-size","10px")
		.style("margin-bottom","-40px")
		.call(xAxisYear);
	
	// axis end


gAxes.append("line")
		.attr("x1", 0-LANE_LABELBOX_WIDTH)
		.attr("y1", -20)
		.attr("x2", x(KANBAN_END)+LANE_LABELBOX_WIDTH)
		.attr("y2", -20)
		.attr("class","gridTop");

gAxes.append("line")
		.attr("x1", 0-LANE_LABELBOX_WIDTH)
		.attr("y1", height+20)
		.attr("x2", x(KANBAN_END)+LANE_LABELBOX_WIDTH)
		.attr("y2", height+20)
		.attr("class","gridTop");


//################# AND SOME TIME GUIDES

//from KANBAN_START to KANBAN_END
// monthly guides thin
// yearly guides bigger

	var _monthGuides = d3.time.month.range(KANBAN_START,KANBAN_END,1);
	var _yearGuides = d3.time.month.range(KANBAN_START,KANBAN_END,12);

	for (i=0;i<_monthGuides.length;i++){
		gAxes.append("line")
			.attr("x1", x(new Date(_monthGuides[i])))
			.attr("y1", -0)
			.attr("x2", x(new Date(_monthGuides[i])))
			.attr("y2", height)
			.attr("class", "monthGuide");
	}

	for (i=0;i<_yearGuides.length;i++){
		gAxes.append("line")
			.attr("x1", x(new Date(_yearGuides[i])))
			.attr("y1", -0)
			.attr("x2", x(new Date(_yearGuides[i])))
			.attr("y2", height)
			.attr("class", "yearGuide");
	}
}

/**
* ################# LANE_LABELS SECTION #####################
*/
function drawLanes(){
	 
	d3.select("#lanes").remove()

    var lanes = svg.append("g").attr("id","lanes");
	
	//------------ context box ----------------
	_drawLaneContext(lanes,CONTEXT,-LANE_LABELBOX_WIDTH-200,0,LANE_LABELBOX_WIDTH/6,height,"treemap.html")

	var i=0;

	lanes.selectAll("#lane")
	.data(getLanes())
	.enter()
	// **************** grouped item + svg block + label text
	.append("g")
	.attr("id",function(d){return "lane_"+d;})
	//.style("opacity",function(d){return d.accuracy/10})
	//.on("mouseover",animateScaleUp)
	.each(function(d){
		var _lane = d;
		var _y = y(laneDistribution[i]);
		var _height = y(100-(laneDistribution[i]-laneDistribution[i+1]));
		var _x_offset = 5;
		var _y_offset = 4;
		var _laneOpacity;

		//left box
		_drawLaneBox(d3.select(this),-LANE_LABELBOX_WIDTH,_y,LANE_LABELBOX_WIDTH,_height,_lane);

		// lane
		if (i%2 ==0) _laneOpacity=0.22;
		else _laneOpacity=0.12;

		d3.select(this)
		.append("rect")
		.attr("x",x(KANBAN_START))
		.attr("y",_y)
		.attr("width",x(KANBAN_END))
		.attr("height",_height)
		.style("fill","url(#gradientGrey)")
		.style("stroke","white")
		.style("stroke-width",WIDTH_WHITESTROKE)
		.style("opacity",_laneOpacity);

		//target box	
		_drawLaneBox(d3.select(this),x(KANBAN_END),_y,LANE_LABELBOX_WIDTH,_height,_lane);

		// laneside descriptors
		_drawLaneSideText(d3.select(this),_lane,-LANE_LABELBOX_WIDTH-2,_y+3,"6px","start");

		//sublane descriptors
		for (var l=0;l<laneMap[_lane].length;l++){
			var _length = laneMap[_lane].length;
			var _y = y(mapLane(_lane,laneMap[_lane][l]));
			var _h = _height/_length; 
			
			_drawLaneSideText(d3.select(this),laneMap[_lane][l],1,_y+_h/2,"5px","middle");

			//no lines for first and last sublane
			if (l>0 && l<_length){
				d3.select(this).append("line")
					.attr("x1", x(KANBAN_START))
					.attr("y1", _y)
					.attr("x2", x(KANBAN_END))
					.attr("y2", _y)
					.attr("class", "sublaneLine");
				}
			}

		//check for demarcation between topline and enabling
		// => this needs first refactoring of in-memory datastructure !!!


		i++;
	});


/* [TODO]  TEXT should come from a lane config file
	
	labels.append("text")
	.text("EUROPE")
	.attr("x",-LANE_LABELBOX_WIDTH+10)
	.attr("y",50)
	.style("fill","white");
*/

}

/**
 */
function _drawLaneContext(svg,context,x,y,width,height,link){
	var _textOffsetX = 7;
	var _textOffsetY = 5;
	
	svg.append("text")
	.text("CONTEXT= "+context)
	.attr("x",x+_textOffsetX)
	.attr("y",y+_textOffsetY)
	.style("fill","#dddddd")
	.style("writing-mode","tb")
	.style("font-size","7px")
	.style("font-weight","bold")
	.style("opacity",1);
	
	svg.append("rect")
	.attr("x",x)
	.attr("y",y)
	.attr("width",width)
	.attr("height",height)
	.on("click",function(d){
		window.location.href=link;
	 })
	.attr("class","contextbox");
	
}

/**
 */
function _drawLaneBox(svg,x,y,width,height,lane){
		
		var _x_offset=5;
		var _y_offset=4;

		svg
		.append("rect")
		.attr("x",x)
		.attr("y",y)
		.attr("width",width)
		.attr("height",height)
		.style("cursor","pointer")		
		.style("stroke","white")
		.style("stroke-width",WIDTH_WHITESTROKE)
		.attr("class","lanebox "+lane)
			.on("click",function(d){
				window.location.href="kanban_"+lane+".html";
			})
			;

		//logo
		svg
		.append("use").attr("xlink:href","#"+lane)
		.attr("x",x+_x_offset)
		.attr("y",y+_y_offset);

}

/**
 */
function _drawLaneSideText(svg,text,x,y,size,anchor){
		svg
		.append("text")
		.text(text)
		.attr("x",x)
		.attr("y",y)
		.style("fill","grey")
		.style("font-weight","normal")
		.style("text-align","left")
		.style("writing-mode","tb")
		.style("font-size",size)
		.attr("text-anchor",anchor);
}


/**################# QUEUE SECTION #####################
* 
*/
function drawQueues(){

	d3.select("#queues").remove()

	
	calculateQueueMetrics();

	var _xWIPStart = x(WIP_START);
	var _xWIPWidth = x(WIP_END)-x(WIP_START);
	var _xFutureX = x(WIP_END);
	var _xFutureWidth = x(KANBAN_END) - _xFutureX;

	var _yMetricBase = -75;
	var _yMetricDetailsOffset = 10;
	var _yMetricDetails2Offset = 8;
	var _yMetricBracketOffset = -50	;
	var gQueue = svg.append("g").attr("id","queues");
	
	//---------------- DONE queue --------------------
	var gQueueDone = gQueue.append("g").attr("id","done");

	//3px ofsfet for first box
	_drawQueueArea(gQueueDone,0,0,_xWIPStart,height,"done",3);

	// --------------- DONE METRICS ---------------------
	var _metric = {"text":"DONE" ,"items":ITEMS_DONE ,"swag": SIZING_DONE}

	_drawQueueMetric(gQueueDone,_metric,x(KANBAN_START),_yMetricBracketOffset,_xWIPStart,_xWIPStart/2,_yMetricBase,_yMetricDetailsOffset);

	//---------------- wip queue --------------------
	var gQueueWip = gQueue.append("g").attr("id","wip");
	
	_drawQueueArea(gQueueWip,_xWIPStart,0,_xWIPWidth,height,"wip",0);
	
	// --------------- WIP METRICS ---------------------
	_metric = {"text":"WIP" ,"items":ITEMS_WIP ,"swag": SIZING_WIP}

	_drawQueueMetric(gQueueWip,_metric,_xWIPStart,_yMetricBracketOffset,_xWIPWidth,(_xWIPWidth/2+x(WIP_START)),_yMetricBase,_yMetricDetailsOffset);

	//-------------- TODAY markerlines ----------------
	_drawQueueMarker(gQueueWip,WIP_START,"today",x(WIP_START),-30);
		
	// ------------- WIP marker lines ---------------------
	_drawQueueMarker(gQueueWip,WIP_END,"today",x(WIP_END),-30);

	//---------------- FUTURE queue --------------------
	var gQueueFuture = gQueue.append("g").attr("id","future");
	
	_drawQueueArea(gQueueFuture,_xFutureX,0,_xFutureWidth,height,"future",0);
	
	//---------------- FUTURE METRICS --------------------
	_metric = {"text":"FUTURE" ,"items":ITEMS_FUTURE ,"swag": SIZING_FUTURE}

	_drawQueueMetric(gQueueFuture,_metric,_xFutureX,_yMetricBracketOffset,_xFutureWidth,(_xFutureWidth/2+x(WIP_END)),_yMetricBase,_yMetricDetailsOffset);

	//---------------- TOTAL METRICS --------------------
	_metric = {"text":"TOTAL" ,"items":ITEMS_TOTAL ,"swag": SIZING_TOTAL}

	_drawQueueMetric(gQueue,_metric,null,null,null,(_xFutureX+_xFutureWidth),_yMetricBase,_yMetricDetailsOffset);

	//---------------- TOTAL DELAYED METRICS --------------------
	_metric = {"text":"DELAY" ,"items":ITEMS_DELAYED ,"swag": DAYS_DELAYED}

	_drawQueueMetric(gQueue,_metric,null,null,null,(_xFutureX+_xFutureWidth+100),_yMetricBase,_yMetricDetailsOffset);



} //end drawQueues

/**
 */
function _drawQueueArea(svg,x,y,w,h,css,offsetX){
	
	var _offsetY=3;
	svg.append("rect")
	.attr("x", x+offsetX)
	.attr("y",y+_offsetY)
	.attr("width",w-offsetX)
	.attr("height",h-(2*_offsetY))
	.attr("class",css+"Queue");
}

/**
 * 
 */
function _drawQueueMarker(svg,date,css,x,y){
	svg.append("text")
		.text(date.toString("d-MMM-yyyy"))
		.attr("class",css+"Text")
		.style("text-anchor","start")
		.attr("x",x+5)
		.attr("y",(y+3));

	svg.append("text")
		.text(WIP_START.toString("d-MMM-yyyy"))
		.attr("class",css+"Text")
		.style("text-anchor","start")
		.style("font-weigth","bold")
		.attr("x",x+5)
		.attr("y",height-y+3);

	svg.append("line")
		.attr("x1", x + 0.5)
		.attr("y1", y)
		.attr("x2", x + 0.5)
		.attr("y2", height-y)
		.attr("class", css+"Line")
		.attr("marker-start", "url(#rect_red)")
		.attr("marker-end", "url(#rect_red)");
}

/**
 */
function _drawQueueMetric(svg,metric,bracketX,bracketY,width,metricX,metricY,space){
	if (width){
		svg.append("use")
		.attr("xlink:href","#icon_bracket_top_blue")
		.style("opacity",0.15)
		.attr("transform","translate("+bracketX+","+bracketY+") scale("+(width/100)+",1) rotate(0)");
	}
	
	svg.append("text")
	.text(metric.text)
	.style("text-anchor","middle")
	.style("font-size","18px")
	.style("fill","174D75")
	.attr("class","metricItems")
	.attr("transform","translate("+metricX+","+metricY+") rotate(0)");

	svg.append("text")
	.text(metric.items+ " items")
	.attr("class","metricItems")
	.style("text-anchor","middle")
	.style("font-size","9px")
	.style("fill","174D75")
	.attr("transform","translate("+metricX+","+(metricY+space)+") rotate(0)");

	svg.append("text")
	.text("["+metric.swag+" PD]")
	.attr("class","metricItems")
	.style("text-anchor","middle")
	.style("font-size","7px")
	.style("fill","174D75")
	.attr("transform","translate("+metricX+","+(metricY+space+(space-2))+") rotate(0)");
}


/**
 * 
 */
function drawPostits(){
	var gPostits = svg.append("g").attr("id","postits");
	
	var tooltip = d3.select("body")
		.append("div")
		.attr("class","d3tooltip");

	gPostits.selectAll("postit")
	// filtered data before used in D3 ;-)	
	.data(initiativeData.filter(function(d){return (d.state==="todo")}))
	.enter()
	// **************** grouped item + svg block + label text
	.append("g")
	.attr("id",function(d){return "postit_"+d.id})
	//.style("opacity",function(d){return d.accuracy/10})
	//.on("mouseover",animateScaleUp)
	.each(function(d){
		var _itemXPlanned = x(new Date(d.planDate));
		var _itemXActual = x(new Date(d.actualDate));
		var _itemXStart = x(new Date(d.startDate));
		var _yOffset = getSublaneCenterOffset(d.lane);
		
		//d.sublaneOffset = override for positioning of otherwise colliding elements => manual !
		var _itemY = y(mapLane(d.lane,d.sublane)-_yOffset)+getInt(d.sublaneOffset);

		// ------------  postits --------------
		if(d.state=="todo")
		{
			var postit_x_offset = -2*d.size+2;
			var postit_y_offset = -1.5*d.size;
		
			var postit_x =_itemXPlanned+postit_x_offset;
			var postit_y =_itemY+postit_y_offset;
			
			var _rmax=5,
				_rmin=-5;						;
			
			var _rotate = Math.floor(Math.random() * (_rmax - _rmin + 1) + _rmin);
			var _scale = d.size/8;
			
			var postit = d3.select(this)
			.on("mouseover", function(d){
				d3.select(this)
				.style("cursor","pointer");
				onTooltipOverHandler(d,tooltip,"#postit_");}) 
			.on("mousemove", function(d){onTooltipMoveHandler(tooltip);})
			.on("mouseout", function(d){onTooltipOutHandler(d,tooltip,"#postit_");});
		
			postit.append("use")
			.attr("xlink:href","#postit_yellow")
			.attr("transform","translate("+postit_x+","+postit_y+") scale("+_scale+") rotate("+_rotate+")")
			
			postit.append("text")
			.text("DoD: "+d.id)
			.style("text-anchor","start")
			.style("font-size",(3+d.size/6)+"px")
			.style("font-weight","bold")
			.style("fill","blue")
			.attr("transform","translate("+(postit_x)+","+(postit_y+10)+") rotate("+_rotate+")");
		}
	})
}

/** renders the items
*/
function drawItems(){
	d3.selectAll("#items,#dependencies,#sizings").remove();

	//tooltips
	var tooltip = d3.select("body")
		.append("div")
		.attr("class","d3tooltip");

	svg.append("g").attr("id","dependencies");
	var gSizings = svg.append("g")
	.attr("id","sizings")
	.style("opacity","0");

	//initiatives groups
	var gItems = svg.append("g").attr("id","items");
	
	//labels
	var gLabels = gSizings.append("g")
		.attr("id","labels")
		.style("opacity",0);
	
	var groups = gItems.selectAll("initiatives")
				.data(initiativeData)
				.enter()
				// **************** grouped item + svg block + label text
				.append("g")
				.attr("id",function(d){return "item_"+d.id})
				//.style("opacity",function(d){return d.accuracy/10})
				//.on("mouseover",animateScaleUp)
				.each(function(d){
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
					
					var _yOffset = getSublaneCenterOffset(d.lane);
					
					//d.sublaneOffset = override for positioning of otherwise colliding elements => manual !
					var _itemY = y(mapLane(d.lane,d.sublane)-_yOffset)+getInt(d.sublaneOffset);

					
					// ------------  line if delayed  before plan--------------
					if (d.actualDate>d.planDate) _drawItemDelayLine(d3.select(this),_itemXPlanned,(_itemX-d.size-(d.size/2)),_itemY);
					
					// ------------  line if before plan--------------
					else if (d.actualDate<d.planDate) _drawItemDelayLine(d3.select(this),_itemX,(_itemXPlanned-d.size-(d.size/2)),_itemY);
					
					
					
					d3.select(this)
						.style("opacity",d.accuracy/10);
					
					// ------------  circles --------------
					if (d.type !=="target"){

						d3.select(this)
							.append("circle")
								.attr("id","item_circle_"+d.id)
								.attr("cx",_itemX)
								.attr("cy",_itemY)
								.attr("r",d.size)
								.attr("class",function(d){
								if (d.actualDate>d.planDate &&d.state!="done") {return "delayed"} 
								else if (new Date(d.actualDate)>WIP_END) {return "future";} 
								else {return d.state}});

						// ----------- circle icons -------------
						console.log("################################ id:"+d.id+" "+_itemXPlanned);
						
						d3.select(this)
							.append("use").attr("xlink:href","#icon_"+d.sublane)
							.attr("transform","translate("+(_itemX-(1.2*d.size/2))+","+(_itemY-(1.2*d.size/2))+") scale("+d.size/10+") ");
					} //end if d.type!="target"

					
					// ------------  item blocks --------------
					d3.select(this)
						.append("use").attr("xlink:href",function(d){return "#"+d.type})
						.attr("transform","translate("+(_itemXPlanned-(1.2*d.size))+","+(_itemY-(1.2*d.size))+") scale("+d.size/10+") ");

					
					// transparent circle on top for the event listener
					d3.select(this)
						.append("circle")
							.attr("id","item_circle_"+d.id)
							.attr("cx",_itemX)
							.attr("cy",_itemY)
							.attr("r",d.size)
							.style("opacity",0)
							.on("mouseover", function(d){
								console.log("****in circle: mouseOver: "+d.id);
								d3.select("#item_circle_"+d.id)
								.transition().delay(0).duration(500)
								.attr("r", d.size*2)
								.style("cursor","pointer");
								onTooltipOverHandler(d,tooltip,"#item_");
								}) 
								
							.on("mousemove", function(d){onTooltipMoveHandler(tooltip);})
								
							.on("mouseout", function(d){
								d3.select("#item_circle_"+d.id)
								.transition().delay(0).duration(500)
								.attr("r", d.size);
									//.transition().delay(0).duration(500)
								onTooltipOutHandler(d,tooltip,"#item_");})
															
					
					// ------------  item names --------------
					d3.select(this)
					   .append("text")
					   .text(d.Title)
					   .attr("font-size",(5+(d.size/5))+"px")
					   .attr("text-anchor","middle")
					   .style("font-weight","bold")
					   //google font
					   .style("font-family","Open Sans Condensed,arial, sans-serif")
					   .style("fill",function(d){if (d.type=="target" || (d.actualDate>d.planDate && d.state!="done")) return "red"; else return"black";})
					   .attr("x",_itemXPlanned)
					   .attr("y",(_itemY)+ parseInt(d.size)+(6+(d.size/5)));
					
					
					// ------------- labels for sizing view -------------
					gLabels
					   .append("text")
					   .attr("id","label_"+d.id)
					   .text(d.Title)
					   .style("font-size",5+d.Swag/500+"px")
					   .style("font-weighT","bold")
					   .attr("text-anchor","middle")
					   .attr("x",_itemXPlanned)
					   .attr("y",_itemY);
					
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
							var _dependingItem = getItemByID(initiativeData,_d);
							//console.log("found depending item id: "+_dependingItem.id+ " "+_dependingItem.Title);
							var _toX = x(new Date(_dependingItem.planDate))	
							var _toY = y(mapLane(_dependingItem.lane,_dependingItem.sublane)-_yOffset)+getInt(_dependingItem.sublaneOffset);
							// put lines in one layer to turn on off globally
							dep.append("line")
								.attr("x1", _itemXPlanned)
								.attr("y1", _itemY)
								.attr("x2", _toX)
								.attr("y2", _toY)
								.attr("class", "dependLine")
								.attr("marker-end", "url(#arrow_grey)");
						} // end for loop
						//console.log ("check depending element: "+d3.select("#item_block_"+d.dependsOn).getBBox());
					} // end if dependcies
					
					// ----------------- startDate indicator ---------------------
					if(d.startDate){
						_drawStartDateIndicator(dep,_itemXStart,_itemXPlanned,_itemY,d.size);
					}
					// ----------------- sizings --------------------------------

					// sizingPD portfolio view
					if(d.Swag){
						console.log("****** sizingPDIndicator !");
						d3.select("#sizings")
						.append("circle")
						.attr("cx", _itemXPlanned)
						.attr("cy", _itemY)
						.attr("r", d.Swag/100)
						.attr("class","sizings "+d.lane)
						.style("opacity",0.4);
					}
   
				}) //end each()

	// data tracelog ********************
		d3.select("body")
				.append("ul")
				.selectAll("li")
				.data(initiativeData)
				.enter()
				.append("li")
				.text(function(d) {
					return "ID: "+d.id+" name: "+d.Title + " lane (main/sub): " + d.lane+"/"+d.sublane+" plaDdate: "+d.planDate + " scaleX = "+x(new Date(d.planDate))+ " mapLane = "+mapLane(d.lane) +" state: "+d.state+" size: "+d.size+" sizingPD: "+parseInt(d.Swag);
				});
			d3.selectAll("li")
				.style("font-weight",function(d) {
					if (Date.now() < new Date(d.planDate)) {
						return "normal";
					} else {
						return "bold";
					}
				})
	// data tracelog end********************
} //end drawItems


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
 */
function onTooltipOverHandler(d,tooltip,highlight){
	// and fadeout rest
	d3.selectAll("#items,#postits").selectAll("g")
		.transition()            
		.delay(0)            
		.duration(500)
		.style("opacity",0.1);
	
	//highlight the selected mouseover element
	d3.select(highlight+d.id)
		.transition()            
		.delay(100)            
		.duration(500)
	.style("opacity",1);
		
	console.log("highlight"+highlight+d.id);
		
	//[TODO] fix the indicator dynmic color bar  and overall table mess here ;-)	
	var _indicator;
	if (d.actualDate>d.planDate &&d.state!="done") _indicator="red";
	else if (d.state=="done") _indicator ="green";
	else if (d.state=="planned") _indicator ="gold";
	
	var _htmlBase ="<table><col width=\"30\"/><col width=\"80\"/><tr><td colspan=\"2\" style=\"font-size:6px;text-align:right\">[id: "+d.id+"]</td></tr><tr class=\"header\" style=\"height:5px\"/><td colspan=\"2\"><div class=\"indicator\" style=\"background-color:"+_indicator+"\">&nbsp;</div><b style=\"padding-left:5px;font-size:9px\">"+d.Title +"</b></td</tr>"+(d.Title2 ? "<tr><td class=\"small\">title2:</td><td  style=\"font-weight:bold\">"+d.Title2+"</td></tr>" :"")+"<tr><td  class=\"small\"style=\"width:30%\">lane:</td><td><b>"+d.lane+"."+d.sublane+"</b></td></tr><tr><td class=\"small\">owner:</td><td><b>"+d.productOwner+"</b></td></tr><tr><td class=\"small\">Swag:</td><td><b>"+d.Swag+" PD</b></td></tr><tr><td class=\"small\">started:</td><td><b>"+d.startDate+"</b></td></tr><tr><td class=\"small\">planned:</td><td><b>"+d.planDate+"</b></td><tr><td class=\"small\">status:</td><td class=\"bold\">"+d.state+"</td></tr>";

	if (d.actualDate>d.planDate &&d.state!="done"){ 
		_htmlBase=_htmlBase+"<tr><td class=\"small\">delayed:</td><td><b>"+diffDays(d.planDate,d.actualDate)+" days</b></td></tr>";
	}
	else if (d.actualDate>d.planDate &&d.state=="done"){
		_htmlBase=_htmlBase+ "<tr><td class=\"small\">done:</td><td><b>"+d.actualDate+"</b> </td></tr><tr><td class=\"small\">delay: </td><td><b>"+diffDays(d.planDate,d.actualDate)+" days</b></td></tr>";
	}
	else if (d.state=="done"){
		_htmlBase=_htmlBase+"<tr><td class=\"small\">done:</td><td><b>"+d.actualDate+"</b> </td></tr>";
	}
	else if (d.state=="todo"){
		_htmlBase=_htmlBase+"<tr><td class=\"small\">DoR:</td><td class=\"small\" style=\"text-align:left\">"+d.DoR+"</td></tr>";
		
	}
	_htmlBase=_htmlBase+"<tr><td class=\"small\">DoD:</td><td class=\"small\" style=\"text-align:left\">"+d.DoD+"</td></tr></table>";
	tooltip.html(_htmlBase);
	
	tooltip.style("visibility", "visible");
	tooltip.style("top", (d3.event.pageY-40)+"px").style("left",(d3.event.pageX+25)+"px");

	d3.select("#depID_"+d.id)
		.transition()            
		.delay(200)            
		.duration(500)
		
		.style("visibility","visible")
		.style("opacity",1);

	//d3.select("#item_"+d.id).select("text").style("font-weight","bold")
	
	if (d.dependsOn){
		// highlight also depending items
		var _dependingItems = d.dependsOn.split(",");

		for (var j=0;j<_dependingItems.length;j++) {	
			var _di = _dependingItems[j];
		
			var dep=d3.select("#item_"+_di)
				.transition()            
				.delay(200)            
				.duration(500)
				.style("opacity",1);
			
			dep.select("circle")
				.transition()            
				.delay(500)            
				.duration(500)
				.attr("r", getItemByID(initiativeData,_di).size*2);
		}
		// end check depending items
	}
}

/**
 * handler for tooltip mouse move 
 * called within item rendering
 */
function onTooltipMoveHandler(tooltip){
	return tooltip.style("top", (d3.event.pageY-40)+"px").style("left",(d3.event.pageX+25)+"px");
}

/**
 * handler for tooltip mouse out 
 * called within item rendering
 */
function onTooltipOutHandler(d,tooltip,highlight){
	
	tooltip.style("visibility", "hidden");
		
	d3.select("#depID_"+d.id)
		.transition()            
		.delay(200)            
		.duration(500)
		.style("visibility","hidden");

	//set all back to full visibility /accuracy
	d3.selectAll("#items,#postits").selectAll("g")
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
			var dep=d3.select("#item_"+_di)
			dep.select("circle")
				.transition()            
				.delay(0)            
				.duration(500)
				.attr("r", getItemByID(initiativeData,_di).size);
		} // end de- check depending items
	}
}


/**

*/
function handleMetrics(data){
	metricData=data;
	drawMetrics();
	drawPies();
}

function drawMetrics(){
	d3.select("#metrics").remove();
	
	var i=0;
	var gMetrics= svg.append("g").attr("id","metrics");
				
	var _bracketXOffset = LANE_LABELBOX_WIDTH+80;
	var _primaryXOffset = _bracketXOffset +50;
	var _secondaryXOffset = LANE_LABELBOX_WIDTH+45;
	var _tertiaryXOffset = LANE_LABELBOX_WIDTH+45;
	
	// => this for sure should be refactored into ONE parametrized method
	
	// -------------------------- baseline -------------------------------
	var _baselinePrimarySum=0;
	var _targetPrimarySum=0;
	
	gMetrics.append("g").attr("id","primary").append("g").attr("id","baseline")
	.selectAll("primary_baseline")
	.data(metricData.filter(function(d){return d.class=="primary" && new Date(d.date) <= METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return "1metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		var _y = y(laneDistribution[i]);
		
		var _height = y(100-(laneDistribution[i]-laneDistribution[i+1]));
		//primary metrics
		var _primTextYOffset = _height/2;

		// 100 is the height of the brackets svg
		var _bracketHeight = 100;

		if (d.sustainable==1) _baselinePrimarySum = _baselinePrimarySum+parseInt(d.number);

		_drawBracket(d3.select(this),d,"left",(x(KANBAN_START)-_bracketXOffset),_y,(_height/_bracketHeight));

		_drawTextMetric(d3.select(this),d,"metricBig",x(KANBAN_START)-_primaryXOffset,_y+_primTextYOffset,10);


		i++;
	});

	i=0;
//---------------------------- secondary ---------------------------------
	gMetrics.append("g").attr("id","secondary").append("g").attr("id","baseline")
	.selectAll("secondary_baseline")
	.data(metricData.filter(function(d){return d.class=="secondary" && new Date(d.date) <= METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return "2metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		var _y = y(laneDistribution[i]);
		
		var _height = y(100-(laneDistribution[i]-laneDistribution[i+1]));
		//secondary metrics
		var _secTextYOffset = _height/2;
	
		_drawTextMetric(d3.select(this),d,"metricSmall",x(KANBAN_START)-_secondaryXOffset,_y+_secTextYOffset,6);
		
		i++;
	});

	i=0;
//---------------------------- tertiary ---------------------------------
	gMetrics.append("g").attr("id","tertiary").append("g").attr("id","baseline")
	.selectAll("tertiary_baseline")
	.data(metricData.filter(function(d){return d.class=="tertiary" && new Date(d.date) <= METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return "3metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		var _y = y(laneDistribution[i]);
		
		var _height = y(100-(laneDistribution[i]-laneDistribution[i+1]));
		//tertiary metrics
		var _tertTextYOffset = (_height/2)+20;
	
		_drawTextMetric(d3.select(this),d,"metricSmall",x(KANBAN_START)-_tertiaryXOffset,_y+_tertTextYOffset,6);
		
		i++;
	});


	
	// calculated sum
	
	//[TODO] build a proper class structure = this would be a TextMetric m = new TextMetric(...)
	var _total = {"number":_baselinePrimarySum ,"scale":"mio EUR" ,"type":"NGR", "sustainable":1 };
	
	_drawTextMetric(gMetrics.select("#baseline"),_total,"metricBig",x(KANBAN_START)-_primaryXOffset,-35,10);
	
	// -------------------------- target -------------------------------
	i=0;
	
	gMetrics.select("#primary").append("g").attr("id","target").selectAll("primary_future")
	.data(metricData.filter(function(d){return d.class=="primary" && new Date(d.date) >= METRIC_PROJECTION}))
	.enter()
	.append("g")
	.attr("id",function(d){return "1metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		var _y = y(laneDistribution[i]);
		var _height = y(100-(laneDistribution[i]-laneDistribution[i+1]));
		//primary metrics
		var _primTextYOffset = _height/2;

		// 100 is the height of the brackets svg
		var _bracketHeight = 100;
		
		
		if (d.sustainable==1) _targetPrimarySum = _targetPrimarySum+parseInt(d.number);
		
		_drawBracket(d3.select(this),d,"right",(x(KANBAN_END)+_bracketXOffset),_y,(_height/_bracketHeight));
/*
		d3.select(this)
		.append("use").attr("xlink:href","#icon_bracket"+_bracketType)
		.style("opacity",0.15)
		.attr("transform","translate ("+(x(KANBAN_END)+_bracketXOffset)+","+_y+") scale(1,"+(_height/_bracketHeight)+")");
*/
		
		_drawTextMetric(d3.select(this),d,"metricBig",x(KANBAN_END)+_primaryXOffset,_y+_primTextYOffset,10);

		i++;
	});
	
	// calculated sum
	_total.number=_targetPrimarySum;
	_drawTextMetric(gMetrics.select("#target"),_total,"metricBig",x(KANBAN_END)+_primaryXOffset,-35,10);
	
	i=0;

//---------------------------- secondary ---------------------------------
	gMetrics.append("g").attr("id","secondary").append("g").attr("id","target")
	.selectAll("secondary_baseline")
	.data(metricData.filter(function(d){return d.class=="secondary" && new Date(d.date) > METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return "2metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		var _y = y(laneDistribution[i]);
		
		var _height = y(100-(laneDistribution[i]-laneDistribution[i+1]));
		//secondary metrics
		var _primTextYOffset = _height/2;
		
		_drawTextMetric(d3.select(this),d,"metricSmall",x(KANBAN_END)+_secondaryXOffset,_y+_primTextYOffset,6);

		i++;
	});

	i=0;
//---------------------------- tertiary ---------------------------------
	gMetrics.append("g").attr("id","tertiary").append("g").attr("id","target")
	.selectAll("tertiary_target")
	.data(metricData.filter(function(d){return d.class=="tertiary" && new Date(d.date) > METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return "3metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		var _y = y(laneDistribution[i]);
		
		var _height = y(100-(laneDistribution[i]-laneDistribution[i+1]));
		//tertiary metrics
		var _tertTextYOffset = (_height/2)+20;
	
		_drawTextMetric(d3.select(this),d,"metricSmall",x(KANBAN_END)+_tertiaryXOffset,_y+_tertTextYOffset,6);
		
		i++;
	});

	
/*	
	//postits drag and drop
	var postit=svg.append("g")
		.attr("id","postit_1")
		.data([ {"x":0, "y":0} ])
		.call(drag);

	postit.append("use")
		.attr("xlink:href","#postit_yellow")
		.attr("x",1000)
		.attr("y",100);
	postit.append("text")
	.text("postit note")
	.style("text-anchor","start")
	.style("font-size","9px")
	.style("font-weight","bold")
	.style("fill","blue")
		.attr("x",1002)
		.attr("y",130);
	;
*/
	//data
	d3.select("body")
				.append("ul")
				.selectAll("li")
				.data(metricData)
				.enter()
				.append("li")
				.text(function(d) {
					return "drawMetrics; "+d.id + " lane: " + d.lane +" date: "+d.date + " scale: "+d.scale+" number: "+d.number+" type: "+d.type;
				});
			
} //end drawMetrics


/**
 * icon_bracket<direction><type>
 */
function _drawBracket(svg,metric,direction,x,y,scaleY){
		if (metric.sustainable==1){
			 _bracketType="_blue";
		}
		else{
			 _bracketType="_grey";
		}
		
		svg
		.append("use").attr("xlink:href","#icon_bracket_"+direction+_bracketType)
		.style("opacity",0.15)
		.attr("transform","translate ("+x+","+y+") scale(1,"+scaleY+")");
	
}

/**
 */
function _drawTextMetric(svg,metric,css,x,y,space){
		var _metricColor;
		if (metric.sustainable==1) _metricColor="174D75";
		else _metricColor="grey";

		svg	.append("text")
			.text(metric.number)
			.attr("x",x)
			.attr("y",y+space/2)
			.style("fill",_metricColor)
			.attr("class",css+"Number");
			
		svg	.append("text")
			.text(metric.scale)
			.attr("x",x+space/2)
			.attr("y",y-space/2)
			.style("fill",_metricColor)
			.attr("class",css+"Scale");

		svg	.append("text")
			.text(metric.type)
			.attr("x",x+space/2)
			.attr("y",y+space/2)
			.style("fill",_metricColor)
			.attr("class",css+"Type");
}


function drawPies(){

var pieBaselineData =[{"type":"sustainable","percentage":65},{"type":"notsustainable","percentage":35}];
var pieTargetData =[{"type":"sustainable","percentage":75},{"type":"notsustainable","percentage":25}];

	var _primaryXOffset = LANE_LABELBOX_WIDTH +130;
	var _y = -80;


var radius =40;

var arc = d3.svg.arc()
    .outerRadius(radius - 10)
    .innerRadius(0);

var pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.percentage; });

var gPies = svg.select("#metrics")
	.append("g")
	.attr("id","pies");

_drawPie(gPies,"baseline",pie,pieBaselineData,arc,x(KANBAN_START)-_primaryXOffset,_y);

_drawPie(gPies,"target",pie,pieTargetData,arc,x(KANBAN_END)+_primaryXOffset,_y);


}

/** helper function
 * */
function _drawPie(svg,id,pie,data,arc,x,y){
var gPieTarget = svg.append("g")
		.attr("id",id)
	.selectAll(".arc")
		.data(pie(data))
		.enter().append("g")
		.attr("transform","translate("+x+","+y+")")

gPieTarget.append("path")
  .attr("d", arc)
  .style("fill", function(d) { if (d.data.type=="sustainable") return COLOR_BPTY; else return "grey";})
  .style("stroke", "#ffffff")
  .style("stroke-width", "4px");

gPieTarget.append("text")
  .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
  .attr("dy", ".35em")
  .style("text-anchor", "middle")
  .style("fill", "#ffffff")
  .style("font-weight", "bold")
  .style("font-size", function(d) { return (5+d.data.percentage/10)+"px";})
  .text(function(d) { return d.data.percentage+"%"; });
	
}

/**

*/
function handleReleases(data)
{
	releaseData = data;

	drawReleases();
}

function drawReleases(){	
	
	d3.select("#releases").remove()
	console.log("####removed #releases");


	svg.append("g")
		.attr("id","releases")
		.style("visibility","hidden")
				
		.selectAll("release")
		//filtered data before used in D3
		.data(releaseData.filter(function(d){return (new Date(d.CurrentReleaseDate))>KANBAN_START}))
		.enter()
		.append("g")
		.attr("id",function(d){return d.id})
		
		//append elelements on same level within metrics as a group
		// http://stackoverflow.com/questions/13203897/d3-nested-appends-and-data-flow
		.each(function(d){
			
			var _releaseDate = new Date(d.CurrentReleaseDate);
			
			console.log("*** release: "+d.ReleaseName+" date: "+d.CurrentReleaseDate);
			if (_releaseDate > KANBAN_START){
				d3.select(this).append("line")
				.attr("x1", x(_releaseDate))
				.attr("y1", -5)
				.attr("x2", x(_releaseDate))
				.attr("y2", height+5)
				.attr("class", "releaseLine")
				.attr("marker-start", "url(#rect_blue)");
				
				d3.select(this).append("text")
				.text(d.ReleaseName)
				.style("fill","blue")
				.style("font-size","7px")
				.style("font-weight","bold")
				.style("opacity",0.5)
				.attr("transform","translate("+x(_releaseDate)+",-15) rotate(-45)");
		}
	});
			
}

function drawAll(){
	drawInitiatives();
	drawReleases();
	drawMetrics();
	drawPies();
	drawVersion();
}



function drawVersion(){
	d3.select("#releases").remove()
	console.log("####removed #version");

	
	var _line =7;
	var _offset =40;
	
	var t;

	var gVersion= svg.append("g")
		.attr("id","version");
	
	gVersion.append("use").attr("xlink:href","#bpty")
	.attr("transform","translate ("+(WIDTH-165)+","+(-margin.top)+") scale(0.55) ");
	
	_drawLegendLine(svg,WIDTH-200,WIDTH-42,-margin.top+20);
		
	//title
	_drawText(gVersion,"dynamic strategic kanban board",WIDTH-42,-(margin.top-(_offset-10)),10,"bold","end");


	var i=0;

	t = [	{"name":"context: ","value": CONTEXT},
			{"name":"URL: ","value": document.URL},
			{"name":"version: ","value": new Date().toString('yyyy-MM-dd_hh:mm:ss')},
			{"name":"author: ","value":"EA/@cactus"}
		];

	for (var j in t){ 
		_drawVersionText(gVersion,t[j],WIDTH-140,-(margin.top-_offset-(j*_line)),6);
		i++;
	}
	
	for (var _version in dataversions){
		_drawText(gVersion,_version+": "+dataversions[_version],WIDTH-136,-(margin.top-_offset-(i*_line)),5,"normal","start");
		i++;
	}
	
	_drawLegendLine(svg,WIDTH-200,WIDTH-42,-(margin.top-_offset-(i*_line)+2));
		
	
	//bottom disclaimer
	i++;

	_drawLegendLine(svg,WIDTH-200,WIDTH-42,height+43);
	
	_drawText(gVersion,"* auto-generated D3 svg | batik png pdf transcoded",WIDTH-42,height+50,6,"normal","end");
	
}

/**
 */
function _drawVersionText(svg,text,x,y,size){
	
	_drawText(svg,text.name,x,y,size,"normal","end");
	_drawText(svg,text.value,x+3,y,size,"bold","start");
}

/**
 */
function _drawText(svg,text,x,y,size,weight,anchor){
	svg.append("text")
	.text(text)
	.style("font-size",size+"px")
	.style("font-weight",weight)
	.style("fill","black")
	.style("text-anchor",anchor)
	.attr("transform","translate("+x+","+y+")");
}

/**
 */
function _drawLegendLine(svg,x1,x2,y){
	svg.append("line")
	.attr("x1",x1)
	.attr("y1", y)
	.attr("x2", x2)
	.attr("y2", y)
	.attr("class", "legendLine");
}

/**
*
*/
function initHandlers(){
d3.select("#b0").on("click", function(){
	var dep = d3.select("#dependencies").selectAll("g");
	if (dep.style("visibility") =="visible") dep.style("visibility","hidden");
	else dep.style("visibility","visible");
});

d3.select("#b1").on("click", function(){
	if (d3.select("#queues").style("visibility") =="visible") d3.select("#queues").style("visibility","hidden");
	else d3.select("#queues").style("visibility","visible");
});

d3.select("#b2").on("click", function(){
	if (d3.select("#items").style("visibility") =="visible") d3.selectAll("#items,#postits").style("visibility","hidden");
	else d3.selectAll("#items,#postits").style("visibility","visible");
});

d3.select("#b3").on("click", function(){
	if (d3.select("#lanes").style("visibility") =="visible") d3.select("#lanes").style("visibility","hidden");
	else d3.select("#lanes").style("visibility","visible");
});

d3.select("#b4").on("click", function(){
	if (d3.select("#axes").style("visibility") =="visible") d3.select("#axes").style("visibility","hidden");
	else d3.select("#axes").style("visibility","visible");
});

d3.select("#b5").on("click", function(){
	if (d3.select("#metrics").style("visibility") =="visible") d3.select("#metrics").style("visibility","hidden");
	else d3.select("#metrics").style("visibility","visible");
});	


d3.select("#b8").on("click", function(){
	if (d3.select("#releases").style("visibility") =="visible"){
		 d3.select("#releases").style("visibility","hidden");
		 d3.select("#items").style("opacity",1);
	 }
	 
	else{
		 d3.select("#releases").style("visibility","visible");
		 d3.select("#items").style("opacity",0.5);
	 }
});	

d3.select("#b9").on("click", function(){
	if (d3.select("#sizings").style("opacity") >0){
	 
		 d3.selectAll("#items,#queues,#postits,#metrics")
		 .style("visibility","visible");
		 
		 d3.selectAll("#sizings,#labels")
		 .transition()
		 .delay(0)
		 .duration(1000)
		 .style("opacity",0);

		 d3.selectAll("#items,#queues,#lanes,#axes,#postits,#metrics")
		 .transition()
		 .delay(0)
		 .duration(1000)
		 .style("opacity",1);
		 
	/*	 d3.selectAll("#items,#queues,#lanes,#axes")
		 .attr("filter", 0);
	*/	 
	 }
	 
	else{
		 
		 d3.selectAll("#sizings,#labels")
		 .transition()
		 .delay(0)
		 .duration(1000)
		 .style("opacity",1);

		 d3.selectAll("#items,#queues,#postits,#metrics")
		 .transition()
		 .delay(0)
		 .duration(1000)
		 .style("opacity",0);
		 
		 d3.selectAll("#items,#queues,#postits,#metrics")
		 .transition()
		 .delay(1000)
		 .style("visibility","hidden");
		 
		 d3.selectAll("#lanes,#axes")
		 .transition()
		 .duration(1000)
		 .style("opacity",0.5);
		 
/*		 d3.selectAll("#items,#queues,#lanes,#axes")
		 .attr("filter", "url(#blur)")
		 .transitioned;
*/
	 }
});	



d3.select("#b6").on("click", function(){
	WIP_WINDOW_DAYS = 120;
	setWIP();
	drawAll();
});	

d3.select("#b7").on("click", function(){
	WIP_WINDOW_DAYS = 90;
	setWIP();
	drawAll();
});	

d3.select("#b10").on("click", function(){
// do blur
if (!d3.selectAll("#metrics,#queues,#lanes,#version").attr("filter")) d3.selectAll("#metrics,#queues,#lanes,#version").attr("filter", "url(#blur)");
else d3.selectAll("#metrics,#queues,#lanes,#version").attr("filter", "");

});


document.getElementById("input_width").value = WIDTH;
d3.select("#b11").on("click", function(){
	WIDTH = document.getElementById("input_width").value;

	drawAll();
	
});	

document.getElementById("input_height").value = HEIGHT;
d3.select("#b12").on("click", function(){
	HEIGHT = document.getElementById("input_height").value;
	
	drawAll();
	
});	


d3.select("#l1").on("click", function(){
	window.location.href="treemap.html";
});	

d3.select("#l2").on("click", function(){
	window.location.href="tree.html";
});	

d3.select("#l3").on("click", function(){
	window.location.href="force.html";
});	
	
}


function customAxis(g) {
  g.selectAll("text")
      .attr("x", 4)
      .attr("dy", -4);
}


/** String lane, String sublane
	returns domain y raster value
	autocalculation of lanes
**/
function mapLane(lane,sublane){
	
	//var _lanePosition = getLaneSublane(lane,sublane);
	var _l = getLane(lane);
	
	//var _l=_lanePosition[0];
	//var _sl = _lanePosition[1];
	
	//offset from the bottom of the lane
	//var _offsetBottom = 0.5;
	//var _offsetTop =1.5;
	var _offsetBottom = 0;
	var _offsetTop =0;
	
	var _start = laneDistribution[_l-1]-_offsetTop;
	var _space = laneDistribution[_l-1]-laneDistribution[_l]-_offsetBottom;
	var _laneSize = _space/(laneMap[lane].length);

	var _y = _start-((laneMap[lane].indexOf(sublane))*_laneSize)
	
//	console.log("mapLane2("+lane+","+sublane+"): _l ="+_l+", _sl="+_sl+"_start="+_start+", _space="+_space+", _laneSize="+_laneSize+" => _y="+_y);

	return _y;
}

function mapLaneNEW(lane,sublane){
	
	var _y=0;
	
	for (var i in itemData.children){
		console.log("* scanning...."+itemData.children[i].name)
			
		for (j in itemData.children[i].children){
			console.log("** scanning...."+itemData.children[i].children[j].name)
				for (k in itemData.children[i].children[j].children){
					console.log("*** scanning...."+itemData.children[i].children[j].children[k].name)
					
					if (lane+"."+sublane == itemData.children[i].children[j].distTransposed[k].name){
					console.log("***match***");
					_y=itemData.children[i].children[j].distTransposed[k].value1;
					break;
				}
			}
		}
			
		
	}
	return 100-(_y*100);
	
}
	
	
	



/** Calculate the difference of two dates in total days
*/
function diffDays(d1, d2)
{
	date1_unixtime = parseInt(new Date(d1).getTime() / 1000);
	date2_unixtime = parseInt(new Date(d2).getTime() / 1000);

	// This is the calculated difference in seconds
	var timeDifference = date2_unixtime - date1_unixtime;

	// in Hours
	var timeDifferenceInHours = timeDifference / 60 / 60;

	// and finaly, in days :)
	var timeDifferenceInDays = timeDifferenceInHours  / 24;

	return timeDifferenceInDays;
}	

/**
* helper method
*/
function getInt(_value){
	var _int =0;
	if (parseInt(_value)) _int = parseInt(_value); 
	return _int;				
}

function timeFormat(formats) {
  return function(date) {
    var i = formats.length - 1, f = formats[i];
    while (!f[1](date)) f = formats[--i];
    return f[0](date);
  };
}


/**builds datastructure for dynamic lane handling
*/
function createLaneMap()
{
	laneMap = new Array();
	
	for(_d in initiativeData)
	{	
		var _lane = initiativeData[_d].lane;
		
		var _sublane = initiativeData[_d].sublane;
		if (laneMap[_lane] == null){
			laneMap[_lane]=new Array() 
			console.log("created _lane: "+_lane);
		}
		if (laneMap[_lane].indexOf(_sublane) <0) {
			laneMap[_lane].push(_sublane);
			console.log("pushed["+_lane+"]: "+_sublane);
		} 		
	}
	
	console.log("lanes: "+JSON.stringify(laneMap));
	
	for(_lane in laneMap) {
		console.log("* "+_lane);
			console.log("  + "+laneMap[_lane].length);
			for (var i=0;i<laneMap[_lane].length;i++)
			{
				console.log("    --- "+laneMap[_lane][i]);
			}
	}
}






/** setup the laneDistrutionarray
*
*/
function createLaneDistribution(){
	
	createLaneMap();
	
	laneDistribution=new Array();
	laneDistribution.push(100);

	var _sum = 0;
	// use override definition
	if (lanePercentagesOverride){
		for (i=0;i<lanePercentagesOverride.length;i++){
			_sum = _sum+lanePercentagesOverride[i][1];
			laneDistribution.push(100-_sum);
		}
	}
	// or just spread equally distributed over number of lanes
	else{
		for (i=0;i<getLanes().length;i++){
			_sum = _sum+(100/getLanes().length);
			laneDistribution.push(100-_sum);
		}
	}
	//var laneDistribution=[100,84,68,60,52,40,26,18,0];
}

/**NEW
 */
function createLaneDistributionNEW(){
	
	createLaneMap();

	laneDistribution=getLaneDistributionNEW();
}

/** NEW
 * gets current transposed dist values below themes = lanes level !
 */
function getLaneDistributionNEW(){
	var _dist = new Array();
	_dist.push(100);
	
	for (var i in itemData.children){
		for (var j in itemData.children[i].distTransposed){
			_dist.push(100-(itemData.children[i].distTransposed[j].value2)*100);
		}
	}
	return _dist;
}

function getLaneDistributionRAW(){
	var _dist = new Array();
	//_dist.push(100);
	
	for (var i in itemData.children){
		for (var j in itemData.children[i].dist){
			_dist.push(100-(itemData.children[i].dist[j].value2)*100);
		}
	}
	return _dist;
}


function getSubLaneDistributionNEW(){
	var _dist = new Array();
	_dist.push(100);
	
	for (var i in itemData.children){
		for (var j in itemData.children[i].children){
			for (var k in itemData.children[i].children[j].distTransposed){
			_dist.push(100-(itemData.children[i].children[j].distTransposed[k].value2)*100);
			}
		}
	}
	return _dist;
}

function getSubLaneDistributionRAW(){
	var _dist = new Array();
	//_dist.push(100);
	
	for (var i in itemData.children){
		for (var j in itemData.children[i].children){
			for (var k in itemData.children[i].children[j].dist){
			_dist.push(100-itemData.children[i].children[j].dist[k].value2);
			}
		}
	}
	return _dist;
}



function getThemeDistributionNEW(){
	var _dist = new Array();
	_dist.push(100);
	
	for (var i in itemData.children){
		_dist.push(100-(itemData.dist[i].value2)*100);
	}
	return _dist;
}




/**
 * create hierarchical data structure from flat import table
 */
function createLaneHierarchy(){
	// create hierarchical base data from list
	itemData = _.nest(initiativeData,["theme","lane","sublane"]);

	// and here comes the magic to tag the y-values to each level and element of the hierarchy
	// remember structure (data domain) is always like
	//
	// |			- y min = 0
	// |
	// |
	// |
	// |
	// ------------ -y max = 100
	
	
	itemData.y1 = 0;
	itemData.y2 = 100;
	itemData.name="itemData root";

	
	var _dist0=[];
				
	//calculate sum of all children
	var _sum1=0;
	for (var i in itemData.children){
		_sum1=_sum1+itemData.children[i].children.length;
	}
	console.log("//// _count of lanes in root= "+_sum1);
	console.log("//// _count of themes in root= "+itemData.children.length);
	
	for (var i0 in itemData.children){
			console.log("* level-0 [\"themes\"] children found: size="+itemData.children.length);
			console.log("* level-0 [\"themes\"] start traversing: "+itemData.children[i0].name);
			var c0 = itemData.children[i0];
			itemData.type="root";

			if (c0.children){
				console.log("  * level-1 children found: size="+c0.children.length);
				c0.level="theme";
				
				var _dist1=[];
				
				//calculate sum of all children
				var _sum2=0;
				for (var i in c0.children){
					_sum2=_sum2+c0.children[i].children.length;
				}
				console.log("/////////////// _count of sublanes "+c0.name+" = "+_sum2);
				console.log("/////////////// _count of lanes "+c0.name+" = "+c0.children.length);
					
				for (var i1 in c0.children){
					console.log("    * level-1 [\"lanes\"]start traversing: "+c0.children[i1].name);
					c1 = c0.children[i1];
					c1.level="lane";
							
					if (c1.children){
						console.log("      * level-2 children found");
						var _dist2=[];
						
						//calculate sum of all childs in children
						var _sum3=0;
						for (var i in c1.children){
							_sum3=_sum3+c1.children[i].children.length;
						}
						console.log("/////////////////////// _count of subitems ["+c1.name+"]= "+_sum3);
						console.log("/////////////////////// _count of sublanes ["+c1.name+"]= "+c1.children.length);
					
						for (var i2 in c1.children){
							console.log("        * level-2 [\"sublanes\"]: "+c1.children[i2].name+" start traversing");
							c2 = c1.children[i2];
							c2.level="sublane";
						
							if (c2.children){
								console.log("          * level-3 children found");
				
								//calculate sum of all children
								var _sum4=0;
								for (var i3 in c2.children){
									console.log("              * level-3 start [\"items\"] traversing: "+c2.children[i3].name);
									c3 = c2.children[i3];
									c3.level="item";
									
									if (c3.children){
										// end of recursion
										console.log("                  * level-4 children found");
									}
									else{
										// go one step deeper in recusrion
										console.log("                   [\"items\"]=> on leaf nodes: #"+c3.Title);
										c3.type="item";
									}
								} // END ITEMS LOOP
							} //end if(c2.children)
							
							
							/**
							 * "auto": takes the sum of subitems as basline and calculates the distribution accordingly - the more items the more space
							 * "equal": takes the parent length of elements and calculates the equal distributed space (e.g. lane "bwin" has 4 sublanes => each sublane gets 1/4 (0.25) for its distribution
							 * "override": takes specified values and overrides the distribution with those values => not implemented yet ;-)
							 */
							var STRATEGY ="auto";
							//var STRATEGY ="equal";
							
							var _v1,_v2;
							if (i2==0) _v1 = 0;
							else _v1 = parseFloat(_dist2[parseInt(i2)-1].value2);
								
							if (STRATEGY =="auto")_v2 = itemData.children[i0].children[i1].children[i2].children.length/_sum3;
							else if (STRATEGY=="equal") _v2 = 1/itemData.children[i0].children[i1].children.length;
							
							_v2 = _v2+_v1;
							
							_dist2[i2]={"name":itemData.children[i0].children[i1].name+"."+itemData.children[i0].children[i1].children[i2].name,"value1":_v1,"value2":_v2};
						} // END SUBLANE LOOP

						c1.dist=_dist2;
					}
					console.log("OUT of loop: [i1]  ======== sum of all sublanes below theme ["+c0.name+"]= "+_sum2);

					/**
					 * the values in the override mean % of space the lanes will get => has to sum to 100% 
					 */
					var laneDistOverride;/* = [{"level":"lane","dist":
												[
													{"name":"bwin","value"		:30},
													{"name":"pp","value"		:20},
													{"name":"foxy","value"		:10},
													{"name":"premium","value"	:20},
													{"name":"casino","value"	:20}
												]
											},
											{"level":"lane","dist":
												[
													{"name":"techdebt","value"	:40},
													{"name":"shared","value"	:60}
												]
											}];
					*/
					var _v1,_v2;
										
					if (i1==0) _v1 = 0;
					else _v1 = parseFloat(_dist1[parseInt(i1)-1].value2);
	
					_v2 = itemData.children[i0].children[i1].children.length/_sum2;

					// override
					if (laneDistOverride  && laneDistOverride[i0].level == itemData.children[i0].children[i1].level){
						_v2=laneDistOverride[i0].dist[i1].value/100;
					}

					_v2 = _v2+_v1;
					
					_dist1[i1]={"name":itemData.children[i0].children[i1].name,"value1":_v1,"value2":_v2};
					
				} //END LANE LEVEL
				c0.dist=_dist1;
			}
			
			var themeDistOverride;// = {"level":"theme","dist":[{"name":"topline","value":80},{"name":"enabling","value":20}]};				
			
			//checkDistributionOverride(distOverride);
			
			var _v1,_v2;

			if (i0==0) _v1 = 0;
			else _v1 = parseFloat(_dist0[parseInt(i0)-1].value2);
			
			_v2 = itemData.children[i0].children.length/_sum1;
			
			//override
			if (themeDistOverride  && themeDistOverride.level == itemData.children[i0].level){
				_v2=(themeDistOverride.dist[i0].value)/100;
			}
			//override end
			_v2 = _v2+_v1;
			
			_dist0[i0]={"name":itemData.children[i0].name,"value1":_v1,"value2":_v2};
			
	} //END LOOP itemData
	
	console.log("===== sum of all lanes below root ["+itemData.name+"]= "+_sum1);
				
	itemData.dist=_dist0;


	transposeDistribution();
}

/**
topline = 5 lanes
enabling = 2 lanes 
 
sum = 7 lanes 
topline = 5/7 => 71.4% 
enabling = 2/7 => 28.6%
=> distribution of root = [71.4,28.6]
*/





function printItemData(level){
console.log("print lanes:");
console.log("------------");

// (Math.floor(y/x) * x).toFixed(2)
	//themes
	for (var i0 in itemData.children){
		var _y01=((itemData.dist[i0].value1)*100).toFixed(2);
		var _y02=((itemData.dist[i0].value2).toFixed(4)*100).toFixed(2);
		
		if (level=="theme" ||!level) console.log("+ theme: "+itemData.children[i0].name+" [y1: "+_y01+" y2: "+_y02+"] height: "+(_y02-_y01).toFixed(2));
		//lanes
		for (var i1 in itemData.children[i0].children){
			var _y11=((itemData.children[i0].distTransposed[i1].value1).toFixed(4)*100).toFixed(2);
			var _y12=((itemData.children[i0].distTransposed[i1].value2).toFixed(4)*100).toFixed(2);
		
			if (level=="lane" ||!level) console.log("  + lane: "+itemData.children[i0].children[i1].name+" [y1: "+_y11+" y2: "+_y12+"] height: "+(_y12-_y11).toFixed(2));
			//sublanes
			for (var i2 in itemData.children[i0].children[i1].children){
				var _y21=((itemData.children[i0].children[i1].distTransposed[i2].value1).toFixed(4)*100).toFixed(2);
				var _y22=((itemData.children[i0].children[i1].distTransposed[i2].value2).toFixed(4)*100).toFixed(2);
		
				if (level =="sublane" ||!level)console.log("    + sublane: "+itemData.children[i0].children[i1].name+"."+itemData.children[i0].children[i1].children[i2].name+" [y1: "+_y21+" y2: "+_y22+"] height: "+(_y22-_y21).toFixed(2));
			}
		}
	}

}

/**not used yet ...
 */
function checkDistributionOverride(override){

	var _checksum = 0;
	for (var o in override.dist){
		
		console.log("+++++++++++++++++++ checksumming"+override.dist[o].value);
		
		_checksum = _checksum+override.dist[o].value;
	}
	
	if (_checksum !=100) return false;
	return true;
}


/**
 * and here comes another magic ;-)
 * we are transposing now 
 * taking upper distribution as 100% 
 * e.g. if we are in the root.topline lane (71%)
 * the 71% becomes the new 100% in this context
*/
function transposeDistribution(){
	// first level transpose
	for (var child in itemData.children){
		var c0 = itemData.children[child];
		var c0_base = itemData.dist[parseInt(child)].value2-itemData.dist[parseInt(child)].value1;

		if (c0.children){
			var _distTransposed =[]
			for (var i=0;i<c0.children.length;i++){
				c1 = c0.children[i];
						
				if (c1.children){
					var _v1 = itemData.dist[parseInt(child)].value1+(c0.dist[i].value1*c0_base);
					var _v2 = itemData.dist[parseInt(child)].value1+(c0.dist[i].value2*c0_base)
					console.log("_v1: "+_v1+" , "+"_v2: "+_v2);
					_distTransposed[i]={"name":c0.children[i].name,"value1":_v1 ,"value2":_v2};
					console.log("  * transposed - c0.dist["+i+"] ="+_distTransposed[i].value1);
				}
			}
			c0.distTransposed=_distTransposed;
		}
	}
	// second level transpose
	for (var child in itemData.children){
		var c0 = itemData.children[child];
		var c0_base = itemData.dist[parseInt(child)].value2-itemData.dist[parseInt(child)].value1;
	
		if (c0.children){
			for (var i=0;i<c0.children.length;i++){
				var c1_base = c0.dist[i].value2-c0.dist[i].value1;
				c1 = c0.children[i];
				var _distTransposed2 =[]
		
				for (var ii=0;ii<c1.children.length;ii++){
					if (c1.children){
	
					console.log("  * going to transpose ["+c1.children[ii].name+"].... 100% [c1_base] ="+c1_base+" for: "+c1.name);
					console.log("|  V1 "+(c0.distTransposed[parseInt(i)].value1+c1.dist[ii].value1*c1_base*c0_base));
					
					// have to multiply with c0_base AND c1_base 
					// 2-level transpose !!!!!
					
					var _v1 = c0.distTransposed[parseInt(i)].value1+c1.dist[ii].value1*c1_base*c0_base;
					var _v2 = c0.distTransposed[parseInt(i)].value1+c1.dist[ii].value2*c1_base*c0_base;
					console.log("_v1: "+_v1+" , "+"_v2: "+_v2);
					
					_distTransposed2[ii]={"name":c0.children[i].name+"."+c1.children[ii].name,"value1":_v1 ,"value2":_v2};
					}
				}
				c1.distTransposed =_distTransposed2;
			}
		}
	}
}

/**
calculates the offset to center elements / text per sublane 
*/
function getSublaneCenterOffset(lane){
	var _sublanes = laneMap[lane].length;
	
	var _height = (laneDistribution[getLane(lane)-1]-laneDistribution[getLane(lane)])/_sublanes;

	//console.log("# of sublanes for "+lane+": "+_sublanes+ " y = "+_y+ "height: "+_height);
	
	return _height/2;
}

/**
* helper method to get item from data array by ID
*/
function getItemByID(data,id){
	for (var _item=0; _item< data.length;_item++){
			if (data[_item].id == id){
				return _dependingItem=data[_item];
				break;
			}
	}
}


/**
* helper method to return index of lane and index of sublane
* based on string lane, string sublane
* ONLY USED IN mapLane() function
* 2014-01-02  refactored and made redundant
*/
/*
function getLaneSublane(_l, _sl) {
	//lookup
	var _position = getLane(_l);
	
	var _laneSublane = new Array();
	_laneSublane.push(_position);
	_laneSublane.push(laneMap[_l].indexOf(_sl));
	return _laneSublane;
}
* */

/**
* returns position / index of lane by name
*/

function getLane(_lane) {
	var i=1;
	var _position;
	for (var _key in laneMap){
		//console.log("key: "+_key+ " ");
		if (_key ==_lane) {
			_position =i;
			break;
		}
		i++;
	}
	return _position;
}

/** return array of lane names
*/
function getLanes(){
	var _lanes = new Array();
	
	for(_lane in laneMap) {
		_lanes.push(_lane);
	}
	return _lanes;
}



/** return object array of lane names + y1 and y2 values
*/
function getLanesNEW(){
	var _lanes = new Array();
	
	//ALL itemData.children.children
	for(_theme in itemData.children){
		for (_lane in itemData.children[_theme].children){
			_lanes.push({"lane":itemData.children[_theme].children[_lane].name,"y1":itemData.children[_theme].distTransposed[_lane].value1,"y2":itemData.children[_theme].distTransposed[_lane].value2});
		}
	}
	return _lanes;
}

function getLaneDistByNameNEW(lane){
	var _lanes = new Array();
	
	//ALL itemData.children.children
	for(_theme in itemData.children){
		for (_lane in itemData.children[_theme].children){
			if (itemData.children[_theme].children[_lane].name == lane)
				return {"lane":itemData.children[_theme].children[_lane].name,"y1":itemData.children[_theme].distTransposed[_lane].value1,"y2":itemData.children[_theme].distTransposed[_lane].value2};
		}
	}
	return null;
}



function getSublanesNEW(lane){
	var _sublanes = new Array();
	
	//ALL itemData.children.children
	for(_theme in itemData.children){
		for (_lane in itemData.children[_theme].children){
			
			if (lane == itemData.children[_theme].children[_lane].name){
				_sublanes = itemData.children[_theme].children[_lane].distTransposed;
			}
			
		}
	}
	return _sublanes;
}


/**NEW
 */
function getLanesFQ(){
	var _lanes = new Array();
	
	//ALL itemData.children.children
	for(_theme in itemData.children){
		for (_lane in itemData.children[_theme].children){
			_lanes.push(itemData.children[_theme].name+"."+itemData.children[_theme].children[_lane].name);
		}
	}
	return _lanes;
}

/**NEW
 */
function getSubLanesFQ(){
	var _sublanes = new Array();
	
	//ALL itemData.children.children
	for(_theme in itemData.children){
		for (_lane in itemData.children[_theme].children){
			for (_sublane in itemData.children[_theme].children[_lane].children){
				_sublanes.push(itemData.children[_theme].name+"."+itemData.children[_theme].children[_lane].name+"."+itemData.children[_theme].children[_lane].children[_sublane].name);
			}
		}
	}
	return _sublanes;
}

/**NEW
 */ 
function getThemes(){
	var _themes = new Array();
	
	//ALL itemData.children.children
	for(_theme in itemData.children){
		_themes.push(itemData.children[_theme].name);
	}
	return _themes;
}


/**
 *
 * what would be awesome is 
 * getDistByName("bwin") => returns ("name":bwin,"y1":<from>,"y2":<to>)
 */
function getDistByName(name){
	
	
}




/**  do some calculation - metrics about number and capacity of items 
* writes currently in global vars ;-) => should be refactored into some array ...
**/
function calculateQueueMetrics(){
	var _d;
	
	SIZING_TOTAL=0;
	SIZING_DONE=0;
	SIZING_FUTURE=0;
	SIZING_WIP=0;
	ITEMS_DELAYED=0;
	ITEMS_DONE=0;
	ITEMS_FUTURE=0;
	ITEMS_TOTAL=0;
	ITEMS_WIP=0;
	DAYS_DELAYED=0;
	
	var _item;
	
	for(_d in initiativeData)
	{	
		_item = initiativeData[_d];
		var _date = _item.actualDate;
		var _sizingPD = parseInt(_item.Swag);
		var _delay = diffDays(_item.planDate,_item.actualDate);
				
		ITEMS_TOTAL++;
		if (!isNaN(_sizingPD)) SIZING_TOTAL+=_sizingPD;
		if (new Date(_date)<WIP_START){
			ITEMS_DONE++;
			if (!isNaN(_sizingPD)) SIZING_DONE+=_sizingPD;
		}
		else if(new Date(_date)>WIP_START && new Date(_date)<WIP_END) {
			ITEMS_WIP++;
 			if (!isNaN(_sizingPD)) SIZING_WIP+=_sizingPD;

		}
		else {
			ITEMS_FUTURE++;
			
			if (!isNaN(_sizingPD)) SIZING_FUTURE+=_sizingPD;

		}
		
		//calculate delays
		if (_delay>0){
			ITEMS_DELAYED++;
			DAYS_DELAYED = DAYS_DELAYED+_delay;
		}
		
	}
}
