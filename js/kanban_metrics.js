/** first version of mudularized kanban.js
 * extracted kanban_core stuff (hierarchy calculation...)
 * @version: 0.6
 * @author: Gerold Kathan (www.kathan.at)
 * @date: 2014-03-16
 * @copyright: 
 * @license: 
 * @website: www.kathan.at
 */


var LANE_LABELBOX_LEFT_WIDTH =100;
var LANE_LABELBOX_RIGHT_WIDTH =100;
var LANE_LABELBOX_RIGHT_START;



var metricData;
//current metric data is on 
var METRIC_LEVEL="lane";



// metric dates
var METRICDATES_DATA;


// y coord of marker / dates 
var MARKER_DATE_TOP = -30;

//width of a metric column
var METRIC_WIDTH=150;

// 
var METRIC_BASE_Y = -220;
var METRIC_PIE_BASE_Y = METRIC_BASE_Y+75;
var METRIC_CX_BASE_Y = METRIC_BASE_Y+50;
var METRIC_SHARE_BASE_Y = METRIC_BASE_Y+35;

var METRIC_BASE_X_OFFSET = LANE_LABELBOX_LEFT_WIDTH +120;


//bracket y offset
var METRIC_BRACKET_Y_OFFSET = 40;

// width of the targets block after KANBAN_END and before LANELABELBOX_RIGHT
var TARGETS_COL_WIDTH=10;


var METRICS_SCALE=1;


//config of metrics

/* 
 baseDate:
 * list of forecast calculation dates, historical => e.g. initial forecast was calculated on 2013-10-31, first reforecast was done on 2014-03-11, ....")
 */
METRICDATES_DATA=[
					{"dimension": "baseline", "data": {"sub":"results for","date":new Date("2013-12-31"),"title":"BASELINE 2013" ,"subBase":"calc-base","baseDate":["2013-12-31"]}},
					{"dimension": "forecast1", "data": {"sub":"best-case","date":new Date("2014-12-31"),"title":"FORECAST 2014" ,"subBase":"calc-base","baseDate":["2013-10-31","2014-03-11"]}},
					{"dimension": "forecast2", "data": {"sub":"best-case","date":new Date("2015-12-31"),"title":"FORECAST 2015" ,"subBase":"calc-base","baseDate":["2013-10-31","2014-03-11"]}},
					{"dimension": "goal", "data": {"sub":"norbert says","date":new Date("2015-12-31"),"title":"GOAL" ,"subBase":"calc-base","baseDate":["2013-10-31","2014-03-11"]}}
		];


var SHOW_METRICS = false;

var SHOW_METRICS_BASELINE;
var SHOW_METRICS_FORECAST1;
var SHOW_METRICS_FORECAST2;

// experiemnt with actual snapshot metrics column
var SHOW_METRICS_FORECAST1_ACTUAL=false;
var SHOW_METRICS_FORECAST2_ACTUAL=false;

var SHOW_METRICS_GOAL;
var SHOW_METRICS_CORPORATE;
var SHOW_METRICS_NGR;



// ----------------------------------------------------------------------------------------------------------------
// -------------------------------------------- METRICS SECTION ---------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------

