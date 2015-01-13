/** first version of mudularized kanban.js
* depends on:
	+ kanban_core.js
	+ kanban_util.js
	+ kanban_grid.js
	+ kanban_lanes.js
	+ kanban_queues.js
	+ kanban_items.js
	+ kanban_metrics.js
	+ kanban.js
* @version: 0.6
 * @author: Gerold Kathan (www.kathan.at)
 * @date: 2014-03-16
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

	----------------------- hide all results metrics 
	* hideMetrics([{"name":"goal","hide":true}])
	* d3.selectAll("[id*=NGR]").style("visibility","hidden")

	----------------------- hide all corporate total  metrics 
	* hideMetrics([{"name":"goal","hide":true}])
	 d3.selectAll("[id*=corp_metrics]").style("visibility","hidden")
	 d3.selectAll("[id*=metric_date]").transition().duration(300).attr("transform","translate(0,150)")
	* show 
	 d3.selectAll("[id*=corp_metrics]").style("visibility","visible")
	 d3.selectAll("[id*=metric_date]").transition().duration(300).attr("transform","translate(0,0)")


d3.select("#metrics_forecast1").transition().delay(300).style("visibility","hidden");d3.select("#metrics_forecast2").transition().duration(300).attr("transform","translate(-150,0)")
* d3.select("#metrics_forecast1").transition().delay(300).style("visibility","visible");d3.select("#metrics_forecast2").transition().duration(300).attr("transform","translate(0,0)")
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
	
	
	
	
	highlight metrics
	* ===============
	1)dim all 
	* d3.select("#metrics_forecast1").selectAll("[id*=metric_]").style("opacity",0.2)
	* d3.select("#metrics").selectAll("[id*=metric_]").style("opacity",0.2)
	2) highlight a specific one
	* d3.selectAll("[id*=metric_701]").style("opacity",1)
	
	
*/

var dcount=0;

// global variables
var CONTEXT="CONTEXT";




var releaseData;





// raster px configuration

var WIDTH =1200;
var HEIGHT = 1200;

var WHITEBOARD_WIDTH =1400;
var WHITEBOARD_HEIGHT = 900;


// height of the timeline header block where the dates are in 
var TIMELINE_HEIGHT = 20;


// width of the targets block after KANBAN_END and before LANELABELBOX_RIGHT
var TARGETS_COL_WIDTH=70;


var margin;
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
var KANBAN_START = new Date("2014-03-01");
var KANBAN_START_DEFAULT = new Date("2014-03-01");

// equals 1422662400000 in ticks
var KANBAN_END = new Date("2015-06-31");
var KANBAN_END_DEFAULT = new Date("2015-06-31");

// diff = 44.668.800.000
// 1 pixel (WIDTH = 1500) would be 29.779.200 units

//domain for y-axis => i am using percentage as domain => meaning "100"%
var Y_MAX =100; 
var Y_MIN=0;


var x,y,svg,whiteboard,drag,drag_x;


var dataversions={};

var COLOR_BPTY="#174D75";

var COLOR_TARGET = COLOR_BPTY;


var laneData;

// additional buttons state
var SHOW_ONLY_VERSION1=false;
var SHOW_ONLY_NONVERSION1=false;






//flippant test
var back;

var tooltip;


