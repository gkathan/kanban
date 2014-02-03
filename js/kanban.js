/**
 * @version: 0.2
 * @author: Gerold Kathan (www.kathan.at)
 * @date: 2014-01-12
 * @copyright: 
 * @license: 
 * @website: www.kathan.at
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

var TITLE_TEXT = "\"let the world play for real\"";
var TITLE_SUBTEXT = "\"be the leader in regulated and to be regulated markets\"";


//the data as it is read on init
var initiativeData;
// depending on context we filter this data for every view
var filteredInitiativeData;

var metricData;
//current metric data is on 
var METRIC_LEVEL="lane";

var releaseData;
var laneTextData;
var postitData;

var itemData;

//top root parent of nested item hierarchy
var NEST_ROOT="root";
// nest -level
var ITEMDATA_NEST;

var ITEMDATA_FILTER;

//depth level 
// set in createLaneHierarchy()
var ITEMDATA_DEPTH_LEVEL;


// metric dates
var METRICDATES_DATA;


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

var margin = {top: 250, right: 320, bottom: 100, left: 300};
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

// equals 1377993600000 in ticks (date.getTime()
var KANBAN_START = new Date("2013-09-01");
// equals 1422662400000 in ticks
var KANBAN_END = new Date("2015-01-31");

// diff = 44.668.800.000
// 1 pixel (WIDTH = 1500) would be 29.779.200 units

//domain for y-axis => i am using percentage as domain => meaning "100"%
var Y_MAX =100; 
var Y_MIN=0;

// queue metrics
var ITEMS_DONE,ITEMS_WIP,ITEMS_FUTURE,ITEMS_TOTAL,ITEMS_DELAYED,DAYS_DELAYED;
	
var SIZING_DONE,SIZING_WIP,SIZING_FUTURE,SIZING_TOTAL;


var LANE_LABELBOX_LEFT_WIDTH =100;
var LANE_LABELBOX_RIGHT_WIDTH =100;


// scaling of graphical elements (itemblock,circle, circle icon)	
var ITEM_SCALE=0.8;
var ITEM_FONTSCALE=1.5;

// the relative scaling compared to ITEM 
// if set to 1 = TACTICS are in same SIZE than corp ITEMS
// if set to e.g. 0.5 TACTICS are half the size
var TACTIC_SCALE=0.9;


var POSTIT_SCALE=1;

var x,y,svg,drag,drag_x;


var dataversions={};

var COLOR_BPTY="#174D75";
// size of white space around boxes
var WIDTH_WHITESTROKE ="5px";


var TRANSCODE_URL;

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
			})	
			.on("dragend",function(d,i){
				console.log("dragend event: x="+d.x+", y="+d.y);
				console.log("context: this= "+this);
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

/** main etry point
 * 
 */
function render(svgFile,laneTextTable,initiativeTable,metricsTable,releaseTable,postitTable){
	d3.xml("data/"+svgFile, function(xml) {
		document.body.appendChild(document.importNode(xml.documentElement, true));
	
		$.when($.getJSON("/data/data.php?type="+laneTextTable),
				$.getJSON("/data/data.php?type="+initiativeTable),
				$.getJSON("/data/data.php?type="+metricsTable),
				$.getJSON("/data/data.php?type="+releaseTable),
				$.getJSON("/data/data.php?type="+postitTable))
			.done(function(lanetext,initiatives,metrics,releases,postits){
					if (lanetext[1]=="success") laneTextData=lanetext[0];
					else throw new Exception("error loading lanetext");
					if (initiatives[1]=="success") initiativeData=initiatives[0];
					else throw new Exception("error loading initiatives");
					if (metrics[1]=="success") metricData=metrics[0];
					else throw new Exception("error loading metrics");
					if (releases[1]=="success") releaseData=releases[0];
					else throw new Exception("error loading releases");
					if (postits[1]=="success") postitData=postits[0];
					else throw new Exception("error loading postits");
					
					renderB2CGaming();
					//renderHolding();
				});
	}); // end xml load anonymous 
}


function renderB2CGaming() {
	HEIGHT=1100;
	WIDTH=1500;
	ITEM_SCALE=0.8;
	LANE_LABELBOX_RIGHT_WIDTH =200;
	
	ITEMDATA_NEST= ["theme","lane","sublane"];
	ITEMDATA_FILTER = {"name":"bm", "operator":"==", "value":"b2c gaming"};
	CONTEXT=ITEMDATA_FILTER.value;
    loadPostits();

	$.when($.getJSON("/data/data.php?type=initiatives"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					drawCustomPostits();
					initHandlers();
					
				});
}

function renderBwin(){
	HEIGHT=600;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	
	ITEM_SCALE=1.3;
	ITEMDATA_NEST= ["lane","sublane"];
	ITEMDATA_FILTER = {"name":"lane", "operator":"==", "value":"bwin"};
	CONTEXT=ITEMDATA_FILTER.value;

	$.when($.getJSON("/data/data.php?type=initiatives"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					
					initHandlers();
				});
}