function drawMetrics(){
	d3.select("#metrics").remove();
	
	

		//console.log("----------------------------->drawMetrics:svg="+svg);
		var i=0;
		var gMetrics= svg.append("g").attr("id","metrics");//.style("visibility","hidden");
					
		// y space between KPIs
		var _kpiYOffset = 15;
		var _yTotal = MARKER_DATE_TOP;
		//left			
		var _primaryXOffset = METRIC_BASE_X_OFFSET-60;
		var _secondaryXOffset = METRIC_BASE_X_OFFSET-85;
		//right
		var _metricXBaseRight= TARGETS_COL_WIDTH+LANE_LABELBOX_RIGHT_WIDTH;
		
		var _primaryXOffsetRight = _metricXBaseRight +120;
		var _secondaryXOffsetRight = _metricXBaseRight+30;
	
	// all KPIs & results in baseline
	
		var _baselineResultSum=0;
		var _targetResultSum1=0;
		var _targetResultSum2=0;
		
		//var _bOffset = 0;
		var _primTextYOffset=18; 
	
// -------------------------- baseline -----------------------------------------------
		var gMetricsBaseline = gMetrics.append("g").attr("id","metrics_baseline");
		_baselineResultSum = _renderMetrics(gMetricsBaseline,"baseline","",(x(KANBAN_START)-_primaryXOffset),(x(KANBAN_START)-_secondaryXOffset),METRICS_SCALE);


	var _offset = 70;
// -------------------------- forecast 1-year (2014) -------------------------------
		
		// !!! forecast is always for ONE target date = e.g. forecast for 2014
		// forecast can be re-forecasted multiple times - and it is essential to show the history and deltas between each reforecast 
		

		var gMetricsForecast1 = gMetrics.append("g").attr("id","metrics_forecast1");
		// read configured basedate
		// take the last date in the baseDate array as the one to show 
		var _baseDate1 = _.last(_getDataBy("dimension","forecast1",METRICDATES_DATA).data.baseDate);
		_targetResultSum1 = _renderMetrics(gMetricsForecast1,"forecast1",_baseDate1,x(KANBAN_END)+_primaryXOffsetRight-_offset,x(KANBAN_END)+_secondaryXOffsetRight,METRICS_SCALE);
		
		if (SHOW_METRICS_FORECAST2)
			d3.select("#metrics_forecast1").style("opacity",0.5);

		
		_primaryXOffsetRight += METRIC_WIDTH;
		_secondaryXOffsetRight += METRIC_WIDTH;

		_drawMetricSeparator(gMetrics,x(KANBAN_END)+_secondaryXOffsetRight-40);
		
// -------------------------- forecast 2-years (2015)-------------------------------
		// read configured basedate
		// take the last date in the baseDate array as the one to show 
		var _baseDate2 = _.last(_getDataBy("dimension","forecast2",METRICDATES_DATA).data.baseDate);
		var gMetricsForecast2 = gMetrics.append("g").attr("id","metrics_forecast2");
		_targetResultSum2 = _renderMetrics(gMetricsForecast2,"forecast2",_baseDate2,x(KANBAN_END)+_primaryXOffsetRight-_offset,x(KANBAN_END)+_secondaryXOffsetRight,METRICS_SCALE);

		_primaryXOffsetRight += METRIC_WIDTH;
		_secondaryXOffsetRight += METRIC_WIDTH;

	

// ------------------------------ potentials ------------------------------------------------
		var _baseDateG = _.last(_getDataBy("dimension","goal",METRICDATES_DATA).data.baseDate);
		
		_primaryXOffsetRight-=120;

		var gMetricsRisk = gMetricsForecast2.append("g").attr("id","metrics_risk");

		var _yRisk = 50;
		var _xRisk = x(KANBAN_END)+_primaryXOffsetRight+30;
	/* ----------------------------------------- opportunities -----------------------------------------*/
		_drawPotentials(gMetricsRisk,"forecast2","opportunity",_baseDateG,_xRisk,_yRisk);

	/* ----------------------------------------- risks ------------------------------------------------ */
		_drawPotentials(gMetricsRisk,"forecast2","risk",_baseDateG,_xRisk,_yRisk+220);

	/* ------------------------------------- goal column ------- ------------------------------------*/
		var gMetricsGoal = gMetricsForecast2.append("g").attr("id","metrics_goal");
		
		_drawMetricDate(gMetricsGoal,x(KANBAN_END)+_primaryXOffsetRight,METRIC_BASE_Y,_getDataBy("dimension","goal",METRICDATES_DATA).data);
		
		 var _goalResult = metricData.filter(function(d){return d.class=="result" && d.dimension=="goal" });
		_drawTextMetric(gMetricsGoal,_goalResult[0],"metricBig",x(KANBAN_END)+_primaryXOffsetRight+30,_yTotal,10,"left",METRICS_SCALE);

		var _goalKpis = metricData.filter(function(d){return d.class=="kpi" && d.dimension=="goal" && d.baseDate==_baseDateG});
		var _yTotalKpiBase = _yTotal-10;
		for (var k in _goalKpis){
			_drawTextMetric(gMetricsGoal,_goalKpis[k],"metricSmall",x(KANBAN_END)+_primaryXOffsetRight+30,_yTotalKpiBase-(((getInt(k)+1)*15)*METRICS_SCALE),6,"right",METRICS_SCALE);
		}
		
		//delta symbol
		_drawSign(gMetricsGoal,x(KANBAN_END)+_primaryXOffsetRight-36,_yTotal+20,"icon_delta",0.4);
		_drawBracket(gMetricsGoal,"blue","bottom",x(KANBAN_END)+_primaryXOffsetRight-85,_yTotal+7,1.1,.8,"bracket",0.1);
		
		var _diff = _goalResult[0].number-_targetResultSum2;
		var _delta = {"number":"= "+_diff ,"scale":"mio EUR" ,"type":"missing", "sustainable":-1 };

		_drawTextMetric(gMetricsGoal,_delta,"metricBig",x(KANBAN_END)+_primaryXOffsetRight+30,_yTotal+(30*METRICS_SCALE),10,"left",METRICS_SCALE);
		// delta end
/* ------------------------------------- linechart prototype ------------------------------------*/
	drawLineChart();
	
	
	// based on SHOW_ flags hide or show certain metric columns / rows
	filterMetrics();
	
	
	//}	

} //end drawMetrics


