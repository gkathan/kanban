<?php
session_start();

if( !isset($_SESSION['auth']) ) {
     header("Location: login.html");
}
	
$auth=$_SESSION['auth'];
if ($auth!="admin")
{
   header("Location: login.html");
}
else{

?>


<!DOCTYPE HTML>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
  <title>corpkanban - admin</title>
 
 <script src="js/d3.v3.min.js"></script>
<script src="js/SlickGrid-master/lib/jquery-1.7.min.js"></script>
<script src="js/SlickGrid-master/lib/jquery-ui-1.8.16.custom.min.js"></script>
<script src="js/SlickGrid-master/lib/jquery.event.drag-2.2.js"></script>

<script src="bootstrap/dist/js/bootstrap.min.js"></script>
<script src="js/bootstrap-notify.js"></script>

<script src="js/mousetrap.min.js"></script>

<script src="js/kanban_config.js"></script>


<script src="js/SlickGrid-master/slick.dataview.js"></script>
<script src="js/SlickGrid-master/slick.core.js"></script>
<script src="js/SlickGrid-master/plugins/slick.checkboxselectcolumn.js"></script>
<script src="js/SlickGrid-master/plugins/slick.autotooltips.js"></script>
<script src="js/SlickGrid-master/plugins/slick.cellrangedecorator.js"></script>
<script src="js/SlickGrid-master/plugins/slick.cellrangeselector.js"></script>
<script src="js/SlickGrid-master/plugins/slick.cellcopymanager.js"></script>
<script src="js/SlickGrid-master/plugins/slick.cellselectionmodel.js"></script>
<script src="js/SlickGrid-master/plugins/slick.rowselectionmodel.js"></script>
<script src="js/SlickGrid-master/controls/slick.columnpicker.js"></script>
<script src="js/SlickGrid-master/slick.formatters.js"></script>
<script src="js/SlickGrid-master/slick.editors.js"></script>
<script src="js/SlickGrid-master/slick.grid.js"></script>
<script src="js/SlickGrid-master/slick.compositeeditor.js"></script>

 
 
  <link rel="stylesheet" type="text/css" href="bootstrap/dist/css/bootstrap.min.css">
<script src="http://ajax.microsoft.com/ajax/jquery.templates/beta1/jquery.tmpl.min.js"></script>
  
<link rel="stylesheet" href="js/SlickGrid-master/slick.grid.css" type="text/css"/>
<link rel="stylesheet" href="js/SlickGrid-master/css/smoothness/jquery-ui-1.8.16.custom.css" type="text/css"/>
<link rel="stylesheet" href="js/SlickGrid-master/examples.css" type="text/css"/>
<link rel="stylesheet" href="js/SlickGrid-master/controls/slick.columnpicker.css" type="text/css"/>

<!-- Notify CSS -->
<link href="css/bootstrap-notify.css" rel="stylesheet">
<!-- Custom Styles -->
<link href="css/styles/alert-bangtidy.css" rel="stylesheet">
<link href="css/styles/alert-blackgloss.css" rel="stylesheet">



  <style>
    .cell-title {
      font-weight: bold;
    }

    .cell-effort-driven {
      text-align: center;
    }
    
      .changed {
      background: orange;
    }
    
    
    .sync {
      background: #eeeeee;
      
    }
    
    .onKanban{
	background-color: #EAF4FC;
	color: black;
	font-style:italic;
		
	}
	.onKanbanImmutable{
	color: #999999;
	font-weight:normal;
	font-style:italic;
	font-size:10px;
		
		
	}
	
	.onV1{
	background-color: #F4E9ED;
	color: black;
	font-weight:bold;
		
		
	}
	
	
    .highlight {
      background: #F9F9B4;
	}
	
	
	.slick-headerrow-column {
      background: #6896ba;
      text-overflow: clip;
      -moz-box-sizing: border-box;
      box-sizing: border-box;
    }

    .slick-headerrow-column input {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      -moz-box-sizing: border-box;
      box-sizing: border-box;
    }
    
    .slick-header *, *:before, *.after {
-moz-box-sizing: content-box;
box-sizing: content-box;
}
    
    
  </style>
</head>
<body>


	
<div style="position:relative">
  <div style="width:5000px;">
	
  <div class='notifications top-left'></div> 
  
  
  <div class="btn-group-xs">
	  <a href="kanban.php"><img src="img/external_elements_bpty_kanban.png" height="70px"/>	</a> <span class="glyphicon glyphicon-indent-left" style="font-size:20px;color:#6896ba"></span> <span id="admintype" style="font-weight:bold;font-size:30px;color:#6896ba"></span>
	  <br>
	  <button id="bsave" type="button" class="btn btn-primary"><span class="glyphicon glyphicon-floppy-save"></span> save selected</button>
	  <button id="bremove" type="button" class="btn btn-danger"><span class="glyphicon glyphicon-trash"></span> remove selected</button>
	  <a id="lexcel" class="btn btn-info" href=""><span class="glyphicon glyphicon-export"></span> export excel</a>
	 
	  
  </div>
  
   
    <div id="adminGrid" style="position:absolutewidth:100%;height:1000px;"></div>

  </div>
 

 </div>




<script>
  function requiredFieldValidator(value) {
    if (value == null || value == undefined || !value.length) {
      return {valid: false, msg: "This is a required field"};
    } else {
      return {valid: true, msg: null};
    }
  }

var initiativeData;
var targetData;
var metricData;
var lanetextData;

var _excelExportURL = MONGO_GATEWAY_URL+"excel/";



var admingrid;
  
  var columnFilters={};
  
  //var url_query = window.location.search;
  //var _filterName;
  //var _filterValue;
  
  var _type=getUrlVars()["type"];
  var _filter=getUrlVars()["filter"];
  var _id =getUrlVars()["_id"];
  
  //set link for excel download
  document.getElementById("lexcel").href=_excelExportURL+_type;
  $("#admintype").text(_type);
  
  //url_query = url_query.replace("?", ''); // remove the ?
  
  //_filterName=url_query.split("=")[0];
  //_filterValue=url_query.split("=")[1];
  
   document.write("v1.data.link: <a href=\""+V1_DATA_URL+"\"target=\"_new\"> "+V1_DATA_URL+"</a>");
	 document.write("<br>kanban.initiatives.link: <a href=\""+dataSourceFor("initiatives")+"\"target=\"_new\"> "+dataSourceFor("initiatives")+"</a>");
	 document.write("<br>kanban.targets.link: <a href=\""+dataSourceFor("targets")+"\"target=\"_new\"> "+dataSourceFor("targets")+"</a>");
	 document.write("<br>kanban.metrics.link: <a href=\""+dataSourceFor("metrics")+"\"target=\"_new\"> "+dataSourceFor("metrics")+"</a>");
	 document.write("<br>kanban.lanetext.link: <a href=\""+dataSourceFor("lanetext")+"\"target=\"_new\"> "+dataSourceFor("lanetext")+"</a>");
	 document.write("<br>kanban.excel.export: "+_excelExportURL);
  


checkServices();
initShortcuts();
refresh();


function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}


