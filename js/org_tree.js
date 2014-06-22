// global variables


// http://www.d3noob.org/2014/01/tree-diagrams-in-d3js_11.html

var CONTEXT="CONTEXT";



var orgData;
var orgTree;
var orgLevels;

var SIZE ;
var MARGIN_LEFT = 800;
var MARGIN_TOP = 150;


var MAX_DEPTH= 10;

var MAX_LEVEL;
var MAX_COUNT;

// set by multiselect box to switch data 
var ORG_DATA="org";

//fixed distance between depth levels
var DEPTH_WIDTH = 200;

//input field to redefine root node (must match PI "Full Name") 
var ROOT_NAME;// = "Mr. Thomas Priglinger";

var LEAF_NAMES = 1;
var LEAF_NODES = 0;

var WIDTH =SIZE;
var HEIGHT = SIZE;


var duration=750;


var _tree;

var x,y,svg,tree,diagonal;





var COLOR_BPTY="#174D75";

var COLOR_TARGET = COLOR_BPTY;


var color;
var pack;
var nodes;





function render(){
	
	//d3.xml("data/external_org.svg", function(xml) {
	//	document.body.appendChild(document.importNode(xml.documentElement, true));

		d3.json(dataSourceFor(ORG_DATA),function(data){
		//d3.json(dataSourceFor("org2013april"),function(data){
			orgData = data;
			
			
			
			//root = findAndreas(findNorbert(makeTree(createList(data))).children);
			root = findNorbert(makeTree(createList(data)));
			
			//root = _.nest(orgData,["Location","Function"]);
			
			
		
			if (ROOT_NAME) root = searchBy(orgTree,"employee",ROOT_NAME);
			orgTree = root;
				
			console.log("***** before count");
			MAX_COUNT=count(root,0);  
			enrich(root);	
			
			calculateTreeStats(root);
			
			SIZE=300+MAX_COUNT+(MAX_LEVEL*300);
			console.log("***** MAX_LEVEL: "+MAX_LEVEL);
			WIDTH=4000;
			HEIGHT=SIZE;
			_init();
			_renderBackground(root);		
			_render(root);
		});
	//});
}

var _links;


function _init(){
	// ************** Generate the tree diagram	 *****************
	var margin = {top: MARGIN_TOP, right: 120, bottom: 20, left: MARGIN_LEFT},
		width = WIDTH - margin.right - margin.left,
		height = HEIGHT - margin.top - margin.bottom;
		
	
	tree = d3.layout.tree()
		.size([height, width]);

	diagonal = d3.svg.diagonal()
		.projection(function(d) { return [d.y, d.x]; });
		//.projection(function(d) { return [d.x, d.y]; });

	svg = d3.select("body").append("svg")
		.attr("width", width + margin.right + margin.left)
		.attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
		
	
}

function _renderBackground(source){
	//getting tree clustered by levels
	var levels = traverseBF(source);
	MAX_LEVEL = levels.length;
	
	var _total = 0;
	for (var i in levels){_total+=levels[i].length;};
	
	console.log("* MAX DEPTH: "+levels.length+" DISTRIBUTION - TOTAL: "+_total);
	
	var gBack = d3.select("svg").append("g").attr("id","background");
	var _sum =0;
	var _sumFemale=0;
	
	for (var i in levels){
		
		var _x = (i*DEPTH_WIDTH)+MARGIN_LEFT;
		_drawLine(gBack,_x,MARGIN_TOP-50,_x,SIZE,"dashedLine");
		_drawText(gBack,"N"+(MAX_LEVEL-i),_x,MARGIN_TOP-70,{"size":"24px","color":"red","opacity":1,"anchor":"middle","weight":"normal"});
		
		var _perLevel = levels[i].length;
		var _percentage = Math.round((_perLevel/_total)*100);
		var _female = getFemaleQuotient(levels[i]);
		var _internal = getInternalQuotient(levels[i]);
		_sum+=_perLevel;
		_sumFemale+=_female;
		
		_drawText(gBack,"#"+levels[i].length,_x,MARGIN_TOP-53,{"size":"16px","color":"red","opacity":1,"anchor":"middle","weight":"bold"});
		_drawText(gBack,"#: "+_percentage+"%"+" ,f: "+_female+"%"+" ,i: "+_internal+"%",_x,MARGIN_TOP-40,{"size":"12px","color":"red","opacity":1,"anchor":"middle","weight":"normal"});
		
		console.log(levels[i].length+" - ");
	}
	
	//sum
	_drawText(gBack,"SUM",MARGIN_LEFT-DEPTH_WIDTH,MARGIN_TOP-70,{"size":"24px","color":"red","opacity":1,"anchor":"middle","weight":"normal"});
	_drawText(gBack,"#"+_sum,MARGIN_LEFT-DEPTH_WIDTH,MARGIN_TOP-53,{"size":"16px","color":"red","opacity":1,"anchor":"middle","weight":"bold"});
	_drawText(gBack,"100%"+" ,f: "+getFemaleQuotient(orgData,"Gender")+"%"+" ,i: "+getInternalQuotient(orgData,"Contract Type")+"%",MARGIN_LEFT-DEPTH_WIDTH,MARGIN_TOP-40,{"size":"12px","color":"red","opacity":1,"anchor":"middle","weight":"normal"});
	
	
	
}

