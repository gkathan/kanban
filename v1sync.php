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
  <title>corpkanban - v1 sync admin</title>
 
 <script src="js/d3.v3.min.js"></script>
<script src="js/SlickGrid-master/lib/jquery-1.7.min.js"></script>
<script src="js/SlickGrid-master/lib/jquery-ui-1.8.16.custom.min.js"></script>
<script src="js/SlickGrid-master/lib/jquery.event.drag-2.2.js"></script>

<script src="bootstrap/dist/js/bootstrap.min.js"></script>

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







	.item-details-form {
      z-index: 10000;
      display: inline-block;
      border: 1px solid black;
      margin: 8px;
      padding: 10px;
      background: #efefef;
      -moz-box-shadow: 0px 0px 15px black;
      -webkit-box-shadow: 0px 0px 15px black;
      box-shadow: 0px 0px 15px black;

      position: absolute;
      top: 10px;
      left: 150px;
    }

    .item-details-form-buttons {
      float: right;
    }

    .item-details-label {
      margin-left: 10px;
      margin-top: 20px;
      display: block;
      font-weight: bold;
    }

    .item-details-editor-container {
      width: 200px;
      height: 20px;
      border: 1px solid silver;
      background: white;
      display: block;
      margin: 10px;
      margin-top: 4px;
      padding: 0;
      padding-left: 4px;
      padding-right: 4px;
    }







    
    
  </style>
</head>
<body>

<script id="itemDetailsTemplate" type="text/x-jquery-tmpl">
  <div class='item-details-form'>
    {{each columns}}
    <div class='item-details-label'>
      ${name}
    </div>
    <div class='item-details-editor-container' data-editorid='${id}'></div>
    {{/each}}

    <hr/>
    <div class='item-details-form-buttons'>
      <button data-action='save'>Save</button>
      <button data-action='cancel'>Cancel</button>
    </div>
  </div>
</script>


	
<div style="position:relative">
  <div style="width:5000px;">
	
   
  
  
  <div class="btn-group-xs">
	  <img src="img/external_elements_v1_synch.png" height="70px"/>	
	  <br>
	  <button id="bsync" type="button" class="btn btn-primary">Sync Selected</button>
	  <button id="bremove" type="button" class="btn btn-danger">Remove Selected</button>
  </div>
  
   
    <div id="v1Grid" style="position:absolutewidth:100%;height:1000px;"></div>

  </div>
 <script>
	 document.write("v1.data.link: <a href=\""+V1_DATA_URL+"\"target=\"_new\"> "+V1_DATA_URL+"</a>");
	 document.write("<br>kanban.initiatives.link: <a href=\""+dataSourceFor("initiatives")+"\"target=\"_new\"> "+dataSourceFor("initiatives")+"</a>");
	 document.write("<br>kanban.targets.link: <a href=\""+dataSourceFor("targets")+"\"target=\"_new\"> "+dataSourceFor("targets")+"</a>");

 </script>

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
var epicData;

// compare epic with initiative data 
var comparedData;

var v1grid;
  
var columnFilters={};

var url_query = window.location.search;
var _filterName;
var _filterValue;
url_query = url_query.replace("?", ''); // remove the ?

_filterName=url_query.split("=")[0];
_filterValue=url_query.split("=")[1];
  

refresh();


/** main method
*/
function refresh(){
	$.when(	$.getJSON(dataSourceFor("initiatives")),
				$.getJSON(V1_DATA_URL))

				
			.done(function(initiatives,epics){
					if (initiatives[1]=="success") initiativeData=initiatives[0];
					else throw new Exception("error loading initiatives");
					if (epics[1]=="success") {
						epicData=epics[0];
					}
					
					else throw new Exception("error loading epics");
					
					cleanupEpicData();
					comparedData  = compareData(initiativeData,epicData);
					
					//epicData = filterByNameValue(epicData,"CategoryName","FeatureGroup");
					comparedData = filterByNameValue(comparedData,"CategoryName","Initiative");
					
					renderV1EpicGrid();
				});
}