/** risks and opportunitis from metricData
 */
function _drawPotentials(svg,dimension,type,baseDate,xBase,yBase,scale){
	var _data= metricData.filter(function(d){return (d.dimension==dimension) && (d.class==type) && d.baseDate==baseDate});
	var _ySign;
	
	if(!scale) scale=METRICS_SCALE;
	
	for (var i in _data){
		_drawTextMetric(svg,_data[i],"metricBig",xBase,yBase+((i*20)*scale),10);
	}

	if (type=="risk")_ySign = yBase-65;
	else if (type=="opportunity")_ySign= yBase+((i*20)*scale)+10;
	
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
 * @dimension "baseline,forecast1,forecast2"
 * 
 */
function _renderMetrics(svg,dimension,baseDate,x1Base,x2Base,scale){
	// y space between KPIs
	var _kpiYOffset = 15;
	var _primTextYOffset=18; 
	//var METRIC_DATES_Y=-190;

	if (!scale) scale=METRICS_SCALE;
	_kpiYOffset = _kpiYOffset*scale;
	_primTextYOffset = _primTextYOffset*scale;
	
	//basedate hardcode is just experiemnt for re-forecasts .....
	// currently there a multiple values per dimension allowed qualified by "baseDate"	
	var _met = metricData.filter(function(d){return d.dimension==dimension && ( (d.class=="result") || (d.class=="kpi")) &&(d.baseDate==baseDate)});
	
	var _metByLane = _.nest(_met,"lane");
	
	var _kpiDir = "left";
	var _resultDir="right";
	
		
	var gMetrics = svg.append("g").attr("id","lane_metrics");
	
	if (dimension=="baseline"){
			_kpiDir="right";
			_resultDir="left";
	}
	
	var _resultSum=0;
	var _deltaSum=0;
	var _delta = 0;
	
	
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
					_drawTextMetric(gMetrics,_mm,"metricSmall",x2Base,_y+_secTextYOffset,6,_kpiDir,scale);
				}
				else if (_mm.class=="result") {
					_delta = _drawTextMetric(gMetrics,_mm,"metricBig",x1Base,_y+_primTextYOffset,10,_resultDir,scale);
					console.log("*** _delta= "+_delta);
					
					if (_mm.sustainable==1) {
						_resultSum = _resultSum+parseInt(_mm.number);
						_deltaSum = _deltaSum+parseInt(_delta);
						console.log("******* _deltaSum = "+_deltaSum);
						
					}
				}
				i++
			}
		}
	}

	//metric date 
	_drawMetricDate(svg,x1Base-60,METRIC_BASE_Y,_getDataBy("dimension",dimension,METRICDATES_DATA).data);

	// calculated sum
	//[TODO] build a proper class structure = this would be a TextMetric m = new TextMetric(...)
	var _yTotal = MARKER_DATE_TOP;
	var _total = {"dimension":dimension,"number":_resultSum ,"scale":"mio EUR" ,"type":"NGR", "sustainable":1, "delta":_deltaSum };

	console.log("************************************************** _total.delta = "+_total.delta);

	// corp result
	var gCorp = svg.append("g").attr("id","corp_metrics");
	_drawTextMetric(gCorp,_total,"metricBig",x1Base,_yTotal,10,_resultDir,scale);

	// corp KPIs
	var _corpKpis = metricData.filter(function(d){return d.dimension==dimension && d.baseDate==baseDate && d.lane=="corp" &&d.class=="kpi" &&(d.type=="churn rate" || d.type=="customer value" ||d.type=="channel reach"||d.type=="availability")});
	
	var _yTotalKpiBase = _yTotal-(10*METRICS_SCALE);
	for (var k in _corpKpis){
		_drawTextMetric(gCorp,_corpKpis[k],"metricSmall",x2Base,_yTotalKpiBase-(((getInt(k)+1)*15)*METRICS_SCALE),6,_kpiDir,scale);
	}

	// pie
	var _yPie = METRIC_PIE_BASE_Y;
	_met = metricData.filter(function(d){return d.dimension==dimension  && d.baseDate==baseDate && d.type=="marketshare" && d.scale=="% sustainable"});


	_drawPie(gCorp,dimension,_met[0],x1Base-20,_yPie);

	// cx baseline 
	var _yCX =METRIC_CX_BASE_Y;
	_met = metricData.filter(function(d){return d.dimension==dimension  && d.baseDate==baseDate && d.type=="loyaltyindex"});
    

    var _met2 = metricData.filter(function(d){return d.dimension==dimension && d.type=="promoterscore"});
	var _cxData = {"loyalty":_met[0].number,"promoter":_met2[0].number};

	_drawCX(gCorp,_cxData,x1Base+25,_yCX);
	
	
	//market share overall
	var _yMarketShare = METRIC_SHARE_BASE_Y;
	_met = metricData.filter(function(d){return d.dimension==dimension  && d.baseDate==baseDate && d.type=="marketshare" && d.scale=="% overall"});
	
	
	_drawTextMetric(gCorp,_met[0],"metricBig",x1Base-10,_yMarketShare,10,"left");
	
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