function setMargin(){
	var _marginXRight = 20;
	var _marginXLeft = 20;
	
	var _offsetXLeft=0;
	var _offsetXRight=0;
	var _offsetYTop =0;
	
	var _offsetXLeftBaseline = 100;
	var _offsetXLeftForecast1 = 150;
	var _offsetXLeftForecast2 =150;
	var _offsetXLeftGoal = 120;
	var _offsetYTopCorporate =150;
	
	_offsetXLeft = _marginXLeft+ (SHOW_METRICS_BASELINE*_offsetXLeftBaseline);
	_offsetXRight= _marginXRight + (SHOW_METRICS_FORECAST1*_offsetXLeftForecast1)+(SHOW_METRICS_FORECAST2*_offsetXLeftForecast2)+(SHOW_METRICS_GOAL*_offsetXLeftGoal);//+ (SHOW_METRICS_FORECAST1_ACTUAL*_offsetXLeftForecast1)+(SHOW_METRICS_FORECAST2_ACTUAL*_offsetXLeftForecast2)
	_offsetYTop = (SHOW_METRICS_CORPORATE*_offsetYTopCorporate);
	
	margin = {top: 100+_offsetYTop, right: _offsetXRight+TARGETS_COL_WIDTH+LANE_LABELBOX_RIGHT_WIDTH, bottom: 100, left: _offsetXLeft+150};
}

/**
*
*/
function init(){
	d3.select("#kanban").remove()
	
	setMargin();

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
		.attr("width", WIDTH)
		.attr("height", HEIGHT)
		.append("g")
		.attr("id","kanban")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	tooltip = d3.select("body")
		.append("div")
		.attr("id","tooltip");
	

	// zoom experiment
	//svg.call(d3.behavior.zoom().on("zoom", redraw));


	drag_x = d3.behavior.drag()
	.on("drag", function(d,i) {
		d.x += d3.event.dx
		//d.y += d3.event.dy
		d3.select(this).attr("transform", function(d,i){
			return "translate(" + [ d.x,d.y ] + ")"
		})
	});
}



/** zoom experiments...
 */
function redraw() {
  svg.attr("transform",
      "translate(" + d3.event.translate + ")"
      + " scale(" + d3.event.scale + ")");
}


/** main etry point
 * 
 */
function render(svgFile){
	
	checkServices();
	initShortcuts();
	
	d3.xml("data/"+svgFile, function(xml) {
		document.body.appendChild(document.importNode(xml.documentElement, true));
	
	/*
		$.when($.getJSON("/data/data.php?type="+laneTextTable),
				//$.getJSON("/data/data.php?type="+initiativeTable),
				$.getJSON("http://localhost:9999/initiatives"),
				//$.getJSON("/data/data.php?type="+metricsTable),
				$.getJSON("http://localhost:9999/metrics"),
				$.getJSON("/data/data.php?type="+releaseTable),
				//$.getJSON("/data/data.php?type="+postitTable),
				$.getJSON("http://localhost:9999/targets"),
				$.getJSON("/data/data.php?type="+targetTable),
				$.getJSON("/data/laneTextTargetPillars.json"))
	*/			
		$.when($.getJSON(dataSourceFor("lanetext")),
				$.getJSON(dataSourceFor("initiatives")),
				$.getJSON(dataSourceFor("metrics")),
				$.getJSON(dataSourceFor("releases")),
				$.getJSON(dataSourceFor("postits")),
				$.getJSON(dataSourceFor("targets")),
				$.getJSON(dataSourceFor("lanes")),
				$.getJSON("/data/laneTextTargetPillars.json"))


			.done(function(lanetext,initiatives,metrics,releases,postits,targets,lanes,pillars){
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
					if (targets[1]=="success") targetData=targets[0];
					else throw new Exception("error loading targets");
					if (lanes[1]=="success") laneData=lanes[0];
					else throw new Exception("error loading lanes");
					if (pillars[1]=="success") pillarData=pillars[0];
					else throw new Exception("error loading pillars");
					
					renderB2CGaming();
					//renderHolding();
				});
	}); // end xml load anonymous 

}


function setKanbanDefaultDates(){
	KANBAN_START = KANBAN_START_DEFAULT;
	KANBAN_END = KANBAN_END_DEFAULT;
}





