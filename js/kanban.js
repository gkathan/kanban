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


	---------------------- power of css3 selectors
	* d3.selectAll("[id*=item]").style("visibility","hidden") (wildcard *= all "*item*")


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
var laneTextData;

var itemData;
// nest -level
var ITEMDATA_NEST = ["theme","lane","sublane"];
var ITEMDATA_DEPTH_LEVEL=ITEMDATA_NEST.length;


var pieData =[{"type":"sustainable","percentage":63.5},{"type":"notsustainable","percentage":26.5}];

/**
 * the values in the override mean % of space the lanes will get => has to sum to 100% 
 */
var itemDataConfig;
/**
 * "auto": takes the sum of subitems as basline and calculates the distribution accordingly - the more items the more space
 * "equal": takes the parent length of elements and calculates the equal distributed space (e.g. lane "bwin" has 4 sublanes => each sublane gets 1/4 (0.25) for its distribution
 * "override": takes specified values and overrides the distribution with those values => not implemented yet ;-)
 */

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

//domain for y-axis => i am using percentage as domain => meaning "100"%
var Y_MAX =100; 
var Y_MIN=0;

var METRIC_BASLINE = new Date("2013-12-31");
var METRIC_PROJECTION = new Date("2015-12-31");

// queue metrics
var ITEMS_DONE,ITEMS_WIP,ITEMS_FUTURE,ITEMS_TOTAL,ITEMS_DELAYED,DAYS_DELAYED;
	
var SIZING_DONE,SIZING_WIP,SIZING_FUTURE,SIZING_TOTAL;


var LANE_LABELBOX_WIDTH =100;

// scaling of graphical elements (itemblock,circle, circle icon)	
var ITEM_SCALE=0.8;

var x,y,svg,drag,drag_x;


var dataversions={};

var COLOR_BPTY="#174D75";
// size of white space around boxes
var WIDTH_WHITESTROKE ="5px";

/** main etry point
 * 
 */