function _render(source){
	var i = 0;

  // Compute the new tree layout.
	//var nodes = tree.nodes(root).reverse(),
  
  // filter the nodes which have no children
	var nodes = tree.nodes(source).reverse().filter(function(d){
		if (!LEAF_NODES){
			return (d.children &&d.depth<MAX_DEPTH) ;
		}
		else{
			return (d.depth<MAX_DEPTH) ;
		}	
		}),
			
	  links = tree.links(nodes);


  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * DEPTH_WIDTH; });
  //nodes.forEach(function(d) { d.y = d.depth * 100; });

  // Declare the nodes…
  var node = svg.selectAll("g.node")
	  .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter the nodes.
  var nodeEnter = node.enter().append("g")
	  .attr("class", "node")
	  .on("click", click)
	  .attr("transform", function(d) { 
		  return "translate(" + d.y + "," + d.x + ")"; });
		  //return "translate(" + d.x + "," + d.y + ")"; });

  nodeEnter.append("circle")
	  .attr("r",function(d){ 
		   return getSize(d,50,2)/2+"px";
		})
	  .style("fill", "#fff");

  
	
	
	//***** NAME ********
	// needed when we use _nest stuff instead of maketree stuff
	
	/*
	nodeEnter.append("text")
	  .attr("x", function(d) { 
	  //.attr("y", function(d) { 
		  return d.children || d._children ? -(getSize(d)+2) : (getSize(d)+2); })
		 //return d.children || d._children ? -18 : 18; })
	  .attr("dy", ".35em")
	  .attr("text-anchor", function(d) { 
		  return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { if (d.children) return d.name; else {if (!LEAF_NAMES) return ""; else return "";} })
	  .style("fill-opacity", 1)
	  .style("font-weight", function(d){
			if (d.children) return "bold";
			else return "normal";
		  })
	  .style("font-size",function(d){ 
		   return getSize(d)+"px";
		});
		
	*/
	
	//***** POSITION ********
	nodeEnter.append("text")
	  .attr("x", "0")
	  .attr("dy",  function(d){ 
		  return -getSize(d)+"px";
		})
	  .attr("text-anchor", function(d) { 
		  return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { if (d.children) return d.position; else {if (!LEAF_NAMES) return ""; else return "";} })
	  .style("fill-opacity", 1)
	  .style("font-weight", function(d){
			if (d.children) return "bold";
			else return "normal";
		  })
	  .style("font-size",function(d){ 
		   return getSize(d,25,5)+"px";
		});
		
		
	//***** EMPLOYEE ********
		nodeEnter.append("text")
	  .attr("x", function(d) { 
	  //.attr("y", function(d) { 
		  return d.children || d._children ? -(getSize(d)) : (getSize(d)); })
		 //return d.children || d._children ? -18 : 18; })
	  .attr("text-anchor", function(d) { 
		  return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { if (d.children) return d.employee; else {if (!LEAF_NAMES) return ""; else return d.employee;} })
	  .style("fill-opacity", 1)
	  .style("font-weight", "normal")
	  .style("font-size",function(d){ 
		   return getSize(d,50,5)/1.2+"px";
		});
	  
	
	//***** OVERALL ********
	  nodeEnter.append("text")
	  //13px for on screen..
	  //.attr("dx","-23px")
	  .attr("x", function(d){ 
		  return getSize(d)*3+"px";
		})
	  .attr("dy", "0px")
	  .attr("text-anchor", function(d) { 
		  return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { return d.overallReports ? d.overallReports : ""; })
	  .style("fill-opacity", 1)
	  .style("font-weight", "bold")
	  .style("fill","red")
	  .style("font-size",function(d){ 
		  return getSize(d,100,6)*2+"px";
		})
		.style("text-anchor","end")
	  ;

	//***** STATS ********
	  nodeEnter.append("text")
	  //13px for on screen..
	  //.attr("dx","-23px")
	  .attr("x", function(d) { 
		  return d.children || d._children ? 0 : 0; })
		 // return d.children || d._children ? -18 : 18; })
	  .attr("dy", function(d){ 
		  return getSize(d,100,4)*.9+"px";
		})
	  .attr("text-anchor", function(d) { 
		  return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { return d.overallReports ? ("[d:"+d.directReports+",l:"+Math.round((d.leafOnly/d.directReports)*100)+"%,a:"+d.averageSubordinates+",s:"+(d.averageDeviation?d.averageDeviation:"-")+"]") :"" })
	  .style("fill-opacity", 1)
	  .style("font-weight", "normal")
	  .style("fill","red")
	  .style("font-size",function(d){ 
		  return getSize(d,100)*.9+"px";
		})
		
		.style("text-anchor","end")
	  ;
	  
	  //.style("writing-mode", "tb");




  // Declare the links…
  var link = svg.selectAll("path.link")
	  .data(links, function(d) { return d.target.id; });

  // Enter the links.
  link.enter().insert("path", "g")
	  .attr("class", "link")
	  .attr("d", diagonal);






  

}


// Toggle children on click.
function click(d) {
  console.log("** click:"+d.employee+ "--------------------- overall: "+d.overallReports);
  ROOT_NAME = d.employee; 
  
  // ~ rough formula
  HEIGHT = 500+d.overallReports*3;
  
  d3.select("svg").remove();
  render();
  return;
  
  
  
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  _render(d);
}


function expandAll(items){
	for (var i in items){
		if (items[i].children) 
			expandAll(items[i].children);
		else{
			items[i].children_ = items[i].children;
			items[i].children =null;
		}
	}
}