function renderB2CGaming() {
	hideWhiteboard();
	
	HEIGHT=1100;
	WIDTH=1600;
	ITEM_SCALE=0.6;
	LANE_LABELBOX_RIGHT_WIDTH =200;
	
	setKanbanDefaultDates();
	
	enableAllMetrics();
	
		
	
	ITEMDATA_NEST= ["theme","lane","sublane"];
	ITEMDATA_FILTER = [{"name":"bm", "operator":"==", "value":"b2c gaming"}];
	CONTEXT=ITEMDATA_FILTER[0].value;
    loadPostits();

	/* not needed as initiativeData is already loaded 
	 * 
	$.when(	//$.getJSON("http://localhost:9999/initiatives"))
			//$.getJSON("/data/data.php?type=initiatives"))
	  		  $.getJSON(dataSourceFor("initiatives")))
	
			.done(function(initiatives){
					initiativeData=initiatives;
					// do not show sensitive data
	
					//safeMetrics();
	*/			
					
					// default view for Q1 review exercise
					q1_2014_reviewMetrics();
					
					drawAll();
					drawCustomPostits();
					initHandlers();
					
					if (AUTH=="bpty") hideNGR();
					
		//		});
	
}

function renderHistory() {
	hideWhiteboard();
	HEIGHT=1100;
	WIDTH=1500;
	ITEM_SCALE=0.8;
	//SHOW_METRICS=false;
	disableAllMetrics();
	LANE_LABELBOX_RIGHT_WIDTH =200;
	KANBAN_START=new Date("2012-01-01");
	KANBAN_END=new Date("2014-02-30");
	LANE_LABELBOX_RIGHT_WIDTH =100;
	
	ITEMDATA_NEST= ["theme","lane","sublane"];
	ITEMDATA_FILTER = {"name":"bm", "operator":"==", "value":"b2c gaming"};
	CONTEXT=ITEMDATA_FILTER.value;
    loadPostits();

	$.when(//$.getJSON("/data/data.php?type=initiatives"))
	  		  $.getJSON(dataSourceFor("initiatives")))
	
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					drawCustomPostits();
					initHandlers();
					
				});
}

function hideWhiteboard(){
	d3.selectAll("#whiteboard").style("visibility","hidden")
}

function renderWhiteboard() {
	
	whiteboard = d3.select("svg")
		.attr("width", WHITEBOARD_WIDTH)//width + margin.left + margin.right+300)
		.attr("height", WHITEBOARD_HEIGHT)//height + margin.top + margin.bottom)
		.append("g")
		.attr("id","whiteboard")
		.attr("transform", "translate( 20,20)");
		
		
 	$.when(//$.getJSON("/data/data.php?type=initiatives"))
	  		  $.getJSON(dataSourceFor("initiatives")))
			
			.done(function(initiatives){
					initiativeData=initiatives.filter(function(d){return d.state=="todo";});
					d3.select("#kanban").style("visibility","hidden");

					d3.select("#whiteboard").style("visibility","visible");
					
					_drawXlink(whiteboard,"#whiteboard",20,20,{"scale":3});

					//drawWhiteboardPostits();
					for (var i in initiativeData){
						// function Postit(id,text,x,y,scale,size,color,textcolor){
						var d = initiativeData[i];
						var p = new Postit(d.id,d.name+" "+d.name2,150+(i*15),150+(i*15),4,3,"yellow","black");
						p.setTitle("::"+d.lane);
						p.draw(whiteboard)
						
					}
					
//					drawAll();
//					drawCustomPostits();
					initHandlers();
					
				});
}



function renderBwin(){
	hideWhiteboard();
	HEIGHT=550;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =200;
	//SHOW_METRICS=true;
	enableAllMetrics();
	setKanbanDefaultDates();
	
	ITEM_SCALE=0.9;
	ITEMDATA_NEST= ["themesl","sublane"];
	//ITEMDATA_FILTER = [{"name":"lane", "operator":"==", "value":"bwin"},{"name":"lane", "operator":"==", "value":"shared"}];
	ITEMDATA_FILTER = [{"name":"lane", "operator":"==", "value":"bwin"}];
	
	CONTEXT=ITEMDATA_FILTER[0].value;

	$.when(//$.getJSON("http://localhost:9999/initiatives"))
			//$.getJSON("/data/data.php?type=initiatives"))
	  		  $.getJSON(dataSourceFor("initiatives")))
	
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					
					initHandlers();
				});
}