function checkPreviousForecasts(metric){
	var _history = new Array();
	for (var i in metricData){
		var _m = metricData[i];
		if (_m.class==metric.class&&_m.dimension==metric.dimension&&_m.type==metric.type&&_m.lane==metric.lane&&_m.date==metric.date&&_m.scale==metric.scale){
			// do not add the identical metric and also only add older than current baseDate
			if (_m.id !=metric.id && _m.baseDate < metric.baseDate){
				_history.push(_m);
			}
		}
	}

	return _history;
}

/**
 *@direction can be "left" = default or "right" 
 * => left = first number then scale
 * => right = first scale then number
 * 
 * returns _delta or 0
 * */
function _drawTextMetric(svg,metric,css,x,y,space,direction,scale){
		var _metricColor;
		var _deltaOffset=75;
		if (metric.sustainable==1) _metricColor=COLOR_BPTY;//"174D75";
		//risks
		else if (metric.sustainable==-1){
			_metricColor="ED1C24";
			_deltaOffset = 105;
		}
		//opportunities
		else if (metric.sustainable==2){
			_metricColor="00A14B";
			_deltaOffset = 105;
		}
		
		else _metricColor="grey";
		
	
		// experiment with trending
		// lets see whether we have for this dimension+date multiple class.lane.type metrics 
		// means do we have previous forecasts ? => if yes we can show a trending indicator
	
		// i have the concrete metric which is configured to be shown
		// _history = checkPreviousForecasts(metric);
	
		if(!scale) scale=METRICS_SCALE;
		space=space*scale;
		
		var _anchor = "end";
		var _xNumber = x;
		if (direction=="right") {
			_anchor = "start";
			_xNumber = _xNumber+space;
		}
		
		
		var gMetric=svg.append("g").attr("id","metric_"+metric.id+"."+metric.lane+"."+metric.class+"."+metric.type);
		
		gMetric.append("text")
			.text(metric.number)
			.attr("transform","translate ("+_xNumber+","+(y+space/2)+") scale("+scale+")")
			//.attr("x",_xNumber)
			//.attr("y",y+space/2)
			.style("fill",_metricColor)
			.style("text-anchor",_anchor)
			.attr("class",css+"Number");
			
		_anchor = "start";
		if (direction=="right") _anchor = "end";
		
		gMetric.append("text")
			.text(metric.scale)
			.attr("transform","translate ("+(x+space/2)+","+(y-space/2)+") scale("+scale+")")
			//.attr("x",x+space/2)
			//.attr("y",y-space/2)
			.style("fill",_metricColor)
			.style("text-anchor",_anchor)
			.attr("class",css+"Scale");

		gMetric.append("text")
			.text(metric.type)
			.attr("transform","translate ("+(x+space/2)+","+(y+space/2)+") scale("+scale+")")
			//.attr("x",x+space/2)
			//.attr("y",y+space/2)
			.style("fill",_metricColor)
			.style("text-anchor",_anchor)
			.attr("class",css+"Type");
			
		var _previous = checkPreviousForecasts(metric);
		var _delta = 0;
		// now we have to take the last of the array as default = show trend from existing to moist recent previous forecast
		
		if ((_previous.length>0 && !isNaN(metric.number )) || metric["delta"]!=null ){
			_pmetric = _.last(_previous);
			// do some calculations
			// stupid javascript sucks in decimal/float
			
			if (metric["delta"]!=null) _delta = metric.delta;
			else _delta = Math.round(((metric.number*100)-(_pmetric.number*100)))/100;
			
			if (metric.dimension!="baseline"){
				var _color;
				var _xoffset;
				var _yoffset;
				var _symbol;
				var _scale=scale*0.8;
				
				_xoffset = _deltaOffset*scale;
				_yoffsetText = -5;
				_yoffsetSymbol = -1;
				
				
				if (metric.class=="kpi") {
					_scale =scale*0.5;
					_xoffset = 85*scale;
					_yoffsetSymbol=1;
					_yoffsetText=0;
				}
					
				
				if (_delta >0) {
					_color="green";
					_symbol = "triangle-up";
					_delta = "+"+_delta;
					
				}
				else if (_delta==0){
					_color = "grey";
					_symbol = "circle";
				}
				else {
					_color="red";
					_symbol="triangle-down";
					// the triangle-down needs slight different y-position ..
					if (metric.class=="result") _yoffsetSymbol=-2;
				}
				
				// draw trend indicator 
				gMetric.append("path")
				.attr("transform","translate("+(x+_xoffset)+","+(y-_yoffsetSymbol)+") rotate("+(0)+") scale("+_scale+")")
				.attr("d",d3.svg.symbol().type(_symbol))
				.style("fill",_color)
				
				// and the delta
				gMetric.append("text")
				.text(_delta)
				.attr("transform","translate ("+(x+_xoffset-(8*_scale))+","+(y-_yoffsetText)+") scale("+_scale+")")
				.style("fill",_color)
				.style("text-anchor","end")
				.style("font-weight","bold")
				.style("font-size","10px");
			}
		}	
		
		console.log("...returning _delta of: "+_delta);
		return _delta;	
}

