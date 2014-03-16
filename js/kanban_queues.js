/** first version of mudularized kanban.js
 * extracted kanban_core stuff (hierarchy calculation...)
 * @version: 0.6
 * @author: Gerold Kathan (www.kathan.at)
 * @date: 2014-03-16
 * @copyright: 
 * @license: 
 * @website: www.kathan.at
 */



// queue metrics
var ITEMS_DONE,ITEMS_WIP,ITEMS_FUTURE,ITEMS_TOTAL,ITEMS_DELAYED,DAYS_DELAYED;
	
var SIZING_DONE,SIZING_WIP,SIZING_FUTURE,SIZING_TOTAL;





// ----------------------------------------------------------------------------------------------------------------
// ---------------------------------------------- QUEUES SECTION --------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------

/**
* 
*/
function drawQueues(){
	d3.select("#queues").remove()
	
	calculateQueueMetrics();

	var _xWIPStart = x(WIP_START);
	// in case we look to much into the future with the timemachine..
	if (WIP_START>KANBAN_END) _xWIPStart = x(KANBAN_END);
	
	var _xWIPWidth = x(WIP_END)-x(WIP_START);
	var _xFutureX = x(WIP_END);
	var _xFutureWidth = x(KANBAN_END) - _xFutureX;

	var _yMetricBaseTop = PILLAR_TOP; //top
	var _yMetricBase = height-PILLAR_TOP; //bottom
	
	var _yMetricDetailsOffset = 10;
	var _yMetricDetails2Offset = 8;

	var _yMetricBracketOffset = height+METRIC_BRACKET_Y_OFFSET;
	var gQueue = svg.append("g").attr("id","queues");
	
	//---------------- DONE queue --------------------
	var gQueueDone = gQueue.append("g").attr("id","done");

	//3px ofsfet for first box
	_drawQueueArea(gQueueDone,0,0,_xWIPStart,height,"done",3);

	// --------------- DONE METRICS ---------------------
	var _metric = {"text":"DONE" ,"items":ITEMS_DONE ,"swag": SIZING_DONE}
	_drawQueueMetric(gQueueDone,_metric,x(KANBAN_START),_yMetricBracketOffset,_xWIPStart,_xWIPStart/2,_yMetricBase,_yMetricDetailsOffset,null,"bottom");

	// prevent render queuareas over KANBAN_END border
	if (WIP_START < KANBAN_END){
		//---------------- wip queue --------------------
		var gQueueWip = gQueue.append("g").attr("id","wip");
		
		// in case of going beyond ...
		if (WIP_END > KANBAN_END) _xWIPWidth = x(KANBAN_END)-x(WIP_START)
			_drawQueueArea(gQueueWip,_xWIPStart,0,_xWIPWidth,height,"wip",0);
		// --------------- WIP METRICS ---------------------
		if (WIP_END<KANBAN_END){
			_metric = {"text":"WIP" ,"items":ITEMS_WIP ,"swag": SIZING_WIP}
			_drawQueueMetric(gQueueWip,_metric,_xWIPStart,_yMetricBracketOffset,_xWIPWidth,(_xWIPWidth/2+x(WIP_START)),_yMetricBase,_yMetricDetailsOffset,null,"bottom");
		}
		//-------------- TODAY markerlines ----------------
		_drawQueueMarker(gQueueWip,WIP_START,"today",x(WIP_START),MARKER_DATE_TOP);
		
		_drawTodayMarker(gQueueWip,x(WIP_START),_yMetricBaseTop,"TODAY");
		// ------------- WIP marker lines ---------------------
		if (WIP_END < KANBAN_END){
			_drawQueueMarker(gQueueWip,WIP_END,"wip",x(WIP_END),MARKER_DATE_TOP);
			//---------------- FUTURE queue --------------------
			var gQueueFuture = gQueue.append("g").attr("id","future");
			_drawQueueArea(gQueueFuture,_xFutureX,0,_xFutureWidth,height,"future",0);
		}
		//---------------- FUTURE METRICS --------------------
		if (WIP_END<KANBAN_END){
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
		}
	}
} //end drawQueues



/* ------------------------------------------------- drawQueues() helper functions ----------------------------------------------------------- */
		function _drawTodayMarker(svg,x,y,text){
				svg.append("use").attr("xlink:href","#today_marker")
				.attr("transform","translate("+(x-5.5)+",-70) scale(1.1)");

				_drawText(svg,text,x,y,"18px","bold","middle","red","normal");
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

			_drawLine(svg,(x+0.5),y,(x+0.5),(height-y),css+"Line",[{"start":"rect_red"},{"end":"rect_red"}]);
			
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
		_item = _filteredItems[_d];
		var _date = _item.actualDate;
		
		var _sizingPD = parseInt(_item.Swag);
		var _delay = diffDays(_item.planDate,_item.actualDate);
				
		if (!isNaN(_sizingPD)) SIZING_TOTAL+=_sizingPD;
		if (new Date(_date)<WIP_START && new Date(_date)>KANBAN_START && _item.state=="done" ){
			ITEMS_DONE++;
			if (!isNaN(_sizingPD)) SIZING_DONE+=_sizingPD;
		}
		else if(new Date(_date)>WIP_START && new Date(_date)<WIP_END && new Date(_date)<KANBAN_END) {
			ITEMS_WIP++;
 			if (!isNaN(_sizingPD)) SIZING_WIP+=_sizingPD;

		}
		else if (new Date(_date)>WIP_END && new Date(_date)<KANBAN_END){
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