function refresh(){
	$.when(//$.getJSON("/data/data.php?type=initiatives"),
				//$.getJSON("http://localhost:9999/initiatives"),
				//$.getJSON("http://localhost:9999/targets"),
				$.getJSON(dataSourceFor("initiatives")),
				$.getJSON(dataSourceFor("targets")),
				$.getJSON(dataSourceFor("metrics")),
				$.getJSON(dataSourceFor("lanetext")))

				
			.done(function(initiatives,targets,metrics,lanetext){
					if (initiatives[1]=="success") initiativeData=initiatives[0];
					else throw new Exception("error loading initiatives");
					if (targets[1]=="success") targetData=targets[0];
					else throw new Exception("error loading targets");
					if (metrics[1]=="success")  metricData=metrics[0];
					else throw new Exception("error loading epics");
					if (lanetext[1]=="success")  lanetextData=lanetext[0];
					else throw new Exception("error loading epics");
					
					
					if (_type=="targets")
						renderAdminGrid(targetData,getTargetConfig());
					else if (_type=="lanetext")
						renderAdminGrid(lanetextData,getLanetextConfig());
					else if (_type=="metrics")
						renderAdminGrid(metricData,getMetricConfig());
					else if (_type=="initiatives")
						renderAdminGrid(initiativeData,getInitiativeConfig());
					
				});
}