function renderBwinSecondLevel(){
	hideWhiteboard();
	HEIGHT=1000;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;

	setKanbanDefaultDates();
	//SHOW_METRICS=false;
	disableAllMetrics();
	
	ITEM_SCALE=0.5;
	ITEM_FONTSCALE=0.75;
	ITEMDATA_NEST= ["themesl","sublane"];
	//ITEMDATA_NEST= ["isCorporate","themesl","sublane"];
	//ITEMDATA_NEST= ["themesl","lane","sublane"];
	//ITEMDATA_NEST= ["lane","sublane"];
	//ITEMDATA_NEST= ["theme","themesl","sublane"];
	ITEMDATA_FILTER = [{"name":"lane", "operator":"==", "value":"bwin"}];
	CONTEXT=ITEMDATA_FILTER[0].value+".drill-in";
	
	console.log("*************************************************************************************calling getJSON..");
	
	$.when($.getJSON("/data/data.php?type=initiatives_sports"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}


function renderEntIT(){
	hideWhiteboard();
	HEIGHT=600;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	//SHOW_METRICS=false;
	disableAllMetrics();
	
	setKanbanDefaultDates();
	
	ITEM_SCALE=0.5;
	ITEM_FONTSCALE=0.75;
	ITEMDATA_NEST= ["themesl","sublane"];
	//ITEMDATA_NEST= ["isCorporate","themesl","sublane"];
	//ITEMDATA_NEST= ["themesl","lane","sublane"];
	//ITEMDATA_NEST= ["lane","sublane"];
	//ITEMDATA_NEST= ["theme","themesl","sublane"];
	ITEMDATA_FILTER = [{"name":"lane", "operator":"==", "value":"shared"}];
	CONTEXT=ITEMDATA_FILTER[0].value+".drill-in";
	
	console.log("*************************************************************************************calling getJSON..");
	
	$.when($.getJSON("/data/data.php?type=initiatives_entit"))
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
					//autoLayout();
				});
	
}

function renderHolding(){
	hideWhiteboard();
	HEIGHT=1200;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	
	setKanbanDefaultDates();
	//SHOW_METRICS=true;
	enableAllMetrics();
	ITEM_SCALE=0.6;
	ITEMDATA_NEST= ["bm","theme","lane","sublane"];
	ITEMDATA_FILTER = null;
	CONTEXT="holding";

	$.when(//$.getJSON("/data/data.php?type=initiatives"))
	  		  $.getJSON(dataSourceFor("initiatives")))

			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}

function renderShared(){
	hideWhiteboard();
	HEIGHT=600;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	//SHOW_METRICS=true;
	enableAllMetrics()
	setKanbanDefaultDates();
	
	ITEM_SCALE=0.9;
	ITEMDATA_NEST= ["lane","sublane"];
	ITEMDATA_FILTER = [{"name":"lane", "operator":"==", "value":"shared"}];
	CONTEXT=ITEMDATA_FILTER[0].value;

	$.when(//$.getJSON("/data/data.php?type=initiatives"))
	  		  $.getJSON(dataSourceFor("initiatives")))

			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});

}

function renderNewBiz(){
	hideWhiteboard();
	HEIGHT=800;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	//SHOW_METRICS=false;
	disableAllMetrics();
	
	setKanbanDefaultDates();
	
	ITEM_SCALE=0.9;
	ITEMDATA_NEST= ["theme","lane","sublane"];
	ITEMDATA_FILTER = [{"name":"bm", "operator":"==", "value":"new biz"}];
	CONTEXT=ITEMDATA_FILTER[0].value;

	$.when(//$.getJSON("/data/data.php?type=initiatives"))
	  		  $.getJSON(dataSourceFor("initiatives")))

			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}

