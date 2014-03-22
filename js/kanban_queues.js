/** kanban_queues
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
				_drawXlink(svg,"#today_marker",(x-5.5),-70,{"scale":"1.1"});
				_drawText(svg,text,x,y,{"size":"18px","weight":"bold","anchor":"middle","color":"red"});
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
			_drawText(svg,date.toString("d-MMM-yyyy"),(x+5),(y+3),{"css":css+"Text","anchor":"start"});
			_drawText(svg,date.toString("d-MMM-yyyy"),(x+5),(height-y+3),{"weight":"bold","css":css+"Text","anchor":"start"});

			_drawLine(svg,(x+0.5),y,(x+0.5),(height-y),css+"Line",[{"start":"rect_red"},{"end":"rect_red"}]);
		}

		/**
		 */
		function _drawQueueMetric(svg,metric,bracketX,bracketY,width,metricX,metricY,space,color,orientation){
			if(!color) color=COLOR_BPTY;
			if (width){
				_drawXlink(svg,"#icon_bracket_"+orientation+"_blue",bracketX,bracketY,{"scale":(width/100)+",1","opacity":0.15});
			}
			_drawText(svg,metric.text,metricX,metricY,{"size":"18px","css":"metricItems","color":color,"anchor":"middle"});
			_drawText(svg,metric.items+ " items",metricX,(metricY+space),{"size":"9px","css":"metricItems","color":color,"anchor":"middle"});
			_drawText(svg,"["+metric.swag+" PD]",metricX,(metricY+space+(space-2)),{"size":"7px","css":"metricItems","color":color,"anchor":"middle"});
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