function filterByNameValue(list,name,value){
	var _filtererdList = new Array();
	for (var l in list){
		if (list[l][name]==value) _filtererdList.push(list[l]);
	}
	return _filtererdList;
}


function lookupByField(list,field,value){
	for (var i in list){
		//console.log("** checking: "+list[i][field]+" == "+value);
		if (list[i][field]==value) {
			//console.log ("==== MATCH !");
			return list[i];
		}
	}

}

function getInitiativeConfig(){
	
	var _initiative = [
	
		{ id:"_id", name: "_id", field: "_id",sortable:true,width:150,cssClass:"onKanbanImmutable" },
        { id:"id", name: "id", field: "id",sortable:true,width:40,cssClass:"onKanbanImmutable"},
        { id:"ExtId", name: "ExtId", field: "ExtId",sortable:true,cssClass:"onKanbanImmutable",width:50 },
        { id: "name", name: "name", field: "name", editor: Slick.Editors.Text ,width:300, cssClass: "cell-title"},
        { id: "name2", name: "name2",  field: "name2",width:150 , editor: Slick.Editors.Text},
        { id: "backlog", name: "backlog",  field: "backlog",width:200, editor: Slick.Editors.Text  },
        { id: "startDate", name: "initial.start", field: "startDate", editor: Slick.Editors.Date,formatter: Slick.Formatters.SimpleDate,sortable:true },
		{ id: "planDate", name: "initial.plan", field: "planDate", editor: Slick.Editors.Date,formatter: Slick.Formatters.SimpleDate,sortable:true ,width:100},
		{ id: "actualDate", name: "actual.plan", field: "actualDate", editor: Slick.Editors.Date,formatter: Slick.Formatters.SimpleDate,sortable:true,width:100 },
	    { id: "v1plannedStart", name: "v1.start", field: "v1plannedStart", sortable:true,cssClass:"onKanbanImmutable",width:80 },
		{ id: "v1plannedEnd", name: "v1.end", field: "v1plannedEnd", sortable:true ,cssClass:"onKanbanImmutable",width:80},
		{ id: "v1launchDate", name: "v1.launch", field: "v1launchDate", sortable:true ,cssClass:"onKanbanImmutable",width:80},
	    { id: "state", name: "state",  field: "state" ,editor: Slick.Editors.SelectCell,options:{"planned":"planned","todo":"todo","done":"done","killed":"killed"}},
        { id: "isCorporate", name: "isCorporate",  field: "isCorporate",width:50 },
        { id: "onKanban", name: "onKanban",  field: "onKanban",width:50,formatter: Slick.Formatters.Checkmark,editor:Slick.Editors.YesNoSelect },
        { id: "bm", name: "businessmodel",  field: "bm" , editor: Slick.Editors.Text},
        { id: "theme", name: "theme",  field: "theme" ,editor: Slick.Editors.SelectCell,options:{"topline":"topline","enabling":"enabling"},},
        { id: "lane", name: "lane",  field: "lane",editor: Slick.Editors.SelectCell,options:{"bwin":"bwin","pp":"pp","foxy":"foxy","premium":"premium","casino":"casino","techdebt":"techdebt","shared":"shared"},sortable:true, sorter:NumericSorter,width:80 },
        { id: "themesl", name: "themesl",  field: "themesl" , editor: Slick.Editors.Text},
        { id: "sublane", name: "sublane",  field: "sublane" ,editor: Slick.Editors.SelectCell,options:{"touch":"touch","click":"click","product":"product","market":"market","enabling":"enabling","CS":"CS","architecture":"architecture","agile":"agile","leanops":"leanops","devops":"devops","people":"people","entIT":"entIT","marketing":"marketing"},width:80},
        { id: "sublaneOffset", name: "sublaneOffset",  field: "sublaneOffset" ,editor: Slick.Editors.Text},
        { id: "progress", name: "progress",  field: "progress" ,width:50,editor:Slick.Editors.Integer},
        { id: "health", name: "health",  field: "health",formatter: Slick.Formatters.RAG,width:50 },
		{ id: "healthComment", name: "healthComment",  field: "healthComment" , editor: Slick.Editors.LongText,width:300},
        { id: "Swag", name: "Swag", field: "Swag",width:50,editor:Slick.Editors.Integer },
		{ id: "status", name: "status",  field: "status" ,width:50,editor: Slick.Editors.Text},
        { id: "size", name: "size",  field: "size" ,width:50,editor:Slick.Editors.Integer},
        { id: "Type", name: "Type",  field: "Type" ,width:50,editor: Slick.Editors.Text},
        { id: "cost", name: "cost",  field: "cost" ,width:50,editor:Slick.Editors.Integer},
		 { id: "benefit", name: "benefit",  field: "benefit",width:50 ,editor:Slick.Editors.Integer},
        { id: "dependsOn", name: "dependsOn",  field: "dependsOn" ,editor: Slick.Editors.Text},
        { id: "accuracy", name: "accuracy",  field: "accuracy" ,width:50,editor:Slick.Editors.Integer,width:50},
        { id: "productOwner", name: "productOwner",  field: "productOwner",editor: Slick.Editors.Text,width:150 },
        { id: "businessOwner", name: "businessOwner",  field: "businessOwner" ,editor: Slick.Editors.Text,width:150},
        { id: "programLead", name: "programLead",  field: "programLead",editor: Slick.Editors.Text,width:150 },
		{ id: "DoD", name: "DoD", field: "DoD", editor: Slick.Editors.LongText,width:300},
        { id: "DoR", name: "DoR",  field: "DoR" },
        { id: "createDate", name: "createDate", field: "createDate"},
      
        { id: "changeDate", name: "changeDate",  field: "changeDate",width:150 },
       
    ];

	return _initiative;

}