function renderTechdebt(){
	hideWhiteboard();
	HEIGHT=550;
	WIDTH=1500;
	LANE_LABELBOX_RIGHT_WIDTH =100;
	//SHOW_METRICS=true;
	enableAllMetrics();
	setKanbanDefaultDates();
	
	ITEM_SCALE=0.9;
	ITEMDATA_NEST= ["lane","sublane"];
	ITEMDATA_FILTER = [{"name":"lane", "operator":"==", "value":"techdebt"}];
	CONTEXT=ITEMDATA_FILTER[0].value;

	$.when(//$.getJSON("/data/data.php?type=initiatives"))
	  		  $.getJSON(dataSourceFor("initiatives")))
			
			.done(function(initiatives){
					initiativeData=initiatives;
					drawAll();
					initHandlers();
				});
}

/**
 * renders the custom postits which can be created manually
 */
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
	
}


/* ------------------------ LANE sort EXPERIMENT -----------------------*/
/**
 * joins laneData with initiativeData
 * to get sorting information into each initiative item
 */
function joinInitiatives2LanesSort(){
	for (var i in initiativeData){
			var _lane = getItemByKey(laneData,"name",initiativeData[i].lane);
			if (_lane){
				 initiativeData[i]["laneSort"]=_lane.sort;
				if (_lane.sublanes){
					var _sublane = getItemByKey(_lane.sublanes,"name",initiativeData[i].sublane);
					if (_sublane) initiativeData[i]["sublaneSort"]=_sublane.sort;
				}
			}
	}
}
/* ------------------------ EXPERIMENT -----------------------*/