// ======================== helper & comapre stuff ========================

function cleanupEpicData(){
	for (var i in epicData){
			epicData[i].ID = epicData[i].ID.split("Epic:")[1]; 
	}
	
}

/** compares and meshes in kanbandata to V1 epic data 
*/
function compareData(initiatives,epics){
	
	var _compare = new Array();
	
	for (var e in epics){
			var _initiative = lookupByField(initiatives,"ExtId",epics[e].ID);
			if (_initiative){
				// ok we have already an initiative in kanban system for this epic 
				// so lets mark it 
				epics[e]["isOnKanban"]=true;
				epics[e]["kanbanName"]=_initiative.name;
				epics[e]["kanbanName2"]=_initiative.name2;
				
				epics[e]["kanbanSwag"]=_initiative.Swag;
				epics[e]["kanbanActualDate"]=_initiative.actualDate;
				epics[e]["kanbanPlanDate"]=_initiative.planDate;
				
				epics[e]["kanbanLane"]=_initiative.lane;
				epics[e]["kanbanSubLane"]=_initiative.sublane;
				epics[e]["kanbanTheme"]=_initiative.theme;
				epics[e]["kanbanBM"]=_initiative.bm;
				epics[e]["kanbanHealth"]=_initiative.health;
				
				epics[e]["kanbanId"]=_initiative.id;
				epics[e]["kanbanMongoId"]=_initiative._id;
				epics[e]["kanbanExtId"]=_initiative.ExtId;
				
				epics[e]["kanbanState"]=_initiative.state;
				epics[e]["kanbanCreateDate"]=_initiative.createDate;
				epics[e]["kanbanChangeDate"]=_initiative.changeDate;
				epics[e]["kanbanSublaneOffset"]=_initiative.sublaneOffset;
				epics[e]["kanbanDescription"]=_initiative.DoD;
				
				epics[e]["kanbanSize"]=_initiative.size;
			}
			else epics[e]["isOnKanban"]=false;
			
			_compare.push(epics[e]);
	}
	return _compare;
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

// ======================== helper & comapre stuff ========================


/*


bm:
b2c gaming,new biz

themes:
topline,enabling

lanes:
bwin,pp,foxy,premium,casino,techdebtshared,kalixa,conspo,wincom

sublanes:
"touch":"touch","click":"click","product":"product","market":"market","enabling":"enabling","CS":"CS","architecture":"architecture","agile":"agile","leanops":"leanops","devops":"devops","people":"people","entIT":"entIT","marketing":"marketing"


*/




function renderV1EpicGrid(){

var columns = [];


  var checkboxSelector = new Slick.CheckboxSelectColumn({
      cssClass: "slick-cell-checkboxsel"
    });
	columns.push(checkboxSelector.getColumnDefinition());

columns.push(
        
        { id:"id", name: "v1.id", field: "ID",sortable:true,width:70,formatter:Slick.Formatters.V1EpicURL,cssClass:"onV1", sorter:NumericSorter ,toolTip:"V1 internal OID"},
        { id:"number", name: "v1.number", field: "Number",sortable:true,cssClass:"onV1", sorter:NumericSorter},
        { id:"kanbanExtId", name: "kanban.ExtId", field: "kanbanExtId",sortable:true,cssClass:"onKanban", sorter:NumericSorter},
        { id:"kanbanId", name: "kanban.id", field: "kanbanId",cssClass:"onKanban",sortable:true, sorter:NumericSorter,width:50},
        { id:"kanbanMongoId", name: "kanban._id", field: "kanbanMongoId",cssClass:"onKanban",sortable:true, sorter:NumericSorter,width:50},        
        { id:"isOnKanban", name: "isOnKanban", field: "isOnKanban",formatter: Slick.Formatters.Checkmark,sortable:true, sorter:NumericSorter,width:30},
        
        { id: "name", name: "v1.name", field: "Name",width:300, cssClass: "cell-title",cssClass:"onV1",sortable:true, sorter:NumericSorter},
        { id: "kanbanName", name: "kanban.name", field: "kanbanName",editor: Slick.Editors.Text,cssClass:"onKanban",width:200 },
        { id: "kanbanName2", name: "kanban.name2", field: "kanbanName2", editor: Slick.Editors.Text,cssClass:"onKanban",width:200 },
        { id: "plannedStart", name: "v1.plannedStart", field: "PlannedStart",cssClass:"onV1",formatter: Slick.Formatters.SimpleDate,sortable:true,width:80 },
        { id: "plannedEnd", name: "v1.plannedEnd", field: "PlannedEnd",cssClass:"onV1",formatter: Slick.Formatters.SimpleDate,sortable:true,width:80 },
        { id: "launchDate", name: "v1.launchDate", field: "LaunchDate",cssClass:"onV1",formatter: Slick.Formatters.SimpleDate,sortable:true,width:80 },
        { id: "kanbanPlanDate", name: "kanban.planDate", field: "kanbanPlanDate",formatter: Slick.Formatters.SimpleDate,cssClass:"onKanban",editor:Slick.Editors.Date,sortable:true,width:100},
        { id: "kanbanActualDate", name: "kanban.actualDate", field: "kanbanActualDate",formatter: Slick.Formatters.SimpleDate,cssClass:"onKanban",editor:Slick.Editors.Date,sortable:true,width:100},
        { id: "kanbanBM", name: "kanban.bm",cssClass:"onKanban", field: "kanbanBM",editor: Slick.Editors.SelectCell,options:{"b2c gaming":"b2c gaming","kalixa":"kalixa","win":"win"},sortable:true, sorter:NumericSorter,width:80 },
        { id: "kanbanTheme", name: "kanban.theme",cssClass:"onKanban", field: "kanbanTheme",editor: Slick.Editors.SelectCell,options:{"topline":"topline","enabling":"enabling"},width:80 },
        { id: "kanbanLane", name: "kanban.lane",field: "kanbanLane",cssClass:"onKanban",editor: Slick.Editors.SelectCell,options:{"bwin":"bwin","pp":"pp","foxy":"foxy","premium":"premium","casino":"casino","techdebt":"techdebt","shared":"shared"},sortable:true, sorter:NumericSorter,width:80 },
        { id: "kanbanSubLane", name: "kanban.sublane", field: "kanbanSubLane",cssClass:"onKanban",editor: Slick.Editors.SelectCell,options:{"touch":"touch","click":"click","product":"product","market":"market","enabling":"enabling","CS":"CS","architecture":"architecture","agile":"agile","leanops":"leanops","devops":"devops","people":"people","entIT":"entIT","marketing":"marketing"},width:80 },
        { id: "kanbanState", name: "kanban.state", field: "kanbanState",cssClass:"onKanban",editor: Slick.Editors.SelectCell,options:{"planned":"planned","todo":"todo","done":"done"},width:80 },
        { id: "swag", name: "v1.swag", field: "Swag",cssClass:"onV1",sortable:true, sorter:NumericSorter,width:50 },
        { id: "kanbanSwag", name: "kanban.Swag", field: "kanbanSwag",cssClass:"onKanban",sortable:true, sorter:NumericSorter,width:50 },
        { id: "categoryName", name: "v1.categoryName", field: "CategoryName",cssClass:"onV1",sortable:true ,sorter:NumericSorter},
        { id: "status", name: "v1.status", field: "Status",cssClass:"onV1",sortable:true },
		{ id: "health", name: "v1.health", field: "Health",formatter: Slick.Formatters.RAG,sortable:true },
		{ id: "healthComment", name: "v1.health comment", field: "HealthComment", editor: Slick.Editors.LongText ,width:500 ,cssClass:"onV1"},
        { id: "kanbanHealth", name: "kanban.health", field: "kanbanHealth",cssClass:"onKanban",formatter: Slick.Formatters.RAG,sortable:true },
		{ id: "scope", name: "v1.backlog", field: "Scope",cssClass:"onV1",sortable:true,width:150 },
		{ id: "createdBy", name: "v1.createdBy", field: "CreatedBy",cssClass:"onV1",sortable:true },
        { id: "kanbanCreateDate", name: "kanban.createDate", field: "kanbanCreateDate",cssClass:"onKanban",sortable:true, sorter:NumericSorter},
        { id: "kanbanChangeDate", name: "kanban.changeDate", field: "kanbanChangeDate",cssClass:"onKanban",sortable:true, sorter:NumericSorter},
        { id: "changeDate", name: "v1.changeDate", field: "ChangeDateUTC",cssClass:"onV1",formatter: Slick.Formatters.SimpleDate,sortable:true,width:80,sorter:NumericSorter },
        { id: "createDate", name: "v1.createDate", field: "CreateDateUTC",cssClass:"onV1",formatter: Slick.Formatters.SimpleDate,sortable:true,width:80 },
      
        { id: "kanbanSize", name: "kanban.size", field: "kanbanSize",cssClass:"onKanban",editor:Slick.Editors.Integer,sortable:true,width:50},
        { id: "kanbanSublaneOffset", name: "kanban.offset", field: "kanbanSublaneOffset",cssClass:"onKanban",editor:Slick.Editors.Integer,sortable:true,width:50},
        //{ id:"estimatedDone", name: "estimatedDone", field: "EstimatedDone",sortable:true,width:150 },
        { id: "description", name: "v1.description", field: "Description",cssClass:"onV1", editor: Slick.Editors.LongText ,width:500,cssClass:"onV1"},
        { id: "kanbanDescription", name: "kanban.DoD", field: "kanbanDescription",cssClass:"onKanban", editor: Slick.Editors.LongText ,width:500},
        { id: "patentprotection", name: "v1.patentprotection", field: "Patentprotection",cssClass:"onV1", editor: Slick.Editors.Text ,width:50, }
  );

  var options = {
    editable: true,
    //enableAddRow: true,
    enableCellNavigation: true,
    asyncEditorLoading: false,
    cellHighlightCssClass: "changed",
    cellHighlightCssClass: "changed",
     //multiColumnSort: true,
     autoEdit: true,
    showHeaderRow:true,
    explicitInitialization:true,
	
}
    
	var dataView = new Slick.Data.DataView();
	dataView.setItems(comparedData,"ID");

    v1grid = new Slick.Grid("#v1Grid", dataView, columns, options);
    
    v1grid.onAddNewRow.subscribe(function (e, args) {
      var item = args.item;
      v1grid.invalidateRow(data.length);
      data.push(item);
      v1grid.updateRowCount();
      v1grid.render();
    });


    
    v1grid.onSort.subscribe(function (e, args) {
		//console.log("**** sorting..by: "+args.sortCol.field);
		 var comparer = function(a, b) {
			return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
		}

		  // Delegate the sorting to DataView.
		  // This will fire the change events and update the grid.
		  dataView.sort(comparer, args.sortAsc);
	});
	

	  
    
    dataView.onRowsChanged.subscribe(function(e,args) {
		v1grid.invalidateRows(args.rows);
		v1grid.render();
	});
	
	
	v1grid.onCellChange.subscribe(function(e,args){
		console.log("***** CellChanged: "+args);
		
	});
	
	// ----------------------- column filter --------------------------------
	$(v1grid.getHeaderRow()).delegate(":input", "change keyup", function (e) {
      console.log("~~~~ keyup");
      
      var columnId = $(this).data("columnId");
       console.log("* columnId: "+columnId);
      if (columnId != null) {
        columnFilters[columnId] = $.trim($(this).val());
        dataView.refresh();
      }
    });
    
    
    //from query GET string
    if (_filterValue){
		columnFilters[_filterName] = _filterValue;
	}
    
	
	v1grid.onHeaderRowCellRendered.subscribe(function(e, args) {
        $(args.node).empty();
        $("<input type='text'>")
           .data("columnId", args.column.id)
           .val(columnFilters[args.column.id])
           .appendTo(args.node);
    });

	
	v1grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
    v1grid.registerPlugin(checkboxSelector);
    
  
    
    
    var columnpicker = new Slick.Controls.ColumnPicker(columns, v1grid, options);
	v1grid.init();



	// default sort column
    dataView.sort(function(a, b) {
		return (new Date(a["ChangeDateUTC"]) > new Date(b["ChangeDateUTC"])) ? 1 : -1;
	},false);
     
     
     
    //dataView.beginUpdate();
    //dataView.setItems(compareData,"ID");
    dataView.setFilter(filter);
    //dataView.endUpdate();

	// ------------------------  column filter ----------------------------------
	
}


/** detached detail editor view
*/
function openDetails() {
    console.log("******");
	
    if (v1grid.getEditorLock().isActive() && !v1grid.getEditorLock().commitCurrentEdit()) {
      return;
    }

var columns = v1grid.getColumns()
	
    var $modal = $("<div class='item-details-form'></div>");

    $modal = $("#itemDetailsTemplate")
        .tmpl({
          context: v1grid.getDataItem(v1grid.getActiveCell().row),
          columns: columns
        })
        .appendTo("body");

    $modal.keydown(function (e) {
      if (e.which == $.ui.keyCode.ENTER) {
        v1grid.getEditController().commitCurrentEdit();
        e.stopPropagation();
        e.preventDefault();
      } else if (e.which == $.ui.keyCode.ESCAPE) {
        v1grid.getEditController().cancelCurrentEdit();
        e.stopPropagation();
        e.preventDefault();
      }
    });

    $modal.find("[data-action=save]").click(function () {
      v1grid.getEditController().commitCurrentEdit();
    });

    $modal.find("[data-action=cancel]").click(function () {
      v1grid.getEditController().cancelCurrentEdit();
    });


    var containers = $.map(columns, function (c) {
      return $modal.find("[data-editorid=" + c.id + "]");
    });

    var compositeEditor = new Slick.CompositeEditor(
        columns,
        containers,
        {
          destroy: function () {
            $modal.remove();
          }
        }
    );

    v1grid.editActiveCell(compositeEditor);
  }



/**
* for column filter prototype
*/
function filter(item) {
    //console.log("##### filter called:");
    for (var columnId in columnFilters) {
      if (columnId !== undefined && columnFilters[columnId] !== "") {
        var c = v1grid.getColumns()[v1grid.getColumnIndex(columnId)];
        //console.log("**** filter triggered: c="+item[c.field]);
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
		console.log("REMOVE selected rows: "+v1grid.getSelectedRows());
		
		syncList = new Array();
		itemInsertList = new Array();
		
		var _sel = v1grid.getSelectedRows();
		for (var s in _sel){
				syncList.push(v1grid.getData().getItem(_sel[s]));
		}
	
		var _json = JSON.stringify(syncList);
		//console.log("JSON.stringify tha shit..."+_json);
		
		// and send to backend ! :-)
		$.ajax({
		type: "DELETE",
		url: dataSourceFor("initiatives"),
		
		//type: "POST",
		//url: "data/pdo.php",
		//data: { 'itemJson': _json, 'action':'remove' },
		
		data: { 'itemJson': _json, 'action':'remove' },
		dataType:"json",
		cache: false,
		success: function(msg)
			{
				refresh();
				alert(":  ajax REMOVE success: ");
			}
		});
	
	});
	
	

d3.select("#bsync").on("click", function(){
		console.log("SYNC selected rows: "+v1grid.getSelectedRows());
		
		syncList = new Array();
		itemInsertList = new Array();
		
		var _sel = v1grid.getSelectedRows();
		
		for (var s in _sel){
				syncList.push(v1grid.getData().getItem(_sel[s]));
		}
		
		for (var i in syncList){
				
				var _sync = syncList[i];
				var _item = {};
				//_item["_id"]=_sync["kanbanId"] ? _sync["kanbanId"] : null ;
				_item["id"]=_sync["kanbanId"] ? _sync["kanbanId"] : null ;
				_item["name"]=_sync["Name"];
				_item["ExtId"]=_sync["ID"];
				_item["name2"]=_sync["kanbanName2"] ? _sync["kanbanName2"] : null;
				_item["isCorporate"]="x";
				_item["onKanban"]=true;
				_item["backlog"]=_sync["Scope"]
				_item["bm"]=_sync["kanbanBM"];;
				_item["theme"]=_sync["kanbanTheme"];
				_item["themesl"]="";
				_item["lane"]=_sync["kanbanLane"];
				_item["sublane"]=_sync["kanbanSubLane"];
				_item["sublaneOffset"]=_sync["kanbanSublaneOffset"] ? _sync["kanbanSublaneOffset"] : "";
				_item["startDate"]=_sync["kanbanStartDate"] ? _sync["kanbanStartDate"] : "";
				_item["planDate"]=_sync["kanbanPlanDate"];//d3.time.format("%Y-%m-%d")(new Date(_sync["kanbanPlanDate"])) ;
				_item["actualDate"]=_sync["kanbanActualDate"] ? _sync["kanbanActualDate"]:_sync["kanbanPlanDate"] ;//d3.time.format("%Y-%m-%d")(new Date(_sync["kanbanActualDate"]));
				
				// v1 dates => store them too to track changes in v1 dates ;-) 
				_item["v1plannedStart"]=_sync["PlannedStart"] ? d3.time.format("%Y-%m-%d")(new Date(_sync["PlannedStart"])) :"";
				_item["v1plannedEnd"]= _sync["PlannedEnd"] ? d3.time.format("%Y-%m-%d")(new Date(_sync["PlannedEnd"])): "";
				_item["v1launchDate"]=_sync["LaunchDate"] ? d3.time.format("%Y-%m-%d")(new Date(_sync["LaunchDate"])): "";
				
				_item["progress"]=0;
				_item["health"]=_sync["Health"] ? _sync["Health"].toLowerCase() :"";
				
				//strip out all HTML tags - http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
				_item["healthComment"]=_sync["HealthComment"] ? $("<p>"+_sync["HealthComment"]+"</p>").text() :"";
				_item["status"]=_sync["Status"];
				
				//default state = planned
				_item["state"]=_sync["kanbanState"] ? _sync["kanbanState"] : "planned" ;
				
				// default size 7
				_item["size"]=_sync["kanbanSize"] ? _sync["kanbanSize"] : 7;
				_item["Type"]="item";
				_item["cost"]=0;
				_item["Swag"]=_sync["Swag"];
				_item["benefit"]=0;
				_item["dependsOn"]="";
				_item["accuracy"]=10;
				_item["productOwner"]="";
				_item["businessOwner"]="";
				_item["programLead"]="";
				
				//strip out all HTML tags - http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
				_item["DoD"]=_sync["Description"] ? $("<p>"+_sync["Description"]+"</p>").text() : "";
				_item["DoR"]="";
				_item["createDate"]=_sync["kanbanCreateDate"];
				
				itemInsertList.push(_item);
		}
		var _json = JSON.stringify(itemInsertList);
		console.log("JSON.stringify tha shit..."+_json);
		
		// and send to backend ! :-)
		$.ajax({
		type: "POST",
		//url: "data/pdo.php",
		url: dataSourceFor("initiatives"),
		data: { 'itemJson': _json, 'action':'sync' },
		cache: false,
		//async:false,
		//contentType:"application/json",
		dataType:"json",
		success: function(msg)
			{
				refresh();
				alert(":  ajax SYNC success: ");
			}
		});
	});	

 </script>
</body>
</html>

<?php
}
?>