function getMetricConfig(){
	//lanetext
	var _metric = [
        { id:"id", name: "id", field: "id",sortable:true },
        { id: "lane", name: "lane",  field: "lane",sortable:true },
        { id: "dimension", name: "dimension",  field: "dimension" ,sortable:true, editor: Slick.Editors.Text},
		{ id: "class", name: "class",  field: "class" ,sortable:true, editor: Slick.Editors.Text},
		{ id: "intervalStart", name: "intervalStart",  field: "intervalStart",sortable:true, editor: Slick.Editors.Date,formatter: Slick.Formatters.SimpleDate },
		{ id: "intervalEnd", name: "intervalEnd",  field: "intervalEnd",sortable:true,editor:Slick.Editors.Date,formatter: Slick.Formatters.SimpleDate },
		{ id: "forecastDate", name: "forecastDate",  field: "forecastDate",sortable:true,editor:Slick.Editors.Date,formatter: Slick.Formatters.SimpleDate },
		{ id: "number", name: "number",  field: "number",sortable:true,editor:Slick.Editors.Text },
		{ id: "scale", name: "scale",  field: "scale",sortable:true,editor:Slick.Editors.Text },
		{ id: "type", name: "type",  field: "type",sortable:true,editor:Slick.Editors.Text },
		{ id: "sustainable", name: "sustainable",  field: "sustainable",sortable:true,editor:Slick.Editors.Text },
		{ id: "reforecast", name: "reforecast",  field: "reforecast",sortable:true,editor:Slick.Editors.Text },
		{ id: "targets", name: "targets",  field: "targets",sortable:true,editor:Slick.Editors.Text },
		{ id: "direction", name: "direction",  field: "direction",sortable:true,editor:Slick.Editors.Text }
	];
 
	return _metric;
	
}