function render(itemFile,metricFile,releaseFile,svgFile,laneTextFile){
	
	dataversions.itemFile=itemFile;
	dataversions.metricFile=metricFile;
	dataversions.releaseFile=releaseFile;
	dataversions.svgFile=svgFile;
	dataversions.laneTextFile=laneTextFile;


	d3.xml("data/"+svgFile, function(xml) {
		document.body.appendChild(document.importNode(xml.documentElement, true));
		
		if (laneTextFile) d3.tsv("data/"+laneTextFile,handleLaneText);
		
		d3.tsv("data/"+itemFile,handleInitiatives);
		//d3.json("data/initiatives_mysql.json",handleInitiatives);
		// working PHP json export 
		//d3.json("data/data.php?type=initiatives",handleInitiatives);
	
		if (metricFile)	d3.tsv("data/"+metricFile,handleMetrics);
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



function drawAll(){
	createLaneHierarchy();
	drawInitiatives();
	drawReleases();
	drawMetrics();
	drawVersion();
}



/** main entry from data load
*
*/
function handleInitiatives(data) {
	"use strict";
	initiativeData=data;

	createLaneHierarchy();

	drawInitiatives();
	drawVersion();
}

function handleLaneText(data) {
	"use strict";
	laneTextData=data;
}


/**

*/
function drawInitiatives(){
	init();
	initHandlers();
	
	
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
		// changed 20140104 => from [0,100]
		.domain([Y_MAX,Y_MIN])
		.range([height, 0]);

	x = d3.time.scale()
		.domain([KANBAN_START, KANBAN_END])
		.range([0, width]);

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
		.tickSize(0)
		.tickFormat("")
		//.tickValues(laneDistribution)
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
	/**
	 * this would be level-0 in a generic view
	 * in this concrete view this would be the "businessmodel=b2c gaming" umbrell box
	 * */
	_drawLaneContext(lanes,CONTEXT,-LANE_LABELBOX_WIDTH-200,0,LANE_LABELBOX_WIDTH/6,height,"treemap.html")
	
	
	var i=0;
	
	lanes.selectAll("#lane")
	// [changed 20140104]
	.data(getLanesNEW())
	.enter()
	// **************** grouped item + svg block + label text
	.append("g")
	.attr("id",function(d){return "lane_"+d.lane;})
	//.style("opacity",function(d){return d.accuracy/10})
	//.on("mouseover",animateScaleUp)
	.each(function(d){
		var _lane = d.name;
		// [changed 20140104]
		var _y = y(d.yt1);
		var _height = y(d.yt2-d.yt1);
		var _x_offset = 5;
		var _y_offset = 4;
		var _laneOpacity;

		//left box
		_drawLaneBox(d3.select(this),-LANE_LABELBOX_WIDTH,_y,LANE_LABELBOX_WIDTH,_height,_lane);

		//baseline box text
		drawLaneText(lanes,_lane,"baseline");
	
		
		// lane area
		_drawLaneArea(d3.select(this),x(KANBAN_START),_y,x(KANBAN_END),_height,i)

		//target box	
		_drawLaneBox(d3.select(this),x(KANBAN_END),_y,LANE_LABELBOX_WIDTH,_height,_lane);
		
		//target box text
		drawLaneText(lanes,_lane,"target");
	

		// laneside descriptors
		_drawLaneSideText(d3.select(this),_lane,-LANE_LABELBOX_WIDTH-2,_y+3,"6px","start");

		//sublane descriptors
		var _sublanes = getSublanesNEW(_lane);
		for (var s in _sublanes){
			var _y = y(_sublanes[s].yt1);
			var _h = y(_sublanes[s].yt2-_sublanes[s].yt1); 
			
			// strip only the sublane name if name is fully qualified like "topline.bwin.touch"
			var _sublane = _.last((_sublanes[s].name).split("."))
			
			_drawLaneSideText(d3.select(this),_sublane,1,_y+_h/2,"5px","middle");

			//no lines for first and last sublane
			if (s>0 && s<_sublanes.length){
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
		// HAHAAAA :-)) [20140104] did it !!!!
		for (t in getThemesNEW()){
			var _t = y(getThemesNEW()[t].y2);
			
			// no demarcation line in the end ;-)
			if (t<=getThemesNEW.length){
				d3.select(this).append("line")
				.attr("x1", x(KANBAN_START)-LANE_LABELBOX_WIDTH-200)
				.attr("y1", _t)
				.attr("x2", x(KANBAN_END)+LANE_LABELBOX_WIDTH+200)
				.attr("y2", _t)
				.attr("class", "themeLine");

				//_drawLaneSideText(d3.select(this),getThemesNEW()[t].name,-LANE_LABELBOX_WIDTH-10,_t,"5px","middle");
			}
		}
		i++;
	});
}


function drawLaneText(svg,lane,side)
{
	var i=0;
	
	var _color = "black";
	if (lane == "root.topline.bwin" || lane=="root.topline.premium") _color="white";
	
	var _yBase = y((getLaneByNameNEW(lane).yt1))+35;
	
	var _xBase;
	if (side=="baseline") _xBase= -LANE_LABELBOX_WIDTH+10
	else if (side=="target") _xBase= x(KANBAN_END)+10;
	
	console.log("*****drawLaneText(): svg="+svg);
	
	if (laneTextData){
		svg.selectAll("#laneText")
		// [changed 20140104]
		.data(laneTextData.filter(function(d){return (d.lane==lane && d.side==side)}))
		.enter()
		// **************** grouped item + svg block + label text
		.append("g")
		.attr("id",function(d){return "text_"+d.lane;})
		//.style("opacity",function(d){return d.accuracy/10})
		//.on("mouseover",animateScaleUp)
		.each(function(d){
			svg.append("text")
			.text(d.text)
			.attr("x",_xBase)
			.attr("y",_yBase+(i*(parseInt(d.size)+1)))
			.style("font-size",d.size+"px")
			.style("font-weight",d.format)
			.style("fill",_color);

			i++;
		})
	}

}


/* ------------------------------------------------- drawLanes() helper functions ----------------------------------------------------------- */
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
				.on("click",function(d){window.location.href=link;})
			.attr("class","contextbox");
		}

		/**
		 */
		function _drawLaneBox(svg,x,y,width,height,lane){
			var _x_offset=10;
			var _y_offset=4;
			// if it comes in FQ format 
			lane = _.last(lane.split("."));

			svg.append("rect")
			.attr("x",x)
			.attr("y",y)
			.attr("width",width)
			.attr("height",height)
			.style("cursor","pointer")		
			.style("stroke","white")
			.style("stroke-width",WIDTH_WHITESTROKE)
			.attr("class","lanebox "+lane)
				.on("click",function(d){window.location.href="kanban_"+lane+".html";});
			//logo
			svg.append("use")
			.attr("xlink:href","#"+lane)
			.attr("x",x+_x_offset)
			.attr("y",y+_y_offset);
		}
		
		function _drawLaneArea(svg,x,y,width,height,i){
			if (i%2 ==0) _laneOpacity=0.22;
			else _laneOpacity=0.12;

			svg.append("rect")
			.attr("x",x)
			.attr("y",y)
			.attr("width",width)
			.attr("height",height)
			.style("fill","url(#gradientGrey)")
			.style("stroke","white")
			.style("stroke-width",WIDTH_WHITESTROKE)
			.style("opacity",_laneOpacity);
		}

		/**
		 */
		function _drawLaneSideText(svg,text,x,y,size,anchor){
				svg.append("text")
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
/* ------------------------------------------------- END drawLanes() helper functions ----------------------------------------------------------- */


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



/* ------------------------------------------------- drawQueues() helper functions ----------------------------------------------------------- */
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
				.text(date.toString("d-MMM-yyyy"))
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

/* ------------------------------------------------- END drawQueues() helper functions ----------------------------------------------------------- */


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
		var _size = d.size*ITEM_SCALE;
		
		var _itemXPlanned = x(new Date(d.planDate));
		var _itemXActual = x(new Date(d.actualDate));
		var _itemXStart = x(new Date(d.startDate));
		var _yOffset = getSublaneCenterOffset("root."+d.theme+"."+d.lane+"."+d.sublane);
		
		//d.sublaneOffset = override for positioning of otherwise colliding elements => manual !
		var _itemY = y(getSublaneByNameNEW("root."+d.theme+"."+d.lane+"."+d.sublane).yt1-_yOffset)+getInt(d.sublaneOffset);
		
		
		// ------------  postits --------------
		if(d.state=="todo")
		{
			var postit_x_offset = -2*_size+2;
			var postit_y_offset = -1.5*_size;
		
			var postit_x =_itemXPlanned+postit_x_offset;
			var postit_y =_itemY+postit_y_offset;
			
			var _rmax=5,
				_rmin=-5;						;
			
			var _rotate = Math.floor(Math.random() * (_rmax - _rmin + 1) + _rmin);
			var _scale = _size/8;
			
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
			.style("font-size",(3+_size/6)+"px")
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
					var _size = d.size*ITEM_SCALE;
					
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
					
					var _yOffset = getSublaneCenterOffset("root."+d.theme+"."+d.lane+"."+d.sublane);
					
					//d.sublaneOffset = override for positioning of otherwise colliding elements => manual !
					
					var _itemY = y(getSublaneByNameNEW("root."+d.theme+"."+d.lane+"."+d.sublane).yt1-_yOffset)+getInt(d.sublaneOffset);

					
					// ------------  line if delayed  before plan--------------
					if (d.actualDate>d.planDate) _drawItemDelayLine(d3.select(this),_itemXPlanned,(_itemX-_size-(_size/2)),_itemY);
					
					// ------------  line if before plan--------------
					else if (d.actualDate<d.planDate) _drawItemDelayLine(d3.select(this),_itemX,(_itemXPlanned-_size-(_size/2)),_itemY);
					
					
					d3.select(this)
						.style("opacity",d.accuracy/10);
					
					// ------------  circles --------------
					if (d.Type !=="target"){

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
						console.log("################################ id:"+d.id+" "+_itemXPlanned);
						
						d3.select(this)
							.append("use").attr("xlink:href","#icon_"+d.theme+"."+d.lane+"."+d.sublane)
							.attr("transform","translate("+(_itemX-(1.2*_size/2))+","+(_itemY-(1.2*_size/2))+") scale("+_size/10+") ");
					} //end if d.Type!="target"

					
					// ------------  item blocks --------------
					d3.select(this)
						.append("use").attr("xlink:href",function(d){console.log("------------------------------------------ ITEMBLOCK: "+d.Title+" d.type="+d.Type);return "#"+d.Type})
						.attr("transform","translate("+(_itemXPlanned-(1.2*_size))+","+(_itemY-(1.2*_size))+") scale("+_size/10+") ");

					
					// transparent circle on top for the event listener
					d3.select(this)
						.append("circle")
							.attr("id","item_circle_"+d.id)
							.attr("cx",_itemX)
							.attr("cy",_itemY)
							.attr("r",_size)
							.style("opacity",0)
							.on("mouseover", function(d){
								console.log("****in circle: mouseOver: "+d.id);
								d3.select("#item_circle_"+d.id)
								.transition().delay(0).duration(500)
								.attr("r", _size*2)
								.style("cursor","pointer");
								onTooltipOverHandler(d,tooltip,"#item_");
								}) 
								
							.on("mousemove", function(d){onTooltipMoveHandler(tooltip);})
								
							.on("mouseout", function(d){
								d3.select("#item_circle_"+d.id)
								.transition().delay(0).duration(500)
								.attr("r", _size);
									//.transition().delay(0).duration(500)
								onTooltipOutHandler(d,tooltip,"#item_");})
															
					
					// ------------  item names --------------
					d3.select(this)
					   .append("text")
					   .text(d.Title)
					   .attr("font-size",(5+(_size/5))+"px")
					   .attr("text-anchor","middle")
					   .style("font-weight","bold")
					   //.style("kerning",-0.5)
					   //.style("letter-spacing",-.2)
					   //google font
					   .style("font-family","Open Sans Condensed,arial, sans-serif")
					   .style("fill",function(d){if (d.Type=="target" || (d.actualDate>d.planDate && d.state!="done")) return "red"; else return"black";})
					   .attr("x",_itemXPlanned)
					   .attr("y",(_itemY)+ parseInt(_size)+(6+(_size/5)));
					
					
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
							var _toY = y(getSublaneByNameNEW("root."+_dependingItem.theme+"."+_dependingItem.lane+"."+_dependingItem.sublane).yt1-_yOffset)+getInt(_dependingItem.sublaneOffset);
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
						_drawStartDateIndicator(dep,_itemXStart,_itemXPlanned,_itemY,_size);
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
					return "ID: "+d.id+" name: "+d.Title + " lane (main/sub): " + d.lane+"/"+d.sublane+" plaDdate: "+d.planDate + " scaleX = "+x(new Date(d.planDate))+" state: "+d.state+" size: "+d.size+" sizingPD: "+parseInt(d.Swag);
				});
			d3.selectAll("li")
				.style("font-size","6px")
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
	
	var _htmlBase ="<table><col width=\"35\"/><col width=\"80\"/><tr><td colspan=\"2\" style=\"font-size:6px;text-align:right\">[id: "+d.id+"] "+d.ExtId+"</td></tr><tr class=\"header\" style=\"height:5px\"/><td colspan=\"2\"><div class=\"indicator\" style=\"background-color:"+_indicator+"\">&nbsp;</div><b style=\"padding-left:5px;font-size:9px\">"+d.Title +"</b></td</tr>"+(d.Title2 ? "<tr><td class=\"small\">title2:</td><td  style=\"font-weight:bold\">"+d.Title2+"</td></tr>" :"")+"<tr><td  class=\"small\"style=\"width:30%\">lane:</td><td><b>"+d.lane+"."+d.sublane+"</b></td></tr><tr><td class=\"small\">owner:</td><td><b>"+d.productOwner+"</b></td></tr><tr><td class=\"small\">Swag:</td><td><b>"+d.Swag+" PD</b></td></tr><tr><td class=\"small\">started:</td><td><b>"+d.startDate+"</b></td></tr><tr><td class=\"small\">planned:</td><td><b>"+d.planDate+"</b></td><tr><td class=\"small\">status:</td><td class=\"bold\">"+d.state+"</td></tr>";

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
		
		var _l = getLanesNEW()[i];
		var _y = y(_l.yt1);
		var _height = y(_l.yt2-_l.yt1);
		
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


	//_drawMetricBlock(gMetrics,"baseline","secondary",0);


//---------------------------- secondary ---------------------------------
	gMetrics.append("g").attr("id","secondary").append("g").attr("id","baseline")
	.selectAll("secondary_baseline")
	.data(metricData.filter(function(d){return d.class=="secondary" && new Date(d.date) <= METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return "2metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		
		var _l = getLanesNEW()[i];
		var _y = y(_l.yt1);
		var _height = y(_l.yt2-_l.yt1);
		
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
		
		var _l = getLanesNEW()[i];
		var _y = y(_l.yt1);
		var _height = y(_l.yt2-_l.yt1);
		
		//tertiary metrics
		var _tertTextYOffset = (_height/2)+20;
	
		_drawTextMetric(d3.select(this),d,"metricSmall",x(KANBAN_START)-_tertiaryXOffset,_y+_tertTextYOffset,6);
		
		i++;
	});


	
	// calculated sum
	
	//[TODO] build a proper class structure = this would be a TextMetric m = new TextMetric(...)
	var _total = {"number":_baselinePrimarySum ,"scale":"mio EUR" ,"type":"NGR", "sustainable":1 };
	_drawTextMetric(gMetrics.select("#baseline"),_total,"metricBig",x(KANBAN_START)-_primaryXOffset,-35,10);
	

	//pie baseline
	var pieBaselineData =[{"type":"sustainable","percentage":65},{"type":"notsustainable","percentage":35}];
	var _primaryXOffsetPie = LANE_LABELBOX_WIDTH +130;
	var _yPie = -80;
	_drawPie(gMetrics,"baseline",pieBaselineData,x(KANBAN_START)-_primaryXOffsetPie,_yPie);

	
	//market share
	var _share = {"number":8 ,"scale":"marketshare" ,"type":"%", "sustainable":1 };
	_drawTextMetric(gMetrics.select("#baseline"),_share,"metricBig",x(KANBAN_START)-_primaryXOffset,-120,10);
	
	
	
	// -------------------------- target -------------------------------
	i=0;
	
	gMetrics.select("#primary").append("g").attr("id","target").selectAll("primary_future")
	.data(metricData.filter(function(d){return d.class=="primary" && new Date(d.date) >= METRIC_PROJECTION}))
	.enter()
	.append("g")
	.attr("id",function(d){return "1metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		
		var _l = getLanesNEW()[i];
		var _y = y(_l.yt1);
		var _height = y(_l.yt2-_l.yt1);
		
		//primary metrics
		var _primTextYOffset = _height/2;

		// 100 is the height of the brackets svg
		var _bracketHeight = 100;
		
		
		if (d.sustainable==1) _targetPrimarySum = _targetPrimarySum+parseInt(d.number);
		
		_drawBracket(d3.select(this),d,"right",(x(KANBAN_END)+_bracketXOffset),_y,(_height/_bracketHeight));
		
		_drawTextMetric(d3.select(this),d,"metricBig",x(KANBAN_END)+_primaryXOffset,_y+_primTextYOffset,10);

		i++;
	});
	
	
	
	i=0;

//---------------------------- secondary ---------------------------------
	gMetrics.select("#secondary").append("g").attr("id","secondary").append("g").attr("id","target")
	.selectAll("secondary_baseline")
	.data(metricData.filter(function(d){return d.class=="secondary" && new Date(d.date) > METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return "2metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		
		var _l = getLanesNEW()[i];
		var _y = y(_l.yt1);
		var _height = y(_l.yt2-_l.yt1);
		
		//secondary metrics
		var _primTextYOffset = _height/2;
		
		_drawTextMetric(d3.select(this),d,"metricSmall",x(KANBAN_END)+_secondaryXOffset,_y+_primTextYOffset,6);

		i++;
	});

	i=0;
//---------------------------- tertiary ---------------------------------
	gMetrics.select("#tertiary").append("g").attr("id","tertiary").append("g").attr("id","target")
	.selectAll("tertiary_target")
	.data(metricData.filter(function(d){return d.class=="tertiary" && new Date(d.date) > METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return "3metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		
		var _l = getLanesNEW()[i];
		var _y = y(_l.yt1);
		var _height = y(_l.yt2-_l.yt1);
		
		//tertiary metrics
		var _tertTextYOffset = (_height/2)+20;
	
		_drawTextMetric(d3.select(this),d,"metricSmall",x(KANBAN_END)+_tertiaryXOffset,_y+_tertTextYOffset,6);
		
		i++;
	});


	// calculated sum
	_total.number=_targetPrimarySum;
	_drawTextMetric(gMetrics.select("#target"),_total,"metricBig",x(KANBAN_END)+_primaryXOffset,-37,10);


	//pie target
	var pieTargetData =[{"type":"sustainable","percentage":75},{"type":"notsustainable","percentage":25}];
	_drawPie(gMetrics,"target",pieTargetData,x(KANBAN_END)+_primaryXOffsetPie,_yPie);



	
	//market share
	var _share = {"number":9 ,"scale":"marketshare" ,"type":"%", "sustainable":1 };
	_drawTextMetric(gMetrics.select("#baseline"),_share,"metricBig",x(KANBAN_END)+_primaryXOffset,-118,10);
	
	
/* ----------------------------------------- risks ------------------------------------------------ */
 	var _yRisk = y(getLaneByNameNEW("root.topline.foxy").yt2)-30;
 	var _xRisk = x(KANBAN_END)+LANE_LABELBOX_WIDTH+200;
 	
 	_drawRisks(gMetrics,0,_xRisk,_yRisk);
	
 	var _risk1 = {"number":-55 ,"scale":"mio EUR" ,"type":"germany", "sustainable":-1 };
 	var _risk2 = {"number":-18 ,"scale":"mio EUR" ,"type":"nj", "sustainable":-1 };
 	var _risk3 = {"number":-25 ,"scale":"mio EUR" ,"type":"mobile", "sustainable":-1 };
	
 	_drawTextMetric(gMetrics.select("#target"),_risk1,"metricBig",_xRisk+25,_yRisk+65,10);
 	_drawTextMetric(gMetrics.select("#target"),_risk2,"metricBig",_xRisk+25,_yRisk+85,10);
 	_drawTextMetric(gMetrics.select("#target"),_risk3,"metricBig",_xRisk+25,_yRisk+105,10);
 	
	
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
				})
				.style("font-size","6px");
			
} //end drawMetrics

function _drawRisks(svg,metric,x,y){
		
		svg.append("use").attr("xlink:href","#risks")
		.attr("transform","translate ("+x+","+y+") scale(1)");
		
		
	
}



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
		
		svg.append("use").attr("xlink:href","#icon_bracket_"+direction+_bracketType)
		.style("opacity",0.15)
		.attr("transform","translate ("+x+","+y+") scale(1,"+scaleY+")");
	
		
}

/**
 */
function _drawTextMetric(svg,metric,css,x,y,space){
		var _metricColor;
		if (metric.sustainable==1) _metricColor="174D75";
		//risks
		else if (metric.sustainable==-1) _metricColor="ED1C24";
		
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



/**
 * class: <baseline> or <target>
 * type: <primary>, <secondary> or <tertiary>
 */
/* _drawMetricBlock TRY
function _drawMetricBlock(svg,side,type,yTextOffset){
	
	var _bracket; 
	var _style;
	
	if (side=="baseline") _bracket ="left";
	else if (side=="target") _bracket ="right";
	
	if (type=="primary") _style="metricBig";
	else _style="metricSmall";
	
	
	
	svg.append("g").attr("id",type).append("g").attr("id",side)
	.selectAll(type+"_baseline")
	.data(metricData.filter(function(d){return d.class==type && new Date(d.date) <= METRIC_BASLINE}))
	.enter()
	.append("g")
	.attr("id",function(d){return type+"_metric_"+d.id;})
	.each(function(d){
		var _lane = d.lane;
		
		var _l = getLanesNEW()[i];
		var _y = y(_l.y1);
		var _height = y(_l.y2-_l.y1);
		
		//primary metrics
		var _primTextYOffset = (_height/2)+yTextOffset;

		_drawTextMetric(d3.select(this),d,_style,x(KANBAN_START)-_primaryXOffset,_y+_primTextYOffset,10);


		i++;
	});
}
*/


/** helper function
 * */
function _drawPie(svg,id,data,x,y){


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


function drawVersion(){
	d3.select("#releases").remove()
	console.log("####removed #version");

	
	var _line =7;
	var _offset =28;
	var _y = height-18;
	
	var t;

	var gVersion= svg.append("g")
		.attr("id","version");
	
	gVersion.append("use").attr("xlink:href","#bpty")
	.attr("transform","translate ("+(WIDTH-137)+","+(_y+5)+") scale(0.40) ");
	
	_drawLegendLine(svg,WIDTH-200,WIDTH-42,_y+20);
		
	//title
	//_drawText(gVersion,"strategic portfolio kanban board",WIDTH-42,(_y-(_offset-9)),9,"bold","end");


	var i=0;

	t = [	{"name":"context: ","value": CONTEXT},
			{"name":"URL: ","value": document.URL},
			{"name":"version: ","value": new Date().toString('yyyy-MM-dd_hh:mm:ss')},
			{"name":"package: ","value":PACKAGE_VERSION},
			{"name":"author: ","value":"@cactus | twitter.com/gkathan"}
			
		];

	for (var j in t){ 
		_drawVersionText(gVersion,t[j],WIDTH-140,(_y+_offset+(j*_line)),6);
		i++;
	}
/*	
	for (var _version in dataversions){
		_drawText(gVersion,_version+": "+dataversions[_version],WIDTH-136,(_y-_offset-(i*_line)),5,"normal","start");
		i++;
	}
	
	_drawLegendLine(svg,WIDTH-200,WIDTH-42,(_y-_offset-(i*_line)+2));
*/		
	
	//bottom disclaimer
	i++;

	_drawLegendLine(svg,WIDTH-200,WIDTH-42,height+43);
	
	_drawText(gVersion,"* auto-generated D3 svg | batik png pdf transcoded",WIDTH-42,height+48,5,"normal","end");
	
}

/**
 */
function _drawVersionText(svg,text,x,y,size){
	
	_drawText(svg,text.name,x-15,y,size-1,"normal","end");
	_drawText(svg,text.value,x+3,y,size,"normal","start");
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
	.attr("x",x)
	.attr("y",y);
	
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
if (!d3.selectAll("#metrics,#queues,#lanes").attr("filter")) d3.selectAll("#metrics,#queues,#lanes").attr("filter", "url(#blur)");
else d3.selectAll("#metrics,#queues,#lanes").attr("filter", "");

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


/** config (former override)
 * */
function getConfigModeByDepth(depth){
	for (var i in itemDataConfig){
		if (itemDataConfig[i].depth==depth) return itemDataConfig[i].mode;
	}
	return null;
}

function getConfigByName(name){
	for (var i in itemDataConfig){
		for (p in itemDataConfig[i].percentages){
			if (itemDataConfig[i].percentages[p].name==name) return itemDataConfig[i].percentages[p].value;
		}
	}
	return null;
}


/**
 * create hierarchical data structure from flat import table
 */
function createLaneHierarchy(){
	// create hierarchical base data from list
	
	itemData = _.nest(initiativeData,ITEMDATA_NEST);
	
	//depth = ITEMDATA_DEPTH_LEVEL
	createRelativeCoordinates(itemData,0,ITEMDATA_DEPTH_LEVEL);
	
	transposeCoordinates();
}




/** recursive traversion to enrich the itemData structure with y coordinates
 * y1,y2 = local relative distribution per depth level
 */
function createRelativeCoordinates(_itemData,_start,_stop){
	// root
	if (_start==0){
		_itemData.y1 = Y_MIN;
		_itemData.y2 = Y_MAX;
		_itemData.name="root";
		_itemData.depth=0;
	}
	
	if (_itemData.children){
		_start++;

		//calculate sum of all children
			var _sum=0;
			for (var i in _itemData.children){
				_sum=_sum+_itemData.children[i].children.length;
			}
			_itemData.childsum=_sum;
		//calculate sum end
		
		for (i in _itemData.children){
			_itemData.children[i].depth=_start;
			_itemData.children[i].name=_itemData.name+"."+_itemData.children[i].name;

			if (_itemData.children[i].children && _stop >_start){
				//recurse deeper
				createRelativeCoordinates(_itemData.children[i],_start,_stop);
			}
			else {
				console.log("end of recursion");
			}
			// calculate coordinates
			var _y1,_y2;
			if (i==0) {
				_y1 = 0;
			}
			else {
				_y1 = parseFloat(_itemData.children[parseInt(i-1)].y2);
			}	
			
			//default mode ="auto"
			_y2 = itemData.y2*(_itemData.children[i].children.length/_itemData.childsum);

			//check if mode is set to "equal"
			if (getConfigModeByDepth(_itemData.children[i].depth)=="equal"){
				_y2 = itemData.y2/_itemData.children.length;
			}
			
			// check manual percentage override
			var _config = getConfigByName(_itemData.children[i].name);
			if (_config){
				console.log("config for: "+_itemData.children[i].name+" :"+_config);
				_y2= _config;
			}
			// end override check 
						
			_y2 = _y2+_y1;
			
			_itemData.children[i].y1=_y1;
			_itemData.children[i].y2=_y2;
		}
		// after loop stuff
	}
	else{
		//console.log("....no more children found..");
	}
}
	

/** prints current lane config
 */
function traversePrint(_itemData,_start,_stop){
	
	console.log("level: "+_itemData.depth+" "+_itemData.name+" coordinates [y1,y2]: "+_itemData.y1+","+_itemData.y2+ " -- coordinates transposed [yt1,yt2]: "+_itemData.yt1+","+_itemData.yt2);
	
	if (_itemData.children){
		_start++;
		for (i in _itemData.children){
			
			// do in-level stuff 
			
			if (_itemData.children[i].children && _stop >=_start){
				//console.log(" recurse deeper...");
				traversePrint(_itemData.children[i],_start,_stop);
			}
			else {
				// do whtever needs to be don on the stop-level
				//console.log("...end of recursion");
			}
		}
		// after loop stuff
	}
	else{
		//console.log("....no more children found..");
	}
}

/**
 * prints current setup of lanes to console
 */
function printItemData(depth){
	console.log("itemdata:");
	console.log("---------");

	//themes
	for (var i0 in itemData.children){
		var _y01=(itemData.children[i0].y1).toFixed(2);
		var _y02=(itemData.children[i0].y2).toFixed(2);
		
		if (depth==1 ||!depth) console.log("+ theme: "+itemData.children[i0].name+" [yt1: "+_y01+" yt2: "+_y02+"] height: "+(_y02-_y01).toFixed(2));
		//lanes
		for (var i1 in itemData.children[i0].children){
			var _y11=(itemData.children[i0].children[i1].yt1).toFixed(2);
			var _y12=(itemData.children[i0].children[i1].yt2).toFixed(2);
			var _p1 = (itemData.children[i0].children[i1].y2-itemData.children[i0].children[i1].y1).toFixed(2);
		
			if (depth==2 ||!depth) console.log("    + lane: "+itemData.children[i0].children[i1].name+" [yt1: "+_y11+" yt2: "+_y12+"] height: "+(_y12-_y11).toFixed(2)+" ("+_p1+"%)");
			//sublanes
			for (var i2 in itemData.children[i0].children[i1].children){
				var _y21=(itemData.children[i0].children[i1].children[i2].yt1).toFixed(2);
				var _y22=(itemData.children[i0].children[i1].children[i2].yt2).toFixed(2);
				var _p2 = (itemData.children[i0].children[i1].children[i2].y2-itemData.children[i0].children[i1].children[i2].y1).toFixed(2);
		
				if (depth ==3 ||!depth)console.log("       + sublane: "+itemData.children[i0].children[i1].children[i2].name+" [yt1: "+_y21+" yt2: "+_y22+"] height: "+(_y22-_y21).toFixed(2)+" ("+_p2+"%)");
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
function transposeCoordinates(){
	
	for (count=1;count<=ITEMDATA_DEPTH_LEVEL;count++){
		console.log("i: "+count);
		createAbsoluteCoordinates(itemData,0,count,1);
	}
}


/** yt1,yt2 = transposed absolute y coordinates
*/
function createAbsoluteCoordinates(_itemData,_start,_stop,base){
	//zero-level
	if (_start==0){
		_itemData.yt1 = _itemData.y1;
		_itemData.yt2 = _itemData.y2;
	}
	console.log("enter depth: "+_start);
	if (_itemData.children){
		var _base = base*((_itemData.y2-_itemData.y1)/itemData.y2);
		
		_start++;
		for (i in _itemData.children){
			
			if (_itemData.children[i].children && _stop >_start){
				//recursion
				createAbsoluteCoordinates(_itemData.children[i],_start,_stop,_base);
			}
			else {
				console.log("depth: "+_start+" STOP level");
				_itemData.children[i].yt1 = _itemData.yt1+(_itemData.children[i].y1*_base);
				_itemData.children[i].yt2 = _itemData.yt1+(_itemData.children[i].y2*_base);
				
			}
		}
	}
	else{
		console.log("....no more children found..");
	}
}

/* DELETE
function transposeCoordinates(){
      //depth=0
		itemData.yt1 = itemData.y1;
		itemData.yt2 = itemData.y2;

	
	var c1_base = 1;;
	
	//first level transpose ? (depth=1)
	for (var i in itemData.children){
		itemData.children[i].yt1 = itemData.y1+(itemData.children[i].y1*c1_base);
		itemData.children[i].yt2 = itemData.y1+(itemData.children[i].y2*c1_base);
	}		
	
	// second level transpose (depth=2)
	for (var i in itemData.children){
		var c2_base = (itemData.children[parseInt(i)].y2-itemData.children[parseInt(i)].y1)/itemData.y2;
		if (itemData.children[i]){
			var _yt1,_yt2;
			for (var j=0;j<itemData.children[i].children.length;j++){
				if (itemData.children[i].children[j].children){
					_yt1 = itemData.children[parseInt(i)].y1+(itemData.children[i].children[j].y1*c2_base);
					_yt2 = itemData.children[parseInt(i)].y1+(itemData.children[i].children[j].y2*c2_base)
					//console.log("_yt1: "+_yt1+" , "+"_yt2: "+_yt2);
				}
				itemData.children[i].children[j].yt1=_yt1;
				itemData.children[i].children[j].yt2=_yt2;
			}
		}
	}

	// third level transpose (depth=3)
	for (var i in itemData.children){
		var c2_base = (itemData.children[parseInt(i)].y2-itemData.children[parseInt(i)].y1)/itemData.y2;
		if (itemData.children[i]){
			for (var j=0;j<itemData.children[i].children.length;j++){
				var c3_base = (itemData.children[i].children[j].y2-itemData.children[i].children[j].y1)/itemData.y2;
				for (var ii=0;ii<itemData.children[i].children[j].children.length;ii++){
					if (itemData.children[i].children[j].children){
					//console.log("  * going to transpose ["+itemData.children[i].children[j].children[ii].name+"].... 100% [c3_base] ="+c3_base+" for: "+itemData.children[i].children[j].name);
					// have to multiply with c2_base AND c3_base 
					// 2-level transpose !!!!!
					var _yt1 = itemData.children[i].children[parseInt(j)].yt1+itemData.children[i].children[j].children[ii].y1*c3_base*c2_base;
					var _yt2 = itemData.children[i].children[parseInt(j)].yt1+itemData.children[i].children[j].children[ii].y2*c3_base*c2_base;
					//console.log("_yt1: "+_yt1+" , "+"_yt2: "+_yt2);
					}
					itemData.children[i].children[j].children[ii].yt1=_yt1;
					itemData.children[i].children[j].children[ii].yt2=_yt2;
				}
			}
		}
	}
	
}
*/

/**
calculates the offset to center elements / text per sublane 
*/
function getSublaneCenterOffset(sublane){
	var _sublane = getSublaneByNameNEW(sublane);
	var _height = _sublane.yt2-_sublane.yt1;
	return -(_height/2);
}

/**
* helper method to get item from object array by ID
*/
function getItemByID(data,id){
	for (var _item=0; _item< data.length;_item++){
			if (data[_item].id == id){
				return _dependingItem=data[_item];
				break;
			}
	}
}


/** return object array of lanes
*/
function getLanesNEW(){
	return getElementsByDepth(2);
}

/** returns lane object by name
 */
function getLaneByNameNEW(name){
	var _lanes = getLanesNEW();
	for (i in _lanes){
		if (_lanes[i].name==name) return _lanes[i];
	}
	return null;
}


function getSublanesNEW(lane){
	if (lane) 
		return getLaneByNameNEW(lane).children;
	else
		return getElementsByDepth(3);
}

function getSublaneByNameNEW(name){
	var _sublanes = getSublanesNEW();
	for (i in _sublanes){
		if (_sublanes[i].name==name) return _sublanes[i];
	}
	return null;
}

function getThemesNEW(){
	return getElementsByDepth(1);
}

function getElementsByDepth(depth){
	var _elements = new Array();
	traverse(itemData,0,depth,_elements);
	return _elements;
}


/** start=0, stop=1 should give me the 2 top elements in hierarchy 
 */
function traverse(_itemData,_start,_stop,_list){
	if (_itemData.children){
		_start++;
		for (i in _itemData.children){
			if (_itemData.children[i].children && _stop >_start){
				traverse(_itemData.children[i],_start,_stop,_list);
			}
			else {
				// do whtever needs to be don on the stop-level
				// as an example just return the elements
				_list.push(_itemData.children[i]);
			}
		}
	}
	else{
		console.log("....no more children found..");
	}
}
	



function drawLineChart()
{
d3.select("#items").selectAll("g").filter(function(d){return (d.lane=="bwin") && new Date(d.planDate)<=TODAY ;}).attr("filter", "url(#blur)");

var parseDate = d3.time.format("%d-%b-%y").parse;

var _y1 = y(getLaneDistByNameNEW("root.topline.bwin").y1);
var _y2 = y(getLaneDistByNameNEW("root.topline.bwin").y2);


var _height = _y2-_y1;

console.log("height: bwin"+_height+" y1:"+_y1);

var x_line = d3.time.scale()
    .range([0, x(WIP_START)]);

var y_line = d3.scale.linear()
    .range([_height,_y1]);

var xLineAxis = d3.svg.axis()
    .scale(x_line)
    .tickFormat("")
    .tickSize(0)
    .orient("top");

var yLineAxis = d3.svg.axis()
    .scale(y_line)
    .orient("left");

var line = d3.svg.line()
    .x(function(d) { return x_line(d.date); })
    .y(function(d) { return y_line(d.NGR_bwin); });

var area = d3.svg.area()
    .x(function(d) { return x_line(d.date); })
    .y0(_height)
    .y1(function(d) { return y_line(d.NGR_bwin); });
    
    

var NGR_sum=360.0;

d3.tsv("data/linechart.tsv", function(error, data) {
  data.forEach(function(d) {
    d.date = parseDate(d.date);
    NGR_sum -=parseFloat(d.NGR_bwin);
    d.NGR_bwin =NGR_sum;
    
    console.log("date: "+d.date+" foreach"+NGR_sum+" d.NGR="+d.NGR_bwin);

  });


  x_line.domain(d3.extent(data, function(d) { return d.date; }));
  y_line.domain([0,400]);

svg.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);
  
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + _height + ")")
      .call(xLineAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yLineAxis)
    .append("text")
      .attr("transform", "translate (0,60) rotate(-90)")
      .attr("y",10)
      .style("text-anchor", "end")
      .style("fill", "black")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      
      
      .text("NGR (mio EUR)");

  svg.select("#version").append("path").attr("id","linechart")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);
});

console.log("NGR sum:"+NGR_sum);

}


/** Calculate the difference of two dates in total days
*/
function diffDays(d1, d2){
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
* helper methods
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
var PACKAGE_VERSION="20140105_1132";
var PACKAGE_VERSION="20140105_1225";
var PACKAGE_VERSION="20140107_1602";