function _drawMetricSeparator(svg,x){
		_drawLine(svg,x,METRIC_BASE_Y,x,height,"themeLine");
}



/**date marker for metrics
 * */
function _drawMetricDate(svg,x,y,data){
	var gDate = svg.append("g").attr("id","metric_date_"+data.title);
	_drawText(gDate,data.title,x,y,16,"bold","start",COLOR_BPTY,null);
	
	_drawText(gDate,data.sub+": ",x,y+7,5,"normal","start",COLOR_BPTY,null);
	_drawText(gDate,data.date.toString('yyyy-MM-dd'),x+30,y+7,6,"bold","start",COLOR_BPTY,null);
	
	_drawText(gDate,data.subBase+": ",x,y+14,5,"normal","start",COLOR_BPTY,null);
	_drawText(gDate,data.baseDate.toString('yyyy-MM-dd'),x+30,y+14,6,"bold","start",COLOR_BPTY,null);

}



/** helper function
 * */
function _drawPie(svg,id,_data,x,y,scale){
	
	if (!scale)scale=METRICS_SCALE;
	
	var radius =40*scale;//40*METRICS_SCALE;


    var data = [{"type":"sustainable","percentage":_data.number},{"type":"notsustainable","percentage":100-_data.number}];
    
	var arc = d3.svg.arc()
		.outerRadius(radius - (10*scale))
		.innerRadius(0);

	var pie = d3.layout.pie()
		.sort(null)
		.value(function(d) { return d.percentage; });

	var gPie = svg.append("g")
			.attr("id","metric_pie_"+_data.type)
		.selectAll(".arc")
			.data(pie(data))
			.enter().append("g")
			.attr("transform","translate("+x+","+y+")")

	gPie.append("path")
	  .attr("d", arc)
	  .style("fill", function(d) { if (d.data.type=="sustainable") return COLOR_BPTY; else return "grey";})
	  .style("stroke", "#ffffff")
	  .style("stroke-width", 4*scale+"px");

	gPie.append("text")
	  .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
	  .attr("dy", ".35em")
	  .style("text-anchor", "middle")
	  .style("fill", "#ffffff")
	  .style("font-weight", "bold")
	  .style("font-size", function(d) { return (6+d.data.percentage/8)*scale+"px";})
	  .text(function(d) { return d.data.percentage; })
		.append("tspan")
		.text("%")
		.style("font-size","4px")
		.style("font-weight","normal")
		.append("tspan");
	
}