function getLanetextConfig(){
	//lanetext
	var _lanetext = [
        { id:"id", name: "id", field: "id",sortable:true ,width:50},
        { id: "lane", name: "lane",  field: "lane",sortable:true },
        { id: "text", name: "text",  field: "text" ,sortable:true, editor: Slick.Editors.LongText,width:300},
		{ id: "side", name: "side",  field: "side" ,sortable:true, editor: Slick.Editors.Text},
		{ id: "format", name: "format",  field: "format",sortable:true, editor: Slick.Editors.Text },
		{ id: "size", name: "size",  field: "size",sortable:true,editor:Slick.Editors.Integer,width:50 }];
 
	return _lanetext;
	
}

function getTargetConfig(){
		//targets
	var _target =[
        { id:"id", name: "id", field: "id",sortable:true,width:30 },
        { id:"ranking", name: "ranking", field: "ranking",sortable:true,width:30, editor: Slick.Editors.Text },
        { id: "name", name: "name", field: "name", editor: Slick.Editors.Text ,width:200, cssClass: "cell-title"},
//        { id: "name2", name: "name2",  field: "name2",width:150 },
		{ id: "description", name: "description", field: "description", editor: Slick.Editors.LongText,width:200 },
	    { id: "status", name: "status",  field: "status",editor: Slick.Editors.SelectCell,options:{"green":"green","amber":"amber","red":"red"},formatter: Slick.Formatters.RAG,width:30},
	    { id: "scope", name: "scope", field: "scope", editor: Slick.Editors.LongText },
	    { id: "nonScope", name: "nonScope", field: "nonScope", editor: Slick.Editors.LongText },
	    { id: "metrics", name: "metrics", field: "metrics", editor: Slick.Editors.LongText },
	    { id: "risk", name: "risk", field: "risk", editor: Slick.Editors.LongText },
	    { id: "initiatives", name: "initiatives", field: "initiatives", editor: Slick.Editors.Text},
        { id: "targetOwner", name: "targetOwner",  field: "targetOwner", editor: Slick.Editors.Text,width:150 },
        { id: "syndicate", name: "syndicate",  field: "syndicate", editor: Slick.Editors.Text,width:150 },
        { id: "targetDate", name: "targetDate", field: "targetDate", editor: Slick.Editors.Date ,width:100,formatter: Slick.Formatters.SimpleDate, cssClass: "cell-title"},
        { id: "ExtId", name: "ExtId", field: "ExtId" ,width:50, cssClass: "cell-title"},
	    { id: "size", name: "size",  field: "size", editor: Slick.Editors.Text },
	    { id: "Type", name: "Type", field: "Type", editor: Slick.Editors.Text },
        { id: "accuracy", name: "accuracy",  field: "accuracy" , editor: Slick.Editors.Text},
        { id: "bm", name: "businessmodel",  field: "bm" , editor: Slick.Editors.Text},
        { id: "theme", name: "theme",  field: "theme", editor: Slick.Editors.Text },
        { id: "lane", name: "lane",  field: "lane", editor: Slick.Editors.Text },
        { id: "sublane", name: "sublane",  field: "sublane" , editor: Slick.Editors.Text},
		{ id: "sublaneOffset", name: "sublaneOffset",  field: "sublaneOffset", editor: Slick.Editors.Text }];
	
	return _target;
}


