/** first version of mudularized kanban.js
 * extracted kanban_core stuff (hierarchy calculation...)
 * @version: 0.6
 * @author: Gerold Kathan (www.kathan.at)
 * @date: 2014-03-16
 * @copyright: 
 * @license: 
 * @website: www.kathan.at
 */


var laneTextData;
var pillarData;


var PILLAR_TOP = -75;
// pillars will use LANE_LABELBOX_RIGHT_WIDTH-PILLAR_X_OFFSET space
var PILLAR_X_OFFSET=90;




// ----------------------------------------------------------------------------------------------------------------
// ---------------------------------------------- LANES SECTION ---------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------

/**
*
*/
function drawLanes(){
	d3.select("#lanes").remove()

    var lanes = svg.append("g").attr("id","lanes");

	var lanesLeft = lanes.append("g").attr("id","lanesLeft");
	var lanesRight = lanes.append("g").attr("id","lanesRight");	
	//------------ context box ----------------
	/**
	 * this would be level-0 in a generic view
	 * in this concrete view this would be the "businessmodel=b2c gaming" umbrell box
	 * */
	_drawLaneContext(lanes,CONTEXT,-margin.left,0,LANE_LABELBOX_LEFT_WIDTH/6,height,"treemap.html")
	
	var i=0;
	var _xRightStart = x(KANBAN_END)+TARGETS_COL_WIDTH;

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
		_metrics = _drawLaneBox(lanesLeft,-LANE_LABELBOX_LEFT_WIDTH,_y,LANE_LABELBOX_LEFT_WIDTH,_height,_lane,"left");

		var _yTextOffset = 10;
		if (_metrics) _yTextOffset+=_metrics.height;
		

		//baseline box text
		_drawLaneText(lanesLeft,_lane,"baseline",_yTextOffset);
		
		// lane area
		_drawLaneArea(d3.select(this),x(KANBAN_START),_y,x(KANBAN_END)+LANE_LABELBOX_RIGHT_WIDTH+280,_height,i)

		//target box	
		_metrics =_drawLaneBox(lanesRight,_xRightStart,_y,LANE_LABELBOX_RIGHT_WIDTH,_height,_lane,"right");
		
		//target box text
		_drawLaneText(lanesRight,_lane,"target",_yTextOffset);

		// laneside descriptors
		if (_.last(CONTEXT.split("."))=="drill-in"){
			var _laneName = _.last(_lane.split("."))
			_drawLaneSideText(lanesLeft,_laneName,-LANE_LABELBOX_LEFT_WIDTH-2,_y+3,"5px","start");
		}
		//sublane descriptors
		var _sublanes = getSublanesNEW(_lane);
		
		for (var s in _sublanes){
			var _y = y(_sublanes[s].yt1);
			var _h = y(_sublanes[s].yt2-_sublanes[s].yt1); 
			
			// strip only the sublane name if name is fully qualified like "topline.bwin.touch"
			var _sublane = _.last((_sublanes[s].name).split("."))
			
			_drawLaneSideText(lanesLeft,_sublane,1,_y+_h/2,"4px","middle");
		
			//no lines for first and last sublane
			if (s>0 && s<_sublanes.length){
				_drawLine(d3.select(this),x(KANBAN_START),_y,x(KANBAN_END),_y,"sublaneLine");
				}
			}
		//check for demarcation between topline and enabling
		// => this needs first refactoring of in-memory datastructure !!!
		// HAHAAAA :-)) [20140104] did it !!!!
		for (t in getThemesNEW()){
			var _t = y(getThemesNEW()[t].yt2);
			
			// no demarcation line in the end ;-)
			if (t<getThemesNEW().length-1){
				_drawLine(d3.select(this),x(KANBAN_START)-margin.left,_t,x(KANBAN_END)+margin.right+margin.left,_t,"themeLine");
				//_drawLaneSideText(d3.select(this),getThemesNEW()[t].name,-LANE_LABELBOX_LEFT_WIDTH-10,_t,"5px","middle");
			}
		}
		i++;
	});
	// -------------------------------------- drivers WHERE HOW STUFF -----------------------------------
	var _pillarColumns = [{"name":"ACCESS"},{"name":"APPEAL"},{"name":"USP"}];

	var _xBase = _xRightStart+2;
	var _yBase = PILLAR_TOP;
	var _width = LANE_LABELBOX_RIGHT_WIDTH-PILLAR_X_OFFSET;						
							
	if (_width >100 & CONTEXT=="b2c gaming") {
		  _drawPillarColumns(lanesRight,_pillarColumns,_xBase,_yBase,_width);
		  _drawHowPillars(lanesRight,pillarData,_xBase,_yBase,_width);							
	}
}	

/** helper method to render the strategical driver columns
 */	
function _drawPillarColumns(svg,data,x,y,width){
		var _spacer = 3;
		var _color = COLOR_BPTY;
		var _length = data.length;
		var _pillarWidth = (width/_length)-_spacer;
		var _height = height-PILLAR_TOP;
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
	else if (side=="target") _xBase= x(KANBAN_END)+TARGETS_COL_WIDTH+LANE_LABELBOX_RIGHT_WIDTH-10;
	
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