function drawAll(){
	init();

	
	/** multi column sort
	 * https://github.com/Teun/thenBy.js
	 */
	var firstBy=(function(){function e(f){f.thenBy=t;return f}function t(y,x){x=this;return e(function(a,b){return x(a,b)||y(a,b)})}return e})();


	joinInitiatives2LanesSort();
	
	//sorting hook
	//var s = firstBy(function (v1, v2) { return v1.lane < v2.lane ? -1 : (v1.lane > v2.lane ? 1 : 0); }).thenBy(function (v1, v2) { return v1.sublane < v2.sublane ? -1 : (v1.sublane > v2.sublane ? 1 : 0); });
	var s = firstBy(function (v1, v2) { return v1.laneSort - v2.laneSort})
			.thenBy(function (v1, v2) { return v1.sublaneSort - v2.sublaneSort });
	
	//initiativeData.sort(function(a,b){return (b.lane>a.lane) ?1 :-1});
	
	initiativeData.sort(s);
	initiativeData.sort(s);
  
	//????????????strange => does only work when called twice ????????????????????				
	
	// ITEMDATA_NEST= ["theme","lane","sublane"]; => defined in kanpan.php
	var _context = {"yMin":Y_MIN,"yMax":Y_MAX,"name":CONTEXT};
	itemTree = createLaneHierarchy(initiativeData,ITEMDATA_FILTER,ITEMDATA_NEST,_context);
	targetTree = createLaneHierarchy(targetData,ITEMDATA_FILTER,ITEMDATA_NEST,_context);
	
	
	
	// kanban_items.js
	drawInitiatives();
	// kanban_items.js
	drawTargets();
	drawOverviewMetaphors(svg);
	drawMetrics();
	// kanban_grid.gs
	drawVision();
	drawReleases();
	drawVersion();
	drawLegend();
	

	drawGuides();
	
	d3.select("#whiteboard").style("visibility","hidden");
	
	dcount++;
	
  
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
	//insanity check
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


/**
 * high level metaphors (tree and stuff...)
 */
function drawOverviewMetaphors(svg){
	
	var gMetaphors = svg.append("g").attr("id","metaphors").style("visibility","hidden");
	
	// demarcation line between themes
	var _y2 = y(getSublaneByNameNEW("shared").yt1);
	_drawLine(gMetaphors,0,_y2,x(KANBAN_END)-80,_y2,"metaphorDemarcationLine");
	
	
	
	var _y = _drawThemeDemarcation(gMetaphors,"metaphorDemarcationLineThin");
	
	// and a shaded "enabling rect"
	_drawRect(gMetaphors,x(KANBAN_START)-margin.left,_y2,x(KANBAN_END)+margin.right+margin.left,(height-_y2),"metaphorEnablingBlock");
	
	
	// same as the grid.drawVision trangle
	var _x = x(KANBAN_START.getTime()+(KANBAN_END.getTime()-KANBAN_START.getTime())/2)-130;
	//tree.height is 1000px 
	_drawXlink(gMetaphors,"#tree",_x,0,{"scale":(height/800),"opacity":0.7});
	
	_drawXlink(gMetaphors,"#timeline",0,-85,{"scale":(1,(x(KANBAN_END)-x(KANBAN_START))/1000),"opacity":0.3});
	_drawText(gMetaphors,"timeline",x(KANBAN_END)-55,-45,{"size":"20px","color":"#aaaaaa","weight":"bold","anchor":"end"});
	
	_drawBracket(gMetaphors,"grey","right",x(KANBAN_END)-60,0,1.5,(_y/100),"bracket",0.2);
	_drawBracket(gMetaphors,"grey","right",x(KANBAN_END)-60,_y,1.5,(height-_y)/100,"bracket",0.2);
	
	_drawText(gMetaphors,"REVENUE STREAMS",x(KANBAN_END)-10,_y/2,{"size":(height-_y)/12,"opacity":0.7,"color":"#999999","weight":"bold","mode":"tb","anchor":"middle"});
	_drawText(gMetaphors,"ENABLING STREAMS",x(KANBAN_END)-10,_y+20,{"size":_y/18,"opacity":0.7,"color":"#999999","weight":"bold","mode":"tb"});
	
	_drawRect(gMetaphors,x(KANBAN_START)-margin.left,height,x(KANBAN_END)+margin.right+margin.left,(height+200),"metaphorCultureBlock");
	
	_drawLine(gMetaphors,-300,height,x(KANBAN_END)+500,height,"metaphorDemarcationLineThin");
	
	_drawText(gMetaphors,"PEOPLE & CULTURE",20,height+60,{"size":_y/15,"opacity":0.7,"color":"#ffffff","weight":"bold"});
	_drawText(gMetaphors,"LEADERSHIP",x(KANBAN_END)-20,height+60,{"size":_y/15,"opacity":0.7,"color":"#ffffff","weight":"bold","anchor":"end"});
	
}



/**
 * soccer world championship 2014 block => layer "events"
 */
function drawWC2014(){
	
	if (KANBAN_END > new Date("2014-07-13") && KANBAN_START < new Date("2014-05-13")){
	
		var gEvents = svg.append("g").attr("id","events");
		var _x1 = x(new Date("2014-06-13"));
		var _x2 = x(new Date("2014-07-13"));
		
		gEvents.append("rect")
		.attr("x",_x1)
		.attr("width",(_x2-_x1))
		.attr("y",0)
		.attr("height",y(100))
		.style("fill","white")
		.style("opacity",0.4);
		
		_drawXlink(gEvents,"#wc2014",(_x1+15),-65,{"scale":.3});

	}
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
				_drawLine(d3.select(this),x(_releaseDate),-5,x(_releaseDate),height+5,"releaseLine",[{"start":"rect_blue"}]);
		
			_drawText(d3.select(this),d.ReleaseName,x(_releaseDate),-15,{"size":"7px","weight":"bold","opacity":0.5,"color":"blue","rotate":-45})
		
		}
	});
			
}