function renderAdminGrid(data,conf){

	var columns = [];

	var checkboxSelector = new Slick.CheckboxSelectColumn({
		  cssClass: "slick-cell-checkboxsel"
		});
		
	// adds element in beginning of array
	conf.unshift(checkboxSelector.getColumnDefinition());
	
	columns= columns.concat(conf);


	var options = {
		editable: true,
		enableAddRow: false,
		enableCellNavigation: true,
		asyncEditorLoading: false,
		cellHighlightCssClass: "changed",
		 //multiColumnSort: true,
		 autoEdit: true,
		showHeaderRow:true,
		explicitInitialization:true,
		
	}
 
	var dataView = new Slick.Data.DataView();
	//dataView.setItems(targetData,"id");
	dataView.setItems(data,"id");

    admingrid = new Slick.Grid("#adminGrid", dataView, columns, options);
	
	admingrid.onAddNewRow.subscribe(function (e, args) {
      console.log("[DEBUG] onAddNewRow() fired");
      var item = args.item;
      item.id=0;
      
      /* default fill
       var item = {"num": data.length, "id": "new_" + (Math.round(Math.random() * 10000)), "title": "New task", "duration": "1 day", "percentComplete": 0, "start": "01/01/2009", "finish": "01/01/2009", "effortDriven": false};
    $.extend(item, args.item);
      */
      dataView.addItem(item);
//      admingrid.updateRowCount();
 //     admingrid.render();
    });


    
    admingrid.onSort.subscribe(function (e, args) {
		//console.log("**** sorting..by: "+args.sortCol.field);
		 var comparer = function(a, b) {
			return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
		}

		// Delegate the sorting to DataView.
		// This will fire the change events and update the grid.
		dataView.sort(comparer, args.sortAsc);
	});
	
    

    dataView.onRowsChanged.subscribe(function(e,args) {
		console.log("[DEBUG] onRowsChanged() fired");
		admingrid.invalidateRows(args.rows);
		admingrid.render();
	});
	
	
	admingrid.onCellChange.subscribe(function(e,args){
		console.log("[DEBUG] ***** CellChanged: "+args);
	});
	
	// ----------------------- column filter --------------------------------
	$(admingrid.getHeaderRow()).delegate(":input", "change keyup", function (e) {
      console.log("~~~~ keyup");
      
      var columnId = $(this).data("columnId");
       console.log("* columnId: "+columnId);
      if (columnId != null) {
        columnFilters[columnId] = $.trim($(this).val());
        dataView.refresh();
      }
    });
    
    
    //from query GET string
    if (_id){
		columnFilters["_id"] = _id;
	}
    
	
	admingrid.onHeaderRowCellRendered.subscribe(function(e, args) {
        $(args.node).empty();
        $("<input type='text'>")
           .data("columnId", args.column.id)
           .val(columnFilters[args.column.id])
           .appendTo(args.node);
    });

	
	admingrid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
    admingrid.registerPlugin(checkboxSelector);
    
    
    var columnpicker = new Slick.Controls.ColumnPicker(columns, admingrid, options);
	
    admingrid.init(); 
    
    // default sort column
    dataView.sort(function(a, b) {
		return (new Date(a["ChangeDateUTC"]) > new Date(b["ChangeDateUTC"])) ? 1 : -1;
	},false);
     
     
   
    dataView.setFilter(filter);
   
	// ------------------------  column filter ---------------------------------- 
     
}



/**
* for column filter prototype
*/

function filter(item) {
    console.log("##### filter called:");
    
    for (var columnId in columnFilters) {
      if (columnId !== undefined && columnFilters[columnId] !== "") {
        console.log("**** filter triggered: columnId"+ columnId);
        var c = admingrid.getColumns()[admingrid.getColumnIndex(columnId)];
        console.log("**** filter triggered: c="+item[c.field]);
        if (item[c.field] != columnFilters[columnId]) {
          return false;
        }
      }
    }
    
    return true;
  }


// Define some sorting functions
function NumericSorter(a, b) {
  var x = a[sortcol], y = b[sortcol];
  return sortdir * (x == y ? 0 : (x > y ? 1 : -1));
}


var syncList; 

var itemInsertList; 