function _drawCX (svg,data,x,y,scale){
		var gCX = svg.append("g").attr("id","metric_CX");
		
		if(!scale) scale=METRICS_SCALE;
		
		gCX.append("use").attr("xlink:href","#customer")
		.attr("transform","translate ("+x+","+y+") scale("+(.5*scale)+")");
	
		gCX.append("text")
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

		gCX.append("text")
		.text("promoter-score")
		.style("font-size","5px")
		.style("font-weight","normal")
		.style("fill",COLOR_BPTY)
		.attr("x",x-4)
		.attr("y",y-2)
		
		gCX.append("text")
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
			
		gCX.append("text")
		.text("loyalty-index")
		.style("font-size","5px")
		.style("font-weight","normal")
		.style("fill",COLOR_BPTY)
		.attr("x",x)
		.attr("y",y+50);
}





function enableAllMetrics(){
	SHOW_METRICS_BASELINE = true;
	SHOW_METRICS_FORECAST1 = true;
	SHOW_METRICS_FORECAST2 = true;
	SHOW_METRICS_GOAL = true;
	SHOW_METRICS_CORPORATE = true;
	setMargin();
	//d3.selectAll("#metrics_baseline,#metrics_forecast1,#metrics_forecast2").style("visibility","hidden");
	
}

function disableAllMetrics(){
	SHOW_METRICS_BASELINE = false;
	SHOW_METRICS_FORECAST1 = false;
	SHOW_METRICS_FORECAST2 = false;
	SHOW_METRICS_GOAL = false;
	SHOW_METRICS_CORPORATE = false;
	setMargin();
	//d3.selectAll("#metrics_baseline,#metrics_forecast1,#metrics_forecast2").style("visibility","hidden");

	
}

function safeMetrics(){
	hideNGR();
	hideMetrics([{"name":"goal","hide":true}]);
	
}

function fullMetrics(){
	if (!SHOW_METRICS_NGR){
		enableAllMetrics();
		SHOW_METRICS_NGR= true;
		drawAll();
	}	
	else{
		hideNGR();
		drawAll();
	}
}