/**
 * prototype for showing inline graphcharts
 */
function drawLineChart()
{
	var linechart = svg.select("#metrics").append("g").attr("id","linechart").style("visibility","hidden");
	var parseDate = d3.time.format("%d-%b-%y").parse;
	var _lane = getLaneByNameNEW("bwin");

	if (_lane){
	var _y1 = y(getLaneByNameNEW("bwin").yt1);
		var _y2 = y(getLaneByNameNEW("bwin").yt2);
		var _height = _y2-_y1;
		var x_line = d3.time.scale().range([0, x(WIP_START)]);
		var y_line = d3.scale.linear().range([_height,_y1]);

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




	
var PACKAGE_VERSION="20140309_1000";
var PACKAGE_VERSION="20140312_1759";
	var PACKAGE_VERSION="20140312_1759";
	
var PACKAGE_VERSION="20140312_1807";
	var PACKAGE_VERSION="20140313_0834";
	
var PACKAGE_VERSION="20140320_0954";
	var PACKAGE_VERSION="20140320_1428";
	var PACKAGE_VERSION="20140321_1610";
	var PACKAGE_VERSION="20140321_1616";
	var PACKAGE_VERSION="20140321_1628";
	var PACKAGE_VERSION="20140321_1805";
	
var PACKAGE_VERSION="20140325_0846";
	
var PACKAGE_VERSION="20140409_1902";
	
var PACKAGE_VERSION="20140409_1909";
	
var PACKAGE_VERSION="20140410_1028";
	var PACKAGE_VERSION="20140410_1427";
	var PACKAGE_VERSION="20140410_1634";
	var PACKAGE_VERSION="20140410_1718";
	var PACKAGE_VERSION="20140410_1840";
	var PACKAGE_VERSION="20140415_1903";
	
var PACKAGE_VERSION="20140416_1754";
	var PACKAGE_VERSION="20140417_0900";
	
var PACKAGE_VERSION="20140418_1430";
	
var PACKAGE_VERSION="20140418_1434";
	var PACKAGE_VERSION="20140418_1444";
	var PACKAGE_VERSION="20140418_1529";
	var PACKAGE_VERSION="20140418_1803";
	
var PACKAGE_VERSION="20140422_0942";
	var PACKAGE_VERSION="20140422_1010";
	
var PACKAGE_VERSION="20140429_1844";
	var PACKAGE_VERSION="20140430_1457";
	var PACKAGE_VERSION="20140430_1627";
	
var PACKAGE_VERSION="20140508_0944";
	var PACKAGE_VERSION="20140508_1925";
	var PACKAGE_VERSION="20140508_1927";
	var PACKAGE_VERSION="20140508_2128";
	var PACKAGE_VERSION="20140509_0828";
	
var PACKAGE_VERSION="20140509_0906";
	var PACKAGE_VERSION="20140509_0912";
	var PACKAGE_VERSION="20140509_0914";
	var PACKAGE_VERSION="20140509_1003";
	var PACKAGE_VERSION="20140509_1341";
	var PACKAGE_VERSION="20140509_1632";
	var PACKAGE_VERSION="20140509_1816";
	
var PACKAGE_VERSION="20140523_1817";
	
var PACKAGE_VERSION="20140527_1309";
	var PACKAGE_VERSION="20140527_1607";
	var PACKAGE_VERSION="20140527_1649";
	var PACKAGE_VERSION="20140527_1658";
	var PACKAGE_VERSION="20140527_1821";
	var PACKAGE_VERSION="20140527_1823";
	var PACKAGE_VERSION="20140527_1824";
	var PACKAGE_VERSION="20140528_1323";
	
var PACKAGE_VERSION="20140528_1811";
	var PACKAGE_VERSION="20140624_0935";
	
var PACKAGE_VERSION="20150113_0808";
	var PACKAGE_VERSION="20150113_0827";
	