d3.select("#bremove").on("click", function(){
		console.log("REMOVE selected rows: "+admingrid.getSelectedRows());
		
		syncList = new Array();
		itemInsertList = new Array();
		
		var _sel = admingrid.getSelectedRows();
		for (var s in _sel){
				syncList.push(admingrid.getData().getItem(_sel[s]));
		}
	
		var _json = JSON.stringify(syncList);
		console.log("JSON.stringify tha shit..."+_json);
		
		// and send to backend ! :-)
		$.ajax({
		type: "DELETE",
		url: dataSourceFor(_type),
		
		//type: "POST",
		//url: "data/pdo.php",
		//data: { 'itemJson': _json, 'action':'remove' },
		
		data: { 'itemJson': _json, 'action':'remove' },
		dataType:"json",
		cache: false,
		success: function(msg)
			{
				refresh();
				//alert(":  ajax REMOVE success: ");
				 $('.top-left').notify({
						message: { html: "<span class=\"glyphicon glyphicon-ok\"></span><span style=\"font-size:10px;font-weight:bold\"> admin.remove() says:</span> <br/><div style=\"font-size:10px;font-weight:normal;margin-left:20px\">* successfuly removed item [_id:"+syncList[0]._id+"]</div>" },
						fadeOut: {enabled:true,delay:10000},
						type: "success"
					  }).show(); // for the ones that aren't closable and don't fade out there is a .hide() function.
				  
			},
		error: function(msg)
			{
				refresh();
				//alert(":  ajax SYNC success: ");
				$('.top-left').notify({
						message: { html: "<span class=\"glyphicon glyphicon-fire\"></span><span style=\"font-size:10px;font-weight:bold\"> admin.remove() says:</span> <br/><div style=\"font-size:10px;font-weight:normal;margin-left:20px\">* synced item [_id:"+syncList[0]._id+"] #failed<br>"+JSON.stringify(msg)+"</div>" },
						fadeOut: {enabled:false},
						type: "danger"
					  }).show(); // for the ones that aren't closable and don't fade out there is a .hide() function.
				
				
			}
		});
	
	});
	
	

d3.select("#bsave").on("click", function(){
		console.log("[DEBUG] SAVE selected rows: "+admingrid.getSelectedRows());
		
		saveList = new Array();
		
		var _sel = admingrid.getSelectedRows();
		
		for (var s in _sel){
				saveList.push(admingrid.getData().getItem(_sel[s]));
		}
		
		
		
		var _json = JSON.stringify(saveList);
		console.log("JSON.stringify tha shit..."+_json);
		
		// and send to backend ! :-)
		$.ajax({
		type: "POST",
		//url: "data/pdo.php",
		url: dataSourceFor(_type),
		data: { 'itemJson': _json, 'action':'save' },
		cache: false,
		//async:false,
		//contentType:"application/json",
		dataType:"json",
		success: function(msg)
			{
				refresh();
				//alert(":  ajax SYNC success: ");
				var _items="";
				for (var i in saveList){
					_items+=saveList[i].name;
					console.log("*****i: "+i+" - "+saveList[i].name);
					if (i< saveList.length-1) _items+=", "
				}
				
				$('.top-left').notify({
						message: { html: "<span class=\"glyphicon glyphicon-ok\"></span><span style=\"font-size:10px;font-weight:bold\"> admin.save() says:</span> <br/><div style=\"font-size:10px;font-weight:normal;margin-left:20px\">* successfuly saved "+_type+": "+_items+"]</div>" },
						fadeOut: {enabled:true,delay:3000},
						type: "success"
					  }).show(); // for the ones that aren't closable and don't fade out there is a .hide() function.
				
				
			},
		error: function(msg)
			{
				refresh();
				//alert(":  ajax SYNC success: ");
				$('.top-left').notify({
						message: { html: "<span class=\"glyphicon glyphicon-fire\"></span><span style=\"font-size:10px;font-weight:bold\"> admin.save() says:</span> <br/><div style=\"font-size:10px;font-weight:normal;margin-left:20px\">* synced item [_id:"+saveList[0]._id+"] #failed<br>"+JSON.stringify(msg)+"</div>" },
						fadeOut: {enabled:false},
						type: "danger"
					  }).show(); // for the ones that aren't closable and don't fade out there is a .hide() function.
				
				
			}
		});
		
	});	





















 </script>
</body>
</html>

<?php
}
?>