function renderBwinSecondLevel(){
	HEIGHT=800;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	
	ITEM_SCALE=0.5;
	ITEM_FONTSCALE=0.75;
	ITEMDATA_NEST= ["themesl","sublane"];
	//ITEMDATA_NEST= ["isCorporate","themesl","sublane"];
	//ITEMDATA_NEST= ["themesl","lane","sublane"];
	//ITEMDATA_NEST= ["lane","sublane"];
	//ITEMDATA_NEST= ["theme","themesl","sublane"];
	ITEMDATA_FILTER = {"name":"lane", "operator":"==", "value":"bwin"};
	CONTEXT=ITEMDATA_FILTER.value+".drill-in";
	
	console.log("*************************************************************************************calling getJSON..");
	
	$.when($.getJSON("/data/data.php?type=initiatives_sports"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}


function renderEntIT(){
	HEIGHT=600;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	
	ITEM_SCALE=0.5;
	ITEM_FONTSCALE=0.75;
	ITEMDATA_NEST= ["themesl","sublane"];
	//ITEMDATA_NEST= ["isCorporate","themesl","sublane"];
	//ITEMDATA_NEST= ["themesl","lane","sublane"];
	//ITEMDATA_NEST= ["lane","sublane"];
	//ITEMDATA_NEST= ["theme","themesl","sublane"];
	ITEMDATA_FILTER = {"name":"lane", "operator":"==", "value":"shared"};
	CONTEXT=ITEMDATA_FILTER.value+".drill-in";
	
	console.log("*************************************************************************************calling getJSON..");
	
	$.when($.getJSON("/data/data.php?type=initiatives_entit"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}

function renderHolding(){
	HEIGHT=1000;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;

	ITEM_SCALE=0.6;
	ITEMDATA_NEST= ["bm","theme","lane","sublane"];
	ITEMDATA_FILTER = null;
	CONTEXT="holding";

	$.when($.getJSON("/data/data.php?type=initiatives"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}

function renderShared(){
	HEIGHT=600;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	ITEM_SCALE=1.5;
	ITEMDATA_NEST= ["lane","sublane"];
	ITEMDATA_FILTER = {"name":"lane", "operator":"==", "value":"shared"};
	CONTEXT=ITEMDATA_FILTER.value;

	$.when($.getJSON("/data/data.php?type=initiatives"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});

}

function renderNewBiz(){
	HEIGHT=500;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	ITEM_SCALE=1.5;
	ITEMDATA_NEST= ["theme","lane","sublane"];
	ITEMDATA_FILTER = {"name":"bm", "operator":"==", "value":"new biz"};
	CONTEXT=ITEMDATA_FILTER.value;

	$.when($.getJSON("/data/data.php?type=initiatives"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}

function renderTechdebt(){
	HEIGHT=450;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	ITEM_SCALE=1.5;
	ITEMDATA_NEST= ["lane","sublane"];
	ITEMDATA_FILTER = {"name":"lane", "operator":"==", "value":"techdebt"};
	CONTEXT=ITEMDATA_FILTER.value;

	$.when($.getJSON("/data/data.php?type=initiatives"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}



function drawCustomPostits(){
	
	var gCustomPostits = d3.select("#kanban").append("g").attr("id","customPostits");
	for (var i in postitData){
		var p = new Postit(postitData[i].id,postitData[i].text,postitData[i].x,postitData[i].y,postitData[i].scale,postitData[i].size,postitData[i].color,postitData[i].textcolor);
		p.draw(gCustomPostits);
	}
}
	

/**
*/
function drawInitiatives(){
	drawAxes();
	drawLanes();
	drawQueues();
	drawWC2014();
	
	drawItems();
	drawPostits();
	
}

function drawAll(){
	init();
	createLaneHierarchy();
	
	drawInitiatives();

	drawMetrics();
	drawReleases();
	drawVersion();
	drawLegend();

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
		//d3.tsv("data/"+dataversions.itemFile,handleInitiatives);
	}
	setTODAY();
	setWIP();
	drawAll();
	calculateQueueMetrics();
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
		.attr("x1", 0-LANE_LABELBOX_LEFT_WIDTH)
		.attr("y1", -20)
		.attr("x2", x(KANBAN_END)+LANE_LABELBOX_RIGHT_WIDTH)
		.attr("y2", -20)
		.attr("class","gridTop");

gAxes.append("line")
		.attr("x1", 0-LANE_LABELBOX_LEFT_WIDTH)
		.attr("y1", height+20)
		.attr("x2", x(KANBAN_END)+LANE_LABELBOX_RIGHT_WIDTH)
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
	_drawLaneContext(lanes,CONTEXT,-LANE_LABELBOX_LEFT_WIDTH-200,0,LANE_LABELBOX_LEFT_WIDTH/6,height,"treemap.html")
	
	
	var i=0;
	
	lanes.selectAll("#lane")
	// [changed 20140104]
	.data(getLanesNEW())
	.enter()
	// **************** grouped item + svg block + label text
	.append("g")
	.attr("id",function(d){return "lane_"+d.name;})
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
		
		var _metrics;

		//left box
		_metrics = _drawLaneBox(d3.select(this),-LANE_LABELBOX_LEFT_WIDTH,_y,LANE_LABELBOX_LEFT_WIDTH,_height,_lane,"left");

		var _yTextOffset;
		if (_metrics) _yTextOffset=_metrics.height+15;
		else _yTextOffset=15;

		//baseline box text
		_drawLaneText(lanes,_lane,"baseline",_yTextOffset);
	
		
		// lane area
		_drawLaneArea(d3.select(this),x(KANBAN_START),_y,x(KANBAN_END)+LANE_LABELBOX_RIGHT_WIDTH+280,_height,i)

		//target box	
		_metrics =_drawLaneBox(d3.select(this),x(KANBAN_END),_y,LANE_LABELBOX_RIGHT_WIDTH,_height,_lane,"right");
		
		//target box text
		_drawLaneText(lanes,_lane,"target",_yTextOffset);
	

		// laneside descriptors
		var _laneName = _.last(_lane.split("."))
		_drawLaneSideText(d3.select(this),_laneName,-LANE_LABELBOX_LEFT_WIDTH-2,_y+3,"5px","start");

		//sublane descriptors
		var _sublanes = getSublanesNEW(_lane);
		for (var s in _sublanes){
			var _y = y(_sublanes[s].yt1);
			var _h = y(_sublanes[s].yt2-_sublanes[s].yt1); 
			
			// strip only the sublane name if name is fully qualified like "topline.bwin.touch"
			var _sublane = _.last((_sublanes[s].name).split("."))
			
			_drawLaneSideText(d3.select(this),_sublane,1,_y+_h/2,"4px","middle");

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
			var _t = y(getThemesNEW()[t].yt2);
			
			// no demarcation line in the end ;-)
			if (t<getThemesNEW().length-1){
				d3.select(this).append("line")
				.attr("x1", x(KANBAN_START)-LANE_LABELBOX_LEFT_WIDTH-200)
				.attr("y1", _t)
				.attr("x2", x(KANBAN_END)+LANE_LABELBOX_RIGHT_WIDTH+400)
				.attr("y2", _t)
				.attr("class", "themeLine");

				//_drawLaneSideText(d3.select(this),getThemesNEW()[t].name,-LANE_LABELBOX_LEFT_WIDTH-10,_t,"5px","middle");
			}
		}
		i++;
	});
	
	
	// -------------------------------------- drivers WHERE HOW STUFF -----------------------------------
		var _pillarColumns = [{"name":"ACCESS"},{"name":"APPEAL"},{"name":"USP"}];



		var _pillarElements =[{"lane":"bwin","category":"ACCESS","title":"TOUCH","content":
								[{"text":"* native+HTML5 etc etc ..."},
								 {"text":"* state of the art mobile offer"},
								 {"text":"* 9-12 month cycle time"},
								]},
							  {"lane":"bwin","category":"APPEAL","title":"CONTENT","content":
								[{"text":"* sports driven 360° offer"},
								 {"text":"* full real money gaming offering"},
									]},
							  {"lane":"bwin","category":"USP","title":"SOCIAL","content":
									[{"text":"* gamification & social mechanics"},
									 {"text":"* infotainment"},
									]},
							{"lane":"pp","category":"ACCESS","title":"TOUCH","content":
								[{"text":"* native+HTML5 "},
								 {"text":"* mobile distribution"},
								]},
							  {"lane":"pp","category":"APPEAL","title":"CONTENT","content":
								[{"text":"* game variance"},
								 {"text":"* tournament offer"},
								 {"text":"* live gaming integration"}
									]},
							  {"lane":"pp","category":"USP","title":"SOCIAL","content":
									[{"text":"* exploitation"},
									 {"text":"* improved .NET strategy"},
									]},
							{"lane":"foxy","category":"ACCESS","title":"TOUCH","content":
								[{"text":"* HTML5 "}
								]},
							  {"lane":"foxy","category":"APPEAL","title":"CONTENT","content":
								[{"text":"* bingo"},
								 {"text":"* games variance & refresh"}
									]},
							  {"lane":"foxy","category":"USP","title":"SOCIAL","content":
									[{"text":"* ?"}
									]},
							{"lane":"premium","category":"ACCESS","title":"","content":
								[]},
							  {"lane":"premium","category":"APPEAL","title":"CONTENT","content":
								[{"text":"* full offer"},
								 {"text":"* invite only"},
								 {"text":"* personalized"}
									]},
							  {"lane":"premium","category":"USP","title":"","content":
									[]},
				
								];
		
		var _xBase = x(KANBAN_END)+2;
		var _yBase = -70;
		var _width = LANE_LABELBOX_RIGHT_WIDTH-90;						
							
	  if (_width >100 & CONTEXT=="b2c gaming") {
		  _drawPillarColumns(lanes,_pillarColumns,_xBase,_yBase,_width);
		  _drawHowPillars(lanes,_pillarElements,_xBase,_yBase,_width);							

	}
}	
	
function _drawPillarColumns(svg,data,x,y,width){

		var _spacer = 3;
		var _color = COLOR_BPTY;
		var _length = data.length;
		var _pillarWidth = (width/_length)-_spacer;
		var _headlineHeight= 90;
		var _height = height+_headlineHeight;
		var _headlineSize = "10px";
	
	for (var i in data){
		//1) pillar header
			var _offset = (getInt(i)*_pillarWidth)+_pillarWidth/2;
			svg.append("text")
				.text(data[i].name)
				.attr("x",x+_offset+(i*_spacer))
				.attr("y",y+_spacer)
				.style("fill",_color)
				.style("font-weight","bold")
				.style("writing-mode","tb")
				.style("font-size",_headlineSize);
			
			//2) pillar rect
			svg.append("rect")
				.attr("x",x+(i*_pillarWidth)+(i*_spacer))
				.attr("y",y-_spacer)
				.attr("width",_pillarWidth)
				.attr("height",_height)
				.style("fill","grey")
				.style("opacity",0.1);
	}
	
}

function _drawHowPillars(svg,data,x,y,width){
	var _spacer = 2;
	var _color = COLOR_BPTY;
	var _headlineSize = "12px";
	var _textSize="5px";
	
	var _d = _.nest(data,"lane");
	
	//0 HOW
	svg.append("text")
			.text("HOW")
			.attr("x",x+width/2)
			.attr("y",y-(3*_spacer))
			.style("fill","grey")
			.style("opacity",0.1)
			.style("text-anchor","middle")
			.style("font-weight","bold")
			.style("font-size","40px");
	
	// for each lane
	for (l in _d.children){
		var _data = _d.children[l];

		var _length = _data.children.length;
		var _pillarWidth = (width/_length)-_spacer;
		var _headlineHeight= 90;
		var _height = height+_headlineHeight;
		var _y = this.y(getLaneByNameNEW(_data.name).yt1);
		
		var _color = "black";
		if (_data.name.indexOf("bwin") !=-1 || _data.name.indexOf("premium") !=-1) _color="white";
		
		//for each pillar
		for (var i in _data.children){
			var _offset = (getInt(i)*_pillarWidth)+_pillarWidth/2;
			
			//3) content title
			svg.append("text")
				.text(_data.children[i].title)
				.attr("x",x+_offset+(i*_spacer))
				.attr("y",_y+10)
				.style("fill",_color)
				.style("text-anchor","middle")
				
				.style("font-weight","bold")
				.style("font-size","5px");
				
			//4) content / text
			for (var c in _data.children[i].content){
				var _text = _data.children[i].content[c].text;
				svg.append("text")
				.text(_text)
				.attr("x",(x-6+((getInt(i)+1)*_pillarWidth)+(i*_spacer)-(c*6)))
				.attr("y",_y+12)
				.style("fill",_color)
				.style("font-weight","normal")
				.style("writing-mode","tb")
				.style("font-size",_textSize);
			}
		}
	}
}




function _drawLaneText(svg,lane,side,logoHeight)
{
	var i=0;
	var _anchor ="start";
	if (side=="target") _anchor ="end";
	
	var _color = "black";
	if (lane.indexOf("bwin") !=-1 || lane.indexOf("premium") !=-1) _color="white";

	var _yBase = y((getLaneByNameNEW(lane).yt1))+logoHeight+5;
	
	// just get the last element in a FQN
	lane = _.last(lane.split("."))
	
	var _xBase;
	if (side=="baseline") _xBase= -LANE_LABELBOX_LEFT_WIDTH+10
	else if (side=="target") _xBase= x(KANBAN_END)+LANE_LABELBOX_RIGHT_WIDTH-10;
	
				
	
	
	if (laneTextData){
	var _lanetext = laneTextData.filter(function(d){return (d.lane==lane && d.side==side)});
		if (_lanetext && CONTEXT!="holding"){
			var gLanetext = svg.append("g")
			.attr("id","text_"+lane);
	
			for (var i in _lanetext){
					gLanetext.append("text")
					.text(_lanetext[i].text)
					.attr("x",_xBase)
					.attr("y",_yBase+(i*(parseInt(_lanetext[i].size)+1)))
					.style("font-size",_lanetext[i].size+"px")
					.style("font-weight",_lanetext[i].format)
					.style("text-anchor",_anchor)
					.style("fill",_color);
			}
		}
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
		 * returns the metrics of logo
		 */
		function _drawLaneBox(svg,x,y,width,height,lane,side){
			var _x_offset=10;
			var _y_offset=4;
			var _metrics;
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
			
			// only append logo if we have declared on in external.svg
			if (document.getElementById(lane)){
				var _x = x+_x_offset;
				var _y = y+_y_offset;
				
				var _logo = svg.append("use")
				.attr("xlink:href","#"+lane)
				.attr("transform","translate("+0+","+0+") scale(1)");
				
				_metrics = get_metrics(_logo.node());
				// i need to know the width of the logo....
				if (side=="right"){
					
					_x= x+LANE_LABELBOX_RIGHT_WIDTH-_metrics.width-10;
				}
				_logo
				.attr("transform","translate("+_x+","+_y+") scale(1)");
				
			}
		console.log("metrics: "+_metrics);
		return _metrics;
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

	var _yMetricBaseTop = -75; //top
	var _yMetricBase = height+75; //bottom
	
	var _yMetricDetailsOffset = 10;
	var _yMetricDetails2Offset = 8;
	
	//var _yMetricBracketOffset = -50; //top
	var _yMetricBracketOffset = _yMetricBase-40;
	var gQueue = svg.append("g").attr("id","queues");
	
	//---------------- DONE queue --------------------
	var gQueueDone = gQueue.append("g").attr("id","done");

	//3px ofsfet for first box
	_drawQueueArea(gQueueDone,0,0,_xWIPStart,height,"done",3);

	// --------------- DONE METRICS ---------------------
	var _metric = {"text":"DONE" ,"items":ITEMS_DONE ,"swag": SIZING_DONE}
	_drawQueueMetric(gQueueDone,_metric,x(KANBAN_START),_yMetricBracketOffset,_xWIPStart,_xWIPStart/2,_yMetricBase,_yMetricDetailsOffset,null,"bottom");

	//---------------- wip queue --------------------
	var gQueueWip = gQueue.append("g").attr("id","wip");
	
	_drawQueueArea(gQueueWip,_xWIPStart,0,_xWIPWidth,height,"wip",0);
	
	// --------------- WIP METRICS ---------------------
	_metric = {"text":"WIP" ,"items":ITEMS_WIP ,"swag": SIZING_WIP}
	_drawQueueMetric(gQueueWip,_metric,_xWIPStart,_yMetricBracketOffset,_xWIPWidth,(_xWIPWidth/2+x(WIP_START)),_yMetricBase,_yMetricDetailsOffset,null,"bottom");

	//-------------- TODAY markerlines ----------------
	_drawQueueMarker(gQueueWip,WIP_START,"today",x(WIP_START),-30);
	
	_drawTodayMarker(gQueueWip,x(WIP_START),_yMetricBaseTop,"TODAY");
	
		
	// ------------- WIP marker lines ---------------------
	_drawQueueMarker(gQueueWip,WIP_END,"wip",x(WIP_END),-30);

	//---------------- FUTURE queue --------------------
	var gQueueFuture = gQueue.append("g").attr("id","future");
	
	_drawQueueArea(gQueueFuture,_xFutureX,0,_xFutureWidth,height,"future",0);
	
	//---------------- FUTURE METRICS --------------------
	_metric = {"text":"FUTURE" ,"items":ITEMS_FUTURE ,"swag": SIZING_FUTURE}
	_drawQueueMetric(gQueueFuture,_metric,_xFutureX,_yMetricBracketOffset,_xFutureWidth,(_xFutureWidth/2+x(WIP_END)),_yMetricBase,_yMetricDetailsOffset,null,"bottom");

	//---------------- TOTAL METRICS --------------------
	_metric = {"text":"TOTAL" ,"items":ITEMS_TOTAL ,"swag": SIZING_TOTAL}
	_drawQueueMetric(gQueue,_metric,null,null,null,(_xFutureX+_xFutureWidth),_yMetricBase,_yMetricDetailsOffset,null,"bottom");

	//---------------- TOTAL DELAYED METRICS --------------------
	_metric = {"text":"DELAY" ,"items":ITEMS_DELAYED ,"swag": DAYS_DELAYED}

	if (ITEMS_DELAYED){
		_drawQueueMetric(gQueue,_metric,null,null,null,(_xFutureX+_xFutureWidth)+80,_yMetricBase,_yMetricDetailsOffset,"red","bottom");
	}
} //end drawQueues



/* ------------------------------------------------- drawQueues() helper functions ----------------------------------------------------------- */
		function _drawTodayMarker(svg,x,y,text){
			svg.append("use").attr("xlink:href","#today_marker")
			.attr("transform","translate("+(x-5.5)+",-70) scale(1.1)");
			
			svg.append("text")
			.text(text)
			.attr("transform","translate("+(x)+","+y+") scale(1)")
			.style("text-anchor","middle")
			.style("font-size","18px")
			.style("fill","red")
			.style("font-weight","bold");
			
			
		}
		
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
		function _drawQueueMetric(svg,metric,bracketX,bracketY,width,metricX,metricY,space,color,orientation){
			if(!color) color=COLOR_BPTY;
			if (width){
				svg.append("use")
				.attr("xlink:href","#icon_bracket_"+orientation+"_blue")
				.style("opacity",0.15)
				.attr("transform","translate("+bracketX+","+bracketY+") scale("+(width/100)+",1) rotate(0)");
			}
			
			svg.append("text")
			.text(metric.text)
			.style("text-anchor","middle")
			.style("font-size","18px")
			.style("fill",color)
			.attr("class","metricItems")
			.attr("transform","translate("+metricX+","+metricY+") rotate(0)");

			svg.append("text")
			.text(metric.items+ " items")
			.attr("class","metricItems")
			.style("text-anchor","middle")
			.style("font-size","9px")
			.style("fill",color)
			.attr("transform","translate("+metricX+","+(metricY+space)+") rotate(0)");

			svg.append("text")
			.text("["+metric.swag+" PD]")
			.attr("class","metricItems")
			.style("text-anchor","middle")
			.style("font-size","7px")
			.style("fill",color)
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
	.data(filteredInitiativeData.filter(function(d){return (d.state==="todo")&& (new Date(d.planDate)>KANBAN_START);
}))
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
			.text("todo:")
			.style("text-anchor","start")
			.style("font-size",(3+_size/6)+"px")
			.style("font-weight","bold")
			.style("fill","red")
			.attr("transform","translate("+(postit_x+1)+","+(postit_y+5)+") rotate("+_rotate+") scale("+POSTIT_SCALE+")")
			.append("tspan")
			.attr("dy",5)
			.attr("x",0)
			.text("id:"+d.id);
		}
	})
	//grey all todo text 
	d3.select("#items").selectAll("text").filter(function(d){return d.state=="todo";}).style("fill","grey")
	
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
	
	filteredInitiativeData = initiativeData.filter(function(d){
					var _filter=new Date(d.planDate)>KANBAN_START;
					if (ITEMDATA_FILTER){
						return _filter && eval("d."+ITEMDATA_FILTER.name+ITEMDATA_FILTER.operator+"\""+ITEMDATA_FILTER.value+"\"");
					}
					return _filter;
					
					});
	
	var groups = gItems.selectAll("initiatives")
				// filter data if ITEMDATA_FILTER is set
				.data(filteredInitiativeData)
					
				.enter()
				// **************** grouped item + svg block + label text
				.append("g")
				.attr("id",function(d){return "item_"+d.id})
				//.style("opacity",function(d){return d.accuracy/10})
				//.on("mouseover",animateScaleUp)
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
					
					//d.sublaneOffset = override for positioning of otherwise colliding elements => manual !
					
					var _sublane = getSublaneByNameNEW(getFQName(d));
					var _sublaneHeigth = _sublane.yt2-_sublane.yt1;
					
					var _itemY = y(_sublane.yt1-_yOffset)+getInt(d.sublaneOffset);

					
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
						
						// only append icon if we have declared on in external.svg
						if (document.getElementById("icon_"+d.theme+"."+d.lane+"."+d.sublane)){
							d3.select(this)
								.append("use").attr("xlink:href","#icon_"+d.theme+"."+d.lane+"."+d.sublane)
								.attr("transform","translate("+(_itemX-(1.2*_size/2))+","+(_itemY-(1.2*_size/2))+") scale("+_size/10+") ");
						}
					} //end if d.Type!="target"

					
					// ------------  item blocks --------------
					// if isCorporate flag is not set use "tactic" icon 
					var _iconRef=d.Type;
					if (!d.isCorporate) {
						_iconRef = "tactic";
					}
					d3.select(this)
						.append("use").attr("xlink:href",function(d){return "#"+_iconRef})
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
					var _textWeight="bold";
					var _textStyle="normal";
					var _textSize = 5+(_size/5)*ITEM_FONTSCALE;
					if (!d.isCorporate) {
						_textWeight = "normal";
						_textStyle="italic";
						_textSize =_textSize * TACTIC_SCALE;
					}
					
					
					var _x = _itemXPlanned;
					var _y = (_itemY)+ parseInt(_size)+(6+(_size/5)*ITEM_FONTSCALE);
					var _text =d3.select(this)
					   .append("text")
					   //.text(d.name)
					   .attr("font-size",_textSize+"px")
					   .attr("text-anchor","middle")
					   .style("font-weight",_textWeight)
					   .style("font-style",_textStyle)
					   //.style("kerning",-0.5)
					   //.style("letter-spacing",-.2)
					   //google font
					   .style("font-family","Open Sans Condensed,arial, sans-serif")
					   .style("fill",function(d){if (d.Type=="target" || (d.actualDate>d.planDate && d.state!="done")) return "red"; else return"black";})
					   .attr("x",_x)
					   .attr("y",_y);
	
					textarea(_text,d.name,_x,_y,20,_textSize-1);
	
					
					
					// ------------- labels for sizing view -------------
					_text = gLabels
					   .append("text")
					   .attr("id","label_"+d.id)
					   //.text(d.name)
					   .style("font-size",5+d.Swag/500+"px")
					   //.style("font-weight","bold")
					   .attr("text-anchor","middle")
					   .attr("x",_itemXPlanned)
					   .attr("y",_itemY);
					
					textarea(_text,d.name,_itemXPlanned,_itemY,15,(5+d.Swag/500));
	
					
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
								dep.append("line")
									.attr("x1", _itemXPlanned)
									.attr("y1", _itemY)
									.attr("x2", _toX)
									.attr("y2", _toY)
									.attr("class", "dependLine")
									.attr("marker-end", "url(#arrow_grey)");
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

/*
	// data tracelog ********************
		d3.select("body")
				.append("ul")
				.selectAll("li")
				.data(initiativeData)
				.enter()
				.append("li")
				.text(function(d) {
					return "ID: "+d.id+" name: "+d.name + " lane (main/sub): " + d.lane+"/"+d.sublane+" plaDdate: "+d.planDate + " scaleX = "+x(new Date(d.planDate))+" state: "+d.state+" size: "+d.size+" sizingPD: "+parseInt(d.Swag);
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
*/ 
	
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
	
	var _htmlBase ="<table><col width=\"30\"/><col width=\"85\"/><tr><td colspan=\"2\" style=\"font-size:5px;text-align:right\">[id: "+d.id+"] "+d.ExtId+"</td></tr><tr class=\"header\" style=\"height:4px\"/><td colspan=\"2\"><div class=\"indicator\" style=\"background-color:"+_indicator+"\">&nbsp;</div><b style=\"padding-left:4px;font-size:7px\">"+d.name +"</b></td</tr>"+(d.name2 ? "<tr><td class=\"small\">title2:</td><td  style=\"font-weight:bold\">"+d.name2+"</td></tr>" :"")+"<tr><td  class=\"small\"style=\"width:20%\">lane:</td><td><b>"+d.lane+"."+d.sublane+"</b></td></tr><tr><td class=\"small\">owner:</td><td><b>"+d.productOwner+"</b></td></tr><tr><td class=\"small\">Swag:</td><td><b>"+d.Swag+" PD</b></td></tr><tr><td class=\"small\">started:</td><td><b>"+d.startDate+"</b></td></tr><tr><td class=\"small\">planned:</td><td><b>"+d.planDate+"</b></td><tr><td class=\"small\">status:</td><td class=\"bold\">"+d.state+"</td></tr>";

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
				.attr("r", getItemByID(filteredInitiativeData,_di).size*2*ITEM_SCALE);
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
				.attr("r", getItemByID(filteredInitiativeData,_di).size*ITEM_SCALE);
		} // end de- check depending items
	}
}





function drawMetrics(){
	d3.select("#metrics").remove();
	
	//only show metrics in b2c business model view
	if (CONTEXT!="new biz" && _.last(CONTEXT.split("."))!="drill-in"){

		//console.log("----------------------------->drawMetrics:svg="+svg);
		var i=0;
		var gMetrics= svg.append("g").attr("id","metrics");//.style("visibility","hidden");
					
		// y space between KPIs
		var _kpiYOffset = 15;
		var _yTotal =-35;
		//left			
		var _primaryXOffset = LANE_LABELBOX_LEFT_WIDTH +120;
		var _secondaryXOffset = LANE_LABELBOX_LEFT_WIDTH+35;
		//right
		//1
		var _primaryXOffsetRight = LANE_LABELBOX_RIGHT_WIDTH +120;
		var _secondaryXOffsetRight = LANE_LABELBOX_RIGHT_WIDTH+25;
		//2
		var _2Offset = 150;
		var _primaryXOffsetRight2 = _primaryXOffsetRight +_2Offset;
		var _secondaryXOffsetRight2 = _secondaryXOffsetRight+_2Offset;
		//goal
		var _goalXOffset = LANE_LABELBOX_RIGHT_WIDTH +300;
		
	// all KPIs & results in baseline
	
		var _baselineResultSum=0;
		var _targetResultSum1=0;
		var _targetResultSum2=0;
		
		var _bOffset = 60;
		var _primTextYOffset=18; 
	
// -------------------------- baseline -----------------------------------------------
	var gMetricsBaseline = gMetrics.append("g").attr("id","metrics_baseline");
	_baselineResultSum = _renderMetrics(gMetricsBaseline,"baseline",(x(KANBAN_START)-_primaryXOffset+_bOffset),(x(KANBAN_START)-_secondaryXOffset));
	
// -------------------------- target 1-year (2014) -------------------------------
	var _1Offset = 70;

	var gMetricsTarget1 = gMetrics.append("g").attr("id","metrics_target1");
	_targetResultSum1 = _renderMetrics(gMetricsBaseline,"forecast1",x(KANBAN_END)+_primaryXOffsetRight-_1Offset,x(KANBAN_END)+_secondaryXOffsetRight);

	d3.select("#metrics_forecast1").style("opacity",0.5);

	_drawMetricSeparator(gMetrics,x(KANBAN_END)+_secondaryXOffsetRight2-35);
		
// -------------------------- target 2-years (2015)-------------------------------
	var _2Offset = 70;
	var gMetricsTarget2 = gMetrics.append("g").attr("id","metrics_target2");
	_targetResultSum2 = _renderMetrics(gMetricsBaseline,"forecast2",x(KANBAN_END)+_primaryXOffsetRight2-_2Offset,x(KANBAN_END)+_secondaryXOffsetRight2);
	
	
	

// ------------------------------ potentials ------------------------------------------------

	var gMetricsRisk = gMetricsTarget2.append("g").attr("id","metrics_risk");

	var _yRisk = 50;
	var _xRisk = x(KANBAN_END)+_goalXOffset+30;
/* ----------------------------------------- opportunities -----------------------------------------*/
	_drawPotentials(gMetricsRisk,"forecast2","opportunity",_xRisk,_yRisk);

/* ----------------------------------------- risks ------------------------------------------------ */
	_drawPotentials(gMetricsRisk,"forecast2","risk",_xRisk,_yRisk+220);
	


/* ------------------------------------- goal column ------- ------------------------------------*/
	var gMetricsGoal = gMetricsTarget2.append("g").attr("id","metrics_goal");
	
	_drawMetricDate(gMetricsGoal,x(KANBAN_END)+_goalXOffset,-160,_getDataBy("dimension","goal",METRICDATES_DATA).data);

	 var _goalData = metricData.filter(function(d){return d.class=="result" && d.dimension=="goal" });

	_drawTextMetric(gMetricsGoal,_goalData[0],"metricBig",x(KANBAN_END)+_goalXOffset+30,_yTotal,10);
	
	//delta symbol
	_drawSign(gMetricsGoal,x(KANBAN_END)+_goalXOffset-36,_yTotal+20,"icon_delta",0.4);
	_drawBracket(gMetricsGoal,"blue","bottom",x(KANBAN_END)+_goalXOffset-85,_yTotal+7,1.1,.8,"bracket",0.1);
	
	var _diff = _goalData[0].number-_targetResultSum2;
	var _delta = {"number":"= "+_diff ,"scale":"mio EUR" ,"type":"missing", "sustainable":1 };

	_drawTextMetric(gMetricsGoal,_delta,"metricBig",x(KANBAN_END)+_goalXOffset+30,_yTotal+30,10);
	// delta end
 
/* ------------------------------------- linechart prototype ------------------------------------*/
	drawLineChart();
	
	}	

} //end drawMetrics


/** risks and opportunitis from metricData
 */
function _drawPotentials(svg,dimension,type,xBase,yBase){
	var _data= metricData.filter(function(d){return (d.dimension==dimension) && (d.class==type)});
	var _ySign;
	
	for (var i in _data){
		_drawTextMetric(svg,_data[i],"metricBig",xBase,yBase+(i*20),10);
	}

	if (type=="risk")_ySign = yBase-65;
	else if (type=="opportunity")_ySign= yBase+(i*20)+10;
	
	_drawSign(svg,xBase+5,_ySign,type);
}





/** helper function to return array element of  json structure by specified name
 */
function _getDataBy(name,value,data){
	for (var i in data){
		if (data[i][name]==value) return data[i];
	}
}


/**
 * @dimension "baseline,targe1,target2
 */
function _renderMetrics(svg,dimension,x1Base,x2Base){
		// y space between KPIs
		var _kpiYOffset = 15;
		var _primTextYOffset=18; 
		var _yPie = -80;
		var METRIC_DATES_Y=-160;
		
	var _met = metricData.filter(function(d){return d.dimension==dimension && ( (d.class=="result") || (d.class=="kpi"))});
	var _metByLane = _.nest(_met,"lane");
	
	var _kpiDir = "left";
	var _resultDir="right";
	
	if (dimension=="baseline"){
			_kpiDir="right";
			_resultDir="left";
		}
	
	
	var gMetrics = svg.append("g").attr("id","metrics_"+dimension);
	
	var _resultSum=0;
	
	for (var m in _metByLane.children){
		var _l = getLaneByNameNEW(_metByLane.children[m].name);
		if (_l){
			i=0;
			var sortedMetrics = _metByLane.children[m].children.sort(function(a, b) { 
						return a.class > b.class?1:-1;	
					});
			for (k in sortedMetrics){
				var _mm = _metByLane.children[m].children[k];
				var _y = y(_l.yt1)+(i*_kpiYOffset);
				var _height = y(_l.yt2-_l.yt1);
				
				//secondary metrics
				var _secTextYOffset = 10;//_height/2;
			
				if (_mm.class=="kpi") {
					_drawTextMetric(gMetrics,_mm,"metricSmall",x2Base,_y+_secTextYOffset,6,_kpiDir);
				}
				else if (_mm.class=="result") {
					_drawTextMetric(gMetrics,_mm,"metricBig",x1Base,_y+_primTextYOffset,10,_resultDir);
					if (_mm.sustainable==1) _resultSum = _resultSum+parseInt(_mm.number);
				}
				i++
			}
		}
	}

	//metric date 
	
	_drawMetricDate(gMetrics,x1Base-50,METRIC_DATES_Y,_getDataBy("dimension",dimension,METRICDATES_DATA).data);


	// calculated sum
	
	//[TODO] build a proper class structure = this would be a TextMetric m = new TextMetric(...)
	var _yTotal =-35;
	var _total = {"number":_resultSum ,"scale":"mio EUR" ,"type":"NGR", "sustainable":1 };
	
	_drawTextMetric(gMetrics,_total,"metricBig",x1Base,_yTotal,10,_resultDir);
	

	// pie
	_met = metricData.filter(function(d){return d.dimension==dimension && d.type=="marketshare" && d.scale=="% sustainable"});

	_drawPie(gMetrics,dimension,_met[0],x1Base,_yPie);


	// cx baseline 
	var _yCX =-102;
	_met = metricData.filter(function(d){return d.dimension==dimension && d.type=="loyaltyindex"});
    var _met2 = metricData.filter(function(d){return d.dimension==dimension && d.type=="promoterscore"});
	var _cxData = {"loyalty":_met[0].number,"promoter":_met2[0].number};

	_drawCX(gMetrics,_cxData,x1Base+35,_yCX);
	
	
	//market share overall
	var _yMarketShare =-120;
	_met = metricData.filter(function(d){return d.dimension==dimension && d.type=="marketshare" && d.scale=="% overall"});
	_drawTextMetric(gMetrics,_met[0],"metricBig",x1Base,_yMarketShare,10);
	
	return _resultSum;
}



function _drawSign(svg,x,y,type,scale){
		if (!scale) scale = 1;
		svg.append("use").attr("xlink:href","#"+type)
		.attr("transform","translate ("+x+","+y+") scale("+scale+")");
}





/**
 * icon_bracket<direction><type>
 */
function _drawBracket(svg,color,direction,x,y,scaleX,scaleY,type,opacity){
		if (!type) type="bracket";
		if (!opacity) opacity = 0.15;
		//svg.append("use").attr("xlink:href","#icon_triangle_"+direction+_bracketType)
		svg.append("use").attr("xlink:href","#icon_"+type+"_"+direction+"_"+color)
		.style("opacity",opacity)
		.attr("transform","translate ("+x+","+y+") scale("+scaleX+","+scaleY+")");
}

/**
 *@direction can be "left" = default or "right" 
 * => left = first number then scale
 * => right = first scale then number*/
function _drawTextMetric(svg,metric,css,x,y,space,direction){
		var _metricColor;
		if (metric.sustainable==1) _metricColor="174D75";
		//risks
		else if (metric.sustainable==-1) _metricColor="ED1C24";
		
		//opportunities
		else if (metric.sustainable==2) _metricColor="00A14B";
		
		else _metricColor="grey";
		
		var _anchor = "end";
		var _xNumber = x;
		if (direction=="right") {
			_anchor = "start";
			_xNumber = _xNumber+space;
		}
		
		svg	.append("text")
			.text(metric.number)
			.attr("x",_xNumber)
			.attr("y",y+space/2)
			.style("fill",_metricColor)
			.style("text-anchor",_anchor)
			
			.attr("class",css+"Number");
			
		_anchor = "start";
		if (direction=="right") _anchor = "end";
		
		svg	.append("text")
			.text(metric.scale)
			.attr("x",x+space/2)
			.attr("y",y-space/2)
			.style("fill",_metricColor)
			.style("text-anchor",_anchor)
			
			.attr("class",css+"Scale");

		svg	.append("text")
			.text(metric.type)
			.attr("x",x+space/2)
			.attr("y",y+space/2)
			.style("fill",_metricColor)
			.style("text-anchor",_anchor)
			.attr("class",css+"Type");
}

function _drawMetricSeparator(svg,x){
		svg.append("line")
				.attr("x1", x)
				.attr("y1", -180)
				.attr("x2", x)
				.attr("y2", height)
				.attr("class", "themeLine");
}



/**date marker for metrics
 * */
function _drawMetricDate(svg,x,y,data){
	_drawText(svg,data.title,x,y,16,"bold","start",COLOR_BPTY,null);
	_drawText(svg,data.sub+": ",x,y+6,5,"normal","start",COLOR_BPTY,null);
	_drawText(svg,data.date.toString('yyyy-MM-dd'),x,y+16,6,"bold","start",COLOR_BPTY,null);
	
}



/** helper function
 * */
function _drawPie(svg,id,_data,x,y){
	var radius =40;

    var data = [{"type":"sustainable","percentage":_data.number},{"type":"notsustainable","percentage":100-_data.number}];
    
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
	  .style("font-size", function(d) { return (6+d.data.percentage/8)+"px";})
	  .text(function(d) { return d.data.percentage; })
		.append("tspan")
		.text("%")
		.style("font-size","4px")
		.style("font-weight","normal")
		.append("tspan");
	
}

function _drawCX	(svg,data,x,y){
		svg.append("use").attr("xlink:href","#customer")
		.attr("transform","translate ("+x+","+y+") scale(.5)");
	
		svg.append("text")
		.text(data.promoter)
		.style("font-size","8px")
		.style("font-weight","bold")
		.style("fill","white")
		.attr("x",x+7)
		.attr("y",y+12)
			.append("tspan")
			.text("%")
			.style("font-size","4px")
			.style("font-weight","normal");

		svg.append("text")
		.text("promoter-score")
		.style("font-size","5px")
		.style("font-weight","normal")
		.style("fill",COLOR_BPTY)
		.attr("x",x-4)
		.attr("y",y-2)
		
		svg.append("text")
		.text(data.loyalty)
		.style("font-size","12px")
		.style("font-weight","bold")
		.style("fill","white")
		.attr("x",x+5)
		.attr("y",y+38)
			.append("tspan")
			.text("%")
			.style("font-size","4px")
			.style("font-weight","normal");
			
		svg.append("text")
		.text("loyalty-index")
		.style("font-size","5px")
		.style("font-weight","normal")
		.style("fill",COLOR_BPTY)
		.attr("x",x)
		.attr("y",y+50);
}


/**
 * soccer world championship 2014 block
 */
function drawWC2014(){
	
	var svg = d3.select("#kanban");
	var _x = x(new Date("2014-06-13"));
	var _y = x(new Date("2014-07-13"));
	
	svg.append("rect")
	.attr("x",_x)
	.attr("width",(_y-_x))
	.attr("y",0)
	.attr("height",y(100))
	.style("fill","white")
	.style("opacity",0.75);
	
	
	svg.append("use").attr("xlink:href","#wc2014")
	.attr("transform","translate ("+(_x+(_y-_x)/4)+","+(10)+") scale(.75) ")
	.style("opacity",0.5);
	
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

function Metric(id,type,scale,metric){
	this.id =id;
	this.type=type;
	this.scale=scale;
	this.metric=metric;
}
Postit.prototype.getInfo=function(){
	return JSON.stringify(this);
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
	console.log("in draw(): "+this.getInfo());
	//postits drag and drop
	var drag_postit = d3.behavior.drag()
		.on("dragstart", function(d,i) {
			console.log("dragstart= d.x: "+d.x+" - d.y: "+d.y);
		})	

		.on("drag", function(d,i) {
			d.x += d3.event.dx
			d.y += d3.event.dy
			console.log("drag= d.x:"+d.x+" - d.y:"+d.y);

			d3.select(this).attr("transform", function(d,i){
				return "translate(" + [ d.x,d.y ] + ")"
			})
		})	
		.on("dragend",function(d,i){
			//postit update position
			p.x=getInt(d.x)+getInt(p.x);
			p.y=getInt(d.y)+getInt(p.y);
			console.log("dragend event: x="+d.x+", y="+d.y);
			console.log("context: this= "+this);

			p.update();
		});
	
	
	var postit=svg.append("g")
		.attr("id","postit_"+this.id)
		.data([ {"x":0, "y":0} ])
		.call(drag_postit);

	var _rmax=3,
		_rmin=-3;						;

	var _rotate = Math.floor(Math.random() * (_rmax - _rmin + 1) + _rmin);
	
	var _split = this.text.split("/");

	postit.append("use")
		.attr("xlink:href","#postit_"+this.color)
		.style("cursor","pointer")		
		.attr("transform","translate("+this.x+","+this.y+") scale("+this.scale+") rotate("+_rotate+")");
		
	var _x = (getInt(this.x)+Math.sqrt(this.scale)+1);
	var _y = (getInt(this.y)+Math.sqrt(this.scale)-1);
	
	var t =postit.append("text")
	.style("text-anchor","start")
		.style("font-size",this.size+"px")
		.style("font-family","courier")
		.style("font-weight","bold")
		.style("cursor","pointer")		
		.style("letter-spacing","-0.1")
		.style("kerning","-0.1")
		
		.style("text-anchor","start")
		.style("fill",this.textcolor)
			.attr("transform","translate("+_x+","+_y+") scale("+this.scale+") rotate("+_rotate+")");
	
	
	/*for (i in _split){
		t.append("tspan")
		.text(_split[i])
		.attr("dy",4+Math.sqrt(this.scale/5))
		.attr("x",0);
	}*/
	
	textarea(t,this.text,0,4,10,4);
	
	postit.append("path")
	.attr("transform","translate("+((22*this.scale)+getInt(this.x))+","+(getInt(this.y)+(2*this.scale))+") rotate("+(45+_rotate)+") scale("+(0.25*this.scale)+")")
	.attr("d",d3.svg.symbol().type("cross"))
	.style("fill","grey")
	.on("click",function(d){postit.remove();p.remove()});	
}

function loadPostits(){
	//d3.json("data/data.php?type=postits",handlePostits);
}








function drawVersion(){
	d3.select("#version").remove()
	console.log("####removed #version");
	
	var _line =7;
	var _offset =28;
	var _y = height;
	
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

	_drawLegendLine(svg,WIDTH-200,WIDTH-42,_y+60);
	
	_drawText(gVersion,"* auto-generated D3 svg | batik png pdf transcoded",WIDTH-42,_y+67,5,"normal","end");
	


	// ----- vision statement ------
	var _x = x(KANBAN_START.getTime()+(KANBAN_END.getTime()-KANBAN_START.getTime())/2);
	var _y = -200;
	
	_drawText(gVersion,TITLE_TEXT,_x,_y,30,"normal","middle",COLOR_BPTY,"italic");
	_drawText(gVersion,TITLE_SUBTEXT,_x,_y+20,16,"normal","middle",COLOR_BPTY,"italic");
	
	// --- mission strategy stuff ------
		
	//_drawBracket(gVersion,"blue","bottom",350,-180,2,.8,"triangle",1);
	_drawBracket(gVersion,"blue","bottom",300,_y+90,3,.8,"triangle",1);
	
	
	var _x = x(KANBAN_START.getTime()+(KANBAN_END.getTime()-KANBAN_START.getTime())/2);
	//var _x = 460;
	gVersion.append("text")
		.text("::focus in BWIN via agressive sports mobile aquisition in europe")
		.attr("x",_x)
		.attr("y",_y+40)
		.style("fill",COLOR_BPTY)
		.style("text-anchor","middle")
		.style("font-style","italic")
		.style("font-size","8px")
		.append("tspan")
		.attr("dy",12)
		.attr("x",_x)
		.text("::position partypoker and our b2b services as leading online gaming biz in US")
		.append("tspan")
		.attr("dy",12)
		.attr("x",_x)
		.text("::establish lean engineering culture to  build ‘right’ software solution and IP")
		.append("tspan")
		.attr("dy",12)
		.attr("x",_x)
		.text("::re-establish entrepreneurial thinking & leadership (ownership");
	
	
	
	
}

/**
 */
function _drawVersionText(svg,text,x,y,size){
	
	_drawText(svg,text.name,x-15,y,size-1,"normal","end");
	_drawText(svg,text.value,x+3,y,size,"normal","start");
}

/**
 */
function _drawText(svg,text,x,y,size,weight,anchor,color,style){
	if (!style) style="normal";
	if (!color) color="black";
	svg.append("text")
	.text(text)
	.style("font-size",size+"px")
	.style("font-weight",weight)
	.style("font-style",style)
	.style("fill",color)
	.style("text-anchor",anchor)
	.attr("x",x)
	.attr("y",y);
	
}

function drawLegend(){
	var _line =7;
	var _offset =28;
	var _y = height+20;
	var _x = -280;
	var _fontsize=4;
	
	var t;

	var gLegend= svg.select("#version")
		.append("g")
		.attr("id","legend");
	
	gLegend.append("use").attr("xlink:href","#item")
		.attr("transform","translate ("+_x+","+(_y+2)+") scale(0.30) ");
	_drawText(svg,"... corporate initiative [planned finish]",_x+12,(_y+7),_fontsize,"normal","start",null,"italic");
	
	gLegend.append("use").attr("xlink:href","#tactic")
		.attr("transform","translate ("+_x+","+(_y+12)+") scale(0.30) ");
	_drawText(svg,"... tactical initiative [planned finish]",_x+12,(_y+17),_fontsize,"normal","start",null,"italic");
	
	gLegend.append("use").attr("xlink:href","#innovation")
		.attr("transform","translate ("+_x+","+(_y+22)+") scale(0.30) ");
	_drawText(svg,"... innovation initiative [planned finish]",_x+12,(_y+27),_fontsize,"normal","start",null,"italic");

	
	gLegend.append("use").attr("xlink:href","#item")
		.attr("transform","translate ("+_x+","+(_y+32)+") scale(0.30) ");
	
	gLegend.append("use").attr("xlink:href","#postit_yellow")
		.attr("transform","translate ("+_x+","+(_y+30)+") scale(0.35) ");
	_drawText(svg,"... fuzzy initiative [planned finish]",_x+12,(_y+37),_fontsize,"normal","start",null,"italic");

	gLegend.append("use").attr("xlink:href","#postit_blue")
		.attr("transform","translate ("+_x+","+(_y+40)+") scale(0.35) ");
	_drawText(svg,"... custom note",_x+12,(_y+47),_fontsize,"normal","start",null,"italic");


			


	
	gLegend.append("circle").attr("r",10)
		.style("fill","green")
		.style("opacity",0.5)
		.attr("transform","translate ("+(_x+100)+","+(_y+5)+") scale(0.30) ");
		
	_drawText(svg,"... initiative [done]",(_x+105),(_y+7),_fontsize,"normal","start",null,"italic");
	
	gLegend.append("circle").attr("r",10)
		.attr("transform","translate ("+(_x+100)+","+(_y+15)+") scale(0.30) ")
		.style("opacity",0.5)
		.style("fill","red");
	_drawText(svg,"... initiative [delayed]",(_x+105),(_y+17),_fontsize,"normal","start",null,"italic");
	
	gLegend.append("circle").attr("r",10)
		.style("opacity",0.5)
		.style("fill","gold")
		.attr("transform","translate ("+(_x+100)+","+(_y+25)+") scale(0.30) ");
	_drawText(svg,"... initiative [planned]",(_x+105),(_y+27),_fontsize,"normal","start",null,"italic");
	
	gLegend.append("circle").attr("r",10)
		.style("opacity",0.5)
		.style("fill","grey")
		.attr("transform","translate ("+(_x+100)+","+(_y+35)+") scale(0.30) ");
	_drawText(svg,"... initiative [future]",(_x+105),(_y+37),_fontsize,"normal","start",null,"italic");
	
	
	
	gLegend.append("use").attr("xlink:href","#target")
		.attr("transform","translate ("+(_x+96)+","+(_y+42)+") scale(0.30) ");
	_drawText(svg,"... pulling goal",_x+105,(_y+47),_fontsize,"normal","start",null,"italic");
	
	
	_drawLegendLine(svg,-280,-120,_y);
		
	//title
	//_drawText(gVersion,"strategic portfolio kanban board",WIDTH-42,(_y-(_offset-9)),9,"bold","end");

	var i=0;

	t = [	{"name":"context: ","value": CONTEXT},
			{"name":"URL: ","value": document.URL},
			{"name":"version: ","value": new Date().toString('yyyy-MM-dd_hh:mm:ss')},
			{"name":"package: ","value":PACKAGE_VERSION},
			{"name":"author: ","value":"@cactus | twitter.com/gkathan"}
			
		];

/*
	for (var j in t){ 
		_drawVersionText(gVersion,t[j],WIDTH-140,(_y+_offset+(j*_line)),6);
		i++;
	}
*/	
	//bottom disclaimer
	i++;

	
/*
	_drawText(gVersion,"* auto-generated D3 svg | batik png pdf transcoded",WIDTH-42,height+48,5,"normal","end");
	
	_drawText(gVersion,TITLE_TEXT,x(KANBAN_START.getTime()+((KANBAN_END.getTime()-KANBAN_START.getTime())/2)),-180,24,"normal","middle",COLOR_BPTY,"italic");
	_drawText(gVersion,TITLE_SUBTEXT,x(KANBAN_START.getTime()+((KANBAN_END.getTime()-KANBAN_START.getTime())/2)),-160,16,"normal","middle",COLOR_BPTY,"italic");
*/	
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





function customAxis(g) {
  g.selectAll("text")
      .attr("x", 4)
      .attr("dy", -4);
}


/** config (former override)
 * 
 */
function getConfigByLevel(level){
	for (var i in itemDataConfig){
		if (itemDataConfig[i].level==level) return itemDataConfig[i];
	}
	return null;
}

function getConfigModeByLevel(level){
	_config = getConfigByLevel(level);
	if (_config) return _config.mode;
	return null;
}


function getConfigByName(name){
	for (var i in itemDataConfig){
		for (p in itemDataConfig[i].percentages){
			if (itemDataConfig[i].percentages[p].name.indexOf(name>=0)) return itemDataConfig[i].percentages[p].value;
		}
	}
	return null;
}


/**
 * create hierarchical data structure from flat import table
 */
function createLaneHierarchy(){
	// create hierarchical base data from list
	ITEMDATA_DEPTH_LEVEL=ITEMDATA_NEST.length;
	
	itemData = _.nest(initiativeData.filter(function(d){
					if (ITEMDATA_FILTER){
						return eval("d."+ITEMDATA_FILTER.name+ITEMDATA_FILTER.operator+"\""+ITEMDATA_FILTER.value+"\"")
					}
					else{
						return true;
					}}),ITEMDATA_NEST);
	
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
		_itemData.level="root";
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
			_itemData.children[i].level=ITEMDATA_NEST[_start-1];

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
			if (getConfigModeByLevel(_itemData.children[i].level)=="equal"){
				_y2 = itemData.y2/_itemData.children.length;
			}
			// check manual percentage override
			var _config = getConfigByLevel(_itemData.children[i].level);
			if (_config){
				// ok got a config for this level - now check whether we find a matching config 
				// check for match in config.percentages
				if (_config.percentages){
					var _name = _itemData.children[i].name;
					for (var p in _config.percentages){
						console.log("...name:"+_name);
						if (_name.indexOf(_config.percentages[p].name)>=0 &&(CONTEXT==_config.percentages[p].context ||_config.percentages[p].context=="*") ){
							_y2=_config.percentages[p].value;
							console.log("_y2 override:"+_y2);
						}
					}
				}
				//console.log("config for: "+_itemData.children[i].name+" :"+_config);
				//_y2= _config;
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
 * WORKS ONLY IN NEST=3 LEVEL CONTEXT !!!
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

/**
calculates the offset to center elements / text per sublane 
*/
function getSublaneCenterOffset(sublane){
	console.log("+++++call getSublaneByNameNEW("+sublane+")");
	if(sublane){
		var _sublane = getSublaneByNameNEW(sublane);
		var _height = _sublane.yt2-_sublane.yt1;
		return -(_height/2);
	}
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

function getItemsBySublane(sublane){
	var _sub = getSublaneByNameNEW(sublane);
	if (_sub && _sub.children){
		return _sub.children;
	} 
}



/** return object array of lanes
*/
function getLanesNEW(){
	return getElementsByDepth(1+ITEMDATA_NEST.indexOf("lane"));
}

/** returns lane object by name
 */
function getLaneByNameNEW(name){
	var _lanes = getLanesNEW();
	for (i in _lanes){
		if ((_lanes[i].name).indexOf(name)>=0) return _lanes[i];
	}
	return null;
}


function getSublanesNEW(lane){
	if (lane) 
		return getLaneByNameNEW(lane).children;
	else
		return getElementsByDepth(1+ITEMDATA_NEST.indexOf("sublane"));
}

function getSublaneByNameNEW(name){
	var _sublanes = getSublanesNEW();
	for (i in _sublanes){
		if (_sublanes[i].name.indexOf(name)>=0) return _sublanes[i];
	}
	return null;
}

function getThemesNEW(){
	return getElementsByDepth(1+ITEMDATA_NEST.indexOf("theme"));
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
	var linechart = svg.select("#metrics").append("g").attr("id","linechart").style("visibility","hidden");

	var parseDate = d3.time.format("%d-%b-%y").parse;

	var _lane = getLaneByNameNEW("bwin");

	if (_lane){

		var _y1 = y(getLaneByNameNEW("bwin").yt1);
		var _y2 = y(getLaneByNameNEW("bwin").yt2);


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
		  });


		  x_line.domain(d3.extent(data, function(d) { return d.date; }));
		  y_line.domain([0,400]);

		linechart.append("path")
				.datum(data)
				.attr("class", "area")
				.attr("d", area);
		  
		  linechart.append("g")
			  .attr("class", "x axis")
			  .attr("transform", "translate(0," + _height + ")")
			  .call(xLineAxis);

		  linechart.append("g")
			  .attr("class", "y axis")
			  .style("font-size","6px")
			
			  .call(yLineAxis)
			.append("text")
			  .attr("transform", "translate (0,"+(_y2-5)+") rotate(0)")
			  .style("text-anchor", "start")
			  .style("fill", "white")
			  .style("opacity", 0.8)
			  .style("font-size", "12px")
			  .style("font-weight", "bold")
			  .text("NGR (mio EUR)");

		  linechart.append("path")
			  .datum(data)
			  .attr("class", "line")
			  .attr("d", line);
		});

		console.log("NGR sum:"+NGR_sum);
	}

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

/** helper to return fully qualified (FQ) name over all nest levels
 */
function getFQName(d){
	console.log("d:"+d);
	if (d){
			var _fq= NEST_ROOT;
			for (var i=0;i<ITEMDATA_NEST.length;i++){
				_fq=_fq+"."+d[ITEMDATA_NEST[i]];
			}
			return _fq;
	}
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
	
	var _filteredItems = initiativeData.filter(function(d){
		if (ITEMDATA_FILTER) return eval("d."+ITEMDATA_FILTER.name+ITEMDATA_FILTER.operator+"\""+ITEMDATA_FILTER.value+"\"");
		return true;
		});
	
	for(_d in _filteredItems){	
		
		console.log("metric caluclation: "+_d);
		_item = _filteredItems[_d];
		var _date = _item.actualDate;
		console.log("date: "+_date);
		
		var _sizingPD = parseInt(_item.Swag);
		var _delay = diffDays(_item.planDate,_item.actualDate);
				
		if (!isNaN(_sizingPD)) SIZING_TOTAL+=_sizingPD;
		if (new Date(_date)<WIP_START && new Date(_item.planDate)>KANBAN_START && _item.state=="done"){
			ITEMS_DONE++;
			if (!isNaN(_sizingPD)) SIZING_DONE+=_sizingPD;
		}
		else if(new Date(_date)>WIP_START && new Date(_date)<WIP_END) {
			ITEMS_WIP++;
 			if (!isNaN(_sizingPD)) SIZING_WIP+=_sizingPD;

		}
		else if (new Date(_date)>WIP_END && new Date(_item.planDate)>KANBAN_START){
			ITEMS_FUTURE++;
			
			if (!isNaN(_sizingPD)) SIZING_FUTURE+=_sizingPD;

		}
		
		//calculate delays
		if (_delay>0 && new Date(_item.planDate)>KANBAN_START){
			ITEMS_DELAYED++;
			DAYS_DELAYED = DAYS_DELAYED+_delay;
		}
		
	}
	ITEMS_TOTAL=ITEMS_DONE+ITEMS_WIP+ITEMS_FUTURE;
	SIZING_TOTAL = SIZING_DONE+SIZING_WIP+SIZING_FUTURE;	
}



/* --------------------------------------------------------- auto layout section ------------------------------------------------------------*/

function printItems(items){
	for (var p=0;p<items.length;p++){
		console.log("* items["+p+"]: id: "+items[p].id+" planDate: "+items[p].planDate);
	}
	
}
	
/**
 * takes an array of items and splits it up in segmented arrays by same planDates (current impl)
 *
 */	
function segmentItemsByDate(items){
	// first let's sort 
	console.log("***before sort***");
	printItems(items);
	
	
	items.sort(function(a,b){return new Date(a.planDate).getTime()-new Date(b.planDate).getTime();})
	
	console.log("***after sort***");
	printItems(items);
	var _segments=new Array();
	var e=0;
	while(items.length>0){
		console.log("in outer loop - e: "+e);
		_segments[e] = new Array();
			
		for (var i=0 ;i<items.length;i++){
			//console.log("in inner loop - i: "+i+  " i.planDate: "+items[i].planDate+"(e: "+e+") e.planDate: "+items[e].planDate);
			if (items[0].planDate == items[i].planDate){
				console.log("***e: "+e+" i: "+i+" same planDate found");
				_segments[e].push(items[i]);
				console.log("+++++ pushed in _segments["+e+"] id: "+items[i].id);
			}
			console.log("e="+e);
		}
		for(var j in _segments[e]){
			printItems(items);
			console.log("elements.length: "+items.length);
			console.log("-> kicking out ["+j+"]: id: "+items[0].id);
			console.log("e="+e);
			items.splice(0,1);
		}
	e++;			
	}
	console.log("...and now ? e="+e);

	
	return _segments;
}

/**
 * selects D3 SVG elements by item objects
 * */
function getElements(items){
		var _ids = new Array();
		for (var i in items){
			_ids.push(items[i].id);
		}
		console.log(_ids);	
		//var _ids=new Array(200,201,208,209)
		var _elements = d3.select("#items").selectAll("g").filter(function(d){return _ids.indexOf(d.id)>=0;});
		
		return _elements;
}


function autoLayout(){
	_lanes = getLanesNEW();
	for (l in _lanes){
		autoLayoutByLane(_lanes[l].name);
	}
	
}

function autoLayoutByLane(lane){
	_sublanes = getSublanesNEW(lane);
	for (s in _sublanes){
		autoLayoutBySublane(_sublanes[s].name);
	}
}

function autoLayoutBySublane(sublane){
	var _items = getItemsBySublane(sublane);
	var _segments = segmentItemsByDate(_items);
	
	for (var s in _segments){
		layout(getElements(_segments[s]));
	}
}

/**
 * layout core algorithm 
 * uses _getMetrics function to get proper info about transformed svg elements (getBBox is not sufficient...)
 */
function layout(elements){
	var _total =0;
	var _number = 0;
	var _yList =new Array();

	elements.each(function (d){
		var _m =get_metrics(d3.select(this).node());
		_total+=_m.height
		console.log("h: "+_m.height+" t:"+_total+" y: "+_m.y);
		_yList.push(_m.y);
		_number++;
	})

	//var _ids = d3.select("#items").selectAll("g")[0];
	var _min = d3.min(_yList);
	var _height = _total/_number;
	console.log("top y: "+_min);
	console.log("number elements: "+_number);
	console.log("_total height: "+_total);

	var i=0;
	var _space =0;
	elements.each(function (d){
		d3.select(this).attr("transform",function(d){return "translate(0,"+(_min+i-get_metrics(d3.select(this).node()).y)+")";});
		i+=get_metrics(d3.select(this).node()).height+_space;
	})
}


/**
    This function attempts to create a new svg "text" element, chopping 
     it up into "tspan" pieces, if the caption is too long
    => expects a text element and will add the tspans accordingly !
*/
function textarea(svg,caption, x, y,maxChars,lineHeight) {
	if (!maxChars) maxChars = 20;
	if (!lineHeight) lineHeight = 12;

	var words = caption.split(" ");
	var line = "";

	for (var n = 0; n < words.length; n++) {
		var testLine = line + words[n] + " ";
		if (testLine.length > maxChars || words[n]=="|")
		{
			svg.append("tspan")
			.attr("x",x)
			.attr("y",y)
			.text(line);
  
			if (words[n]=="|") words[n]="";
  
			line = words[n] + " ";
			y += lineHeight;
		}
		else {
			line = testLine;
		}
	}
	svg.append("tspan")
	.attr("x",x)
	.attr("y",y)
	.text(line);
}



/**
http://stackoverflow.com/questions/13046811/how-to-determine-size-of-raphael-object-after-scaling-rotating-it/13111598#13111598
*/
function get_metrics(el) {
    function pointToLineDist(A, B, P) {
        var nL = Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y));
        return Math.abs((P.x - A.x) * (B.y - A.y) - (P.y - A.y) * (B.x - A.x)) / nL;
    }

    function dist(point1, point2) {
        var xs = 0,
            ys = 0;
        xs = point2.x - point1.x;
        xs = xs * xs;
        ys = point2.y - point1.y;
        ys = ys * ys;
        return Math.sqrt(xs + ys);
    }
    var b = el.getBBox(),
        objDOM = el,
        svgDOM = objDOM.ownerSVGElement;
    // Get the local to global matrix
    var matrix = svgDOM.getTransformToElement(objDOM).inverse(),
        oldp = [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]],
        pt, newp = [],
        obj = {},
        i, pos = Number.POSITIVE_INFINITY,
        neg = Number.NEGATIVE_INFINITY,
        minX = pos,
        minY = pos,
        maxX = neg,
        maxY = neg;

    for (i = 0; i < 4; i++) {
        pt = svgDOM.createSVGPoint();
        pt.x = oldp[i][0];
        pt.y = oldp[i][1];
        newp[i] = pt.matrixTransform(matrix);
        if (newp[i].x < minX) minX = newp[i].x;
        if (newp[i].y < minY) minY = newp[i].y;
        if (newp[i].x > maxX) maxX = newp[i].x;
        if (newp[i].y > maxY) maxY = newp[i].y;
    }
    // The next refers to the transformed object itself, not bbox
    // newp[0] - newp[3] are the transformed object's corner
    // points in clockwise order starting from top left corner
    obj.newp = newp; // array of corner points
    obj.width = pointToLineDist(newp[1], newp[2], newp[0]) || 0;
    obj.height = pointToLineDist(newp[2], newp[3], newp[0]) || 0;
    obj.toplen = dist(newp[0], newp[1]);
    obj.rightlen = dist(newp[1], newp[2]);
    obj.bottomlen = dist(newp[2], newp[3]);
    obj.leftlen = dist(newp[3], newp[0]);
    // The next refers to the transformed object's bounding box
    obj.x = minX;
    obj.y = minY;
    obj.x2 = maxX;
    obj.y2 = maxY;
    obj.width = maxX - minX;
    obj.height = maxY - minY;
    return obj;
}



var PACKAGE_VERSION="20140105_1132";
var PACKAGE_VERSION="20140105_1225";
var PACKAGE_VERSION="20140107_1602";
var PACKAGE_VERSION="20140112_1144";
var PACKAGE_VERSION="20140113_2047";
var PACKAGE_VERSION="20140113_2117";
var PACKAGE_VERSION="20140114_1509";
var PACKAGE_VERSION="20140115_1756";
var PACKAGE_VERSION="20140115_2028";
var PACKAGE_VERSION="20140116_0800";
var PACKAGE_VERSION="20140117_0810";
var PACKAGE_VERSION="20140118_2252";
var PACKAGE_VERSION="20140120_1919";
var PACKAGE_VERSION="20140120_1944";
var PACKAGE_VERSION="20140120_1954";
var PACKAGE_VERSION="20140121_2131";
var PACKAGE_VERSION="20140122_2107";
var PACKAGE_VERSION="20140122_2126";
var PACKAGE_VERSION="20140123_0702";
var PACKAGE_VERSION="20140123_1817";
var PACKAGE_VERSION="20140123_1817";
var PACKAGE_VERSION="20140123_1824";
var PACKAGE_VERSION="20140124_1110";
var PACKAGE_VERSION="20140124_1113";
var PACKAGE_VERSION="20140124_1430";
var PACKAGE_VERSION="20140124_1457";
var PACKAGE_VERSION="20140124_1458";
var PACKAGE_VERSION="20140124_1506";
var PACKAGE_VERSION="20140124_1509";
var PACKAGE_VERSION="20140124_1510";
var PACKAGE_VERSION="20140124_1520";
var PACKAGE_VERSION="20140124_1551";
var PACKAGE_VERSION="20140124_1753";
var PACKAGE_VERSION="20140124_1831";
var PACKAGE_VERSION="20140128_1034";
var PACKAGE_VERSION="20140128_1331";
var PACKAGE_VERSION="20140128_1915";
var PACKAGE_VERSION="20140128_1920";
var PACKAGE_VERSION="20140128_1936";
var PACKAGE_VERSION="20140128_1937";
var PACKAGE_VERSION="20140129_1135";
var PACKAGE_VERSION="20140129_1156";
var PACKAGE_VERSION="20140129_1750";
var PACKAGE_VERSION="20140130_1811";
var PACKAGE_VERSION="20140130_1930";
var PACKAGE_VERSION="20140131_0828";
	
var PACKAGE_VERSION="20140131_1820";
	