function hideNGR(){
	d3.selectAll("[id*=NGR]").style("visibility","hidden")
	SHOW_METRICS_NGR=false;
}
function showNGR(){
	d3.selectAll("[id*=NGR]").style("visibility","visible")
	SHOW_METRICS_NGR=true;
}

function hideGoalRisk(){
	d3.selectAll("#metrics_goal,#metrics_risk").transition().style("visibility","hidden");
	hideNGR();
	SHOW_METRICS_GOAL=false;
}

function showGoalRisk(){
	d3.selectAll("#metrics_goal,#metrics_risk").transition().style("visibility","visible");
	showNGR();
	SHOW_METRICS_GOAL=true;
}



function hideCorpMetrics(){
	d3.selectAll("[id*=corp_metrics]").style("visibility","hidden")
	d3.selectAll("[id*=metric_date]").transition().duration(300).attr("transform","translate(0,150)")
	hideVision();
	SHOW_METRICS_CORPORATE=false;
 }
 
 function showCorpMetrics(){
	d3.selectAll("[id*=corp_metrics]").transition().delay(300).style("visibility","visible")
	d3.selectAll("[id*=metric_date]").transition().duration(300).attr("transform","translate(0,0)")
	showVision();
	SHOW_METRICS_CORPORATE=true;
}	 


function filterMetrics(){
	if (SHOW_METRICS_BASELINE) d3.select("#metrics_baseline").transition().style("visibility","visible");
	else d3.select("#metrics_baseline").transition().style("visibility","hidden");
	

	if (SHOW_METRICS_FORECAST2) d3.selectAll("#metrics_forecast2").transition().style("visibility","visible");
	else d3.selectAll("#metrics_forecast2").style("visibility","hidden");

	if (SHOW_METRICS_FORECAST1) {d3.select("#metrics_forecast1").transition().delay(300).style("visibility","visible");d3.select("#metrics_forecast2").transition().duration(300).attr("transform","translate(0,0)");}
	else {
		d3.select("#metrics_forecast1").style("visibility","hidden");
		d3.select("#metrics_forecast2").attr("transform","translate(-150,0)");
		}
	
	if (SHOW_METRICS_GOAL) showGoalRisk();
	else hideGoalRisk();
	
	if (SHOW_METRICS_NGR) showNGR();
	else hideNGR();


	if (SHOW_METRICS_CORPORATE) showCorpMetrics();
	else hideCorpMetrics();
	
}

function hideMetrics(which){
	
	if (which){
			for (var i in which){
			if (which[i].name=="baseline" && which[i].hide==true && SHOW_METRICS_BASELINE==true){
				SHOW_METRICS_BASELINE=false;
			}
			else if (which[i].name=="baseline" && which[i].hide==false && SHOW_METRICS_BASELINE==false){
				SHOW_METRICS_BASELINE=true;
			}
			
			if (which[i].name=="forecast1" && which[i].hide==true &&SHOW_METRICS_FORECAST1==true){
				SHOW_METRICS_FORECAST1=false;
			}
			else if (which[i].name=="forecast1" && which[i].hide==false &&SHOW_METRICS_FORECAST1==false){
				SHOW_METRICS_FORECAST1=true;
			}
			
			if (which[i].name=="forecast2" && which[i].hide==true && SHOW_METRICS_FORECAST2==true){
				SHOW_METRICS_FORECAST2=false;
			}
			else if (which[i].name=="forecast2" && which[i].hide==false && SHOW_METRICS_FORECAST2==false){
				SHOW_METRICS_FORECAST2=true;
			}
			if (which[i].name=="goal" && which[i].hide==true && SHOW_METRICS_GOAL==true){
				hideGoalRisk();
			}
			else if (which[i].name=="goal" && which[i].hide==false && SHOW_METRICS_GOAL==false){
				showGoalRisk();
			}
		
		}
	}
}


// --------------------------------- experiments

function Metric(id,type,scale,metric){
	this.id =id;
	this.type=type;
	this.scale=scale;
	this.metric=metric;
}
Metric.prototype.getInfo=function(){
	return JSON.stringify(this);
}

