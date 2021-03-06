<?php

session_start();



if( !isset($_SESSION['auth']) ) {
     header("Location: login.html?page=kanban.php");
}
else {
	
	$auth=$_SESSION['auth'];
	if ($auth!="bpty" && $auth!="exec" && $auth!="admin")
	{
	   header("Location: login.html?page=kanban.php");
}
else{
	

?>

<!DOCTYPE html> 
<meta charset="utf-8">
<head>


<link rel="stylesheet" type="text/css" href="css/kanban.css">
<link rel="stylesheet" type="text/css" href="css/kanban_b2c.css">


<script src="js/d3.v3.min.js"></script>
<script src="js/date.min.js"></script>



<script src="js/jquery-2.1.0.min.js"></script>



<!-- for pqgrid 
 <link rel="stylesheet"
     href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/themes/base/jquery-ui.css" />
 
 <script src="http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"></script>
<!-- for pqgrid -->



<script src="bootstrap/dist/js/bootstrap.min.js"></script>

<script src="js/vkbeautify.0.99.00.beta.js"></script>
<script src="js/bootstrap-multiselect.js"></script>

<script src="js/bootstrap-notify.js"></script>

<script src="js/mousetrap.min.js"></script>

<script src="js/underscore-min.js"></script>
<script src="js/underscore.nest.min.js"></script>


<script src="js/flippant.min.js"></script>
<script src="js/moment.min.js"></script>
<script src="js/daterangepicker.js"></script>
<script src="js/jquery.sidr.min.js"></script>
<!--<script src="js/pqgrid.min.js"></script>-->



<script src="js/wiki2html.js"></script>

<script src="js/d3_util.js"></script>
<script src="js/kanban_config.js"></script>
<script src="js/kanban_core.js"></script>
<script src="js/kanban_util.js"></script>
<script src="js/kanban_grid.js"></script>
<script src="js/kanban_lanes.js"></script>
<script src="js/kanban_queues.js"></script>
<script src="js/kanban_items.js"></script>
<script src="js/kanban_metrics.js"></script>
<script src="js/kanban.js"></script>


<link rel="stylesheet" type="text/css" href="css/jquery.sidr.light.css">

<link rel="stylesheet" type="text/css" href="bootstrap/dist/css/bootstrap.min.css">
<link href="css/font-awesome-4.0.3/css/font-awesome.min.css" rel="stylesheet">
   
<link rel="stylesheet" type="text/css" href="css/daterangepicker-bs3.css">
<link rel="stylesheet" type="text/css" href="css/bootstrap-multiselect.css">
<link rel="stylesheet" type="text/css" href="css/flippant.css">
<!--<link rel="stylesheet" type="text/css" href="css/pqgrid.min.css">-->

<link rel="stylesheet" href="js/SlickGrid-master/slick.grid.css" type="text/css"/>
<link rel="stylesheet" href="js/SlickGrid-master/css/smoothness/jquery-ui-1.8.16.custom.css" type="text/css"/>


<!-- Notify CSS -->
<link href="css/bootstrap-notify.css" rel="stylesheet">

<!-- Custom Styles -->
<link href="css/styles/alert-bangtidy.css" rel="stylesheet">
<link href="css/styles/alert-blackgloss.css" rel="stylesheet">
 

<!--g
<link href='http://fonts.googleapis.com/css?family=Open+Sans+Condensed:300,300italic,700' rel='stylesheet' type='text/css'>
-->

</head>

<!-- ---------------------------------------------- KANBAN  ------------------------------------------------------------->
<script>
	
	
	<?php echo "var AUTH=\"$auth\";";?>



	if (RUNMODE=="LEGACY"){
	
		WIDTH=1500;
		HEIGHT = 1100;

		ITEM_SCALE=0.8;
		//ITEMDATA_NEST= ["bm","theme","lane","themesl","sublane"];
		//ITEMDATA_NEST = ["bm","theme","lane","sublane"];

		ITEMDATA_NEST= ["theme","lane","sublane"];
		
		/*
		ITEMDATA_FILTER = [{"name":"bm", "operator":"==", "value":"b2c gaming"}];
		CONTEXT=ITEMDATA_FILTER.value;
		*/

		CONTEXT = "b2c gaming";

	}	
		// the whole ITEMDATACONFIG is NOT NEEDED => it is only addon-formatting override !
		//percentages is for override => if not specified it uses mode to auto layout
		itemDataConfig = [	
							{"level":"0", "mode": "auto","percentages":
									[
										{"context":"holding","name":"b2c gaming","value"	:80},
										{"context":"holding","name":"new biz","value"		:20}
										
									]
							},
							{"level":"1", "mode": "auto","percentages":
									[
										{"context":"b2c gaming", "name":"topline","value"	:60},
										{"context":"b2c gaming","name":"enabling","value"	:40},
										{"context":"holding", "name":"b2c gaming"+FQ_DELIMITER+"topline","value"	:65},
										{"context":"holding","name":"b2c gaming"+FQ_DELIMITER+"enabling","value"	:35},
										{"context":"new biz","name":"topline","value"		:100},
										{"context":"new biz","name":"enabling","value"		:0}
										
									]
							},
							{"level":"2","mode": "auto","percentages":
									
									[
										{"context":"*","name":"topline"+FQ_DELIMITER+"bwin","value"		:32},
										{"context":"*","name":"topline"+FQ_DELIMITER+"pp","value"		:22},
										{"context":"*","name":"topline"+FQ_DELIMITER+"foxy","value"		:18},
										{"context":"*","name":"topline"+FQ_DELIMITER+"premium","value"	:12},
										{"context":"*","name":"topline"+FQ_DELIMITER+"casino","value"	:18},
										{"context":"*","name":"enabling"+FQ_DELIMITER+"techdebt","value"	:50},
										{"context":"*","name":"enabling"+FQ_DELIMITER+"shared","value"	:50},
										{"context":"*","name":"topline"+FQ_DELIMITER+"kalixa","value"	:50},
										{"context":"*","name":"topline"+FQ_DELIMITER+"wincom","value"	:35},
										{"context":"*","name":"topline"+FQ_DELIMITER+"conspo","value"	:15}

									]
										
							},
							// selective override only for one sublane works too ;-)
							{"level":"3","mode":"equal","percentages":
									[
										{"context":"*","name":"bwin"+FQ_DELIMITER+"touch","value"	:30},
										{"context":"*","name":"bwin"+FQ_DELIMITER+"click","value"	:10},
										{"context":"*","name":"bwin"+FQ_DELIMITER+"market","value"	:20},
										{"context":"*","name":"bwin"+FQ_DELIMITER+"product","value"	:20},
										{"context":"*","name":"bwin"+FQ_DELIMITER+"enabling","value":20}
									]
							}
							
							
							
							
							];		
	
// **********  ENTRY POINT ********************//	
// => kanban.js.render()
	
	render("data/external.svg");
	
	
</script>

<!-- ---------------------------------------------- BODY ------------------------------------------------------------->

<body>



	<div class="btn-group-xs">
	  <button id="kanban_menu" type="button" class="btn btn-primary btn-xs"><span class="glyphicon glyphicon-off"></span> kanban menu</button>
	</div>






<script>
$(document).ready(function() {
  $('#kanban_menu').sidr({speed:300});

});
</script>			


<!-- Hidden <FORM> to submit the SVG data to the server, which will convert it to SVG/PDF/PNG downloadable file.
     The form is populated and submitted by the JavaScript below. -->
     
<!-- production transcoder (tomcat6): http://www.kathan.at/transcode/--> 
<!-- dev transcoder(jetty on ubuntu): http://localhost:8080/transcode/--> 
<form id="svgform" method="post" action="http://tomcat.ea.bwinparty.corp/transcode/">

<!--<form id="svgform" method="post" action="localhost:8080/transcode/">-->

 <input type="hidden" id="format" name="format" value="">
 <input type="hidden" id="data" name="data" value="">
 <input type="hidden" id="context" name="context" value="">
 <input type="hidden" id="svg_width" name="svg_width" value="">
 <input type="hidden" id="svg_height" name="svg_height" value="">
 <input type="hidden" id="png_scale" name="png_scale" value="">
 
</form>
<script>


/*
   Utility function: populates the <FORM> with the SVG data
   and the requested output format, and submits the form.
*/
function submit_download_form(output_format)
{
	//dirty hack for the CSS declaration
	// last css is for bootstrap => exclude !
	
	var declaration ="";
	for (var i=0;i<2;i++){
		console.log("***"+i);
		declaration = declaration+"<?xml-stylesheet href=\""+document.styleSheets[i].href+"\" type=\"text/css\"?>";
	}
	console.log("***declaration"+declaration);

	// Get the d3js SVG element
	var svg = document.getElementsByTagName("svg")[0];
	// Extract the data as SVG text string
	var svg_xml = (new XMLSerializer).serializeToString(svg);
	var form = document.getElementById("svgform");
	
	//console.log(declaration+svg_xml);
	form.action=TRANSCODE_URL;
	form["format"].value = output_format;
	form["data"].value = declaration+svg_xml ;
	form["context"].value = CONTEXT+"_"+METRIC_VIEW ;
	form["svg_width"].value = WIDTH ;
	form["svg_height"].value = HEIGHT ;
	//high res scale
	form["png_scale"].value = 3 ;
	console.log("*going to submit to "+TRANSCODE_URL);
	
	form.submit();
}


</script>

<div class='notifications top-left'></div>

<div id="sidr" style="margin-left:10px;margin-top:10px">


<!-- ***************************** auth check  *********************************** -->

<?php 
	echo "<div style=\"font-size:6px\">logged in as <b> $auth</b> <a href=\"login.php?action=logout\">logout</a></div>";
	if ($auth =="admin" || $auth=="exec"){ ?>

		<div  class="row" style="margin-left:10px;margin-bottom:10px">
				<!--date range -->
				<div id="kanbanrange"  class="pull-left" style="margin-left:10px;margin-bottom:10px">
					<span style="font-size:12px;font-weight:bold;margin-left:20px">KANBAN RANGE</span><br><i class="fa fa-calendar fa-lg"></i>
					<span style="font-size:10px"><script type="text/javascript"> document.write(KANBAN_START.toString("MMMM d, yyyy")+" - "+KANBAN_END.toString("dd.MMMM yyyy"));</script></span> <b class="caret"></b>
				</div>
				 
				<script type="text/javascript">
				$('#kanbanrange').daterangepicker(
					{
					  ranges: {
						 'ALL': [KANBAN_START, KANBAN_END],
						 'WIP': [moment().subtract('days', 10), moment().add('days', WIP_WINDOW_DAYS+10)],
						 'History': [moment("2012-01-01"), moment().add("days",10)],
						 'Last 30 Days': [moment().subtract('days', 29), moment()],
						 'This Month': [moment().startOf('month'), moment().endOf('month')],
						 'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
					  },
					  startDate: KANBAN_START,
					  endDate: KANBAN_END
					},
					function(start, end) {
						$('#kanbanrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
						KANBAN_START = new Date(start);
						KANBAN_END=new Date(end);
						console.log("..in daterange function");
						drawAll();
					}
				);
				</script>
				<!-- date range -->
		</div>
		<div  class="row" style="margin-left:10px;margin-bottom:10px">

				<!--time machine -->
				<div id="timemachine"  class="pull-left" style="margin-left:10px;margin-bottom:10px">
					<span style="font-size:12px;font-weight:bold;margin-left:20px">TIME MACHINE</span><br/><i class="fa fa-calendar fa-lg"></i>
					<span style="font-size:10px"><script type="text/javascript"> document.write(TODAY.toString("MMMM d, yyyy"));</script></span> <b class="caret"></b>
				</div>
				 
				<script type="text/javascript">
				$('#timemachine').daterangepicker(
					{ startDate: moment(),
					  endDate: moment(),
					  singleDatePicker: true

					  },
					function(start, end) {
						if (start<KANBAN_END & start>KANBAN_START){
							timeMachine(start);
						}
						else {
							alert("TIMEMACHINE date should not be earlier than KANBAN_START and/or later than KANBAN_END date, sir !! ");
							start=TODAY.toString('yyyy-MM-dd');
						}
						$('#timemachine span').html(start.format('MMMM D, YYYY'));
					}
				);
				</script>
				<!-- time machine -->
		</div>

			<div class="btn-group-xs">
			  <button id="b70" type="button" class="btn btn-success">Holding</button>
			  <button id="b71" type="button" class="btn btn-success">B2C Gaming</button>
			  <button id="b72" type="button" class="btn btn-success">New Biz</button>
			  <button id="b73" type="button" class="btn btn-success">Bwin</button>
			  <button id="b77" type="button" class="btn btn-success">Techdebt</button>
			  <button id="b78" type="button" class="btn btn-success">Shared</button>
			  <button id="b74" type="button" class="btn btn-success">Bwin Drill-in</button>
			  <button id="b75" type="button" class="btn btn-success">EntIT Drill-in</button>
			  <button id="bwhiteboard" type="button" class="btn btn-success">Whiteboard</button>
			</div>


		<div class="btn-group-xs">
			<span class="glyphicon glyphicon-filter"></span> <span style="font-size:8px">metric filter:</span>	<select id="metricfilter" class="multiselect" multiple="multiple">
			  <option value="baseline">baseline</option>
			  <option value="forecast1">forecast-1</option>
			  <option value="forecast2" selected>forecast-2</option>
			  <option value="goal" selected>goal</option>
			  <option value="potentials" selected>potentials</option>
			</select>
		</div>	

		<div class="btn-group-xs">
			<span style="font-size:8px">metric view:</span>	<select id="metricview" class="multiselect" >
			  <option value="REVIEW_Q1_2014" selected>REVIEW_Q1_2014</option>
			  <option value="FORECAST_2015" >FORECAST_2015</option>
			</select>
		</div>	


		<div class="btn-group-xs">
			<span style="font-size:8px">(re)forecast date:</span><select id="basedate" class="multiselect">
			  <option value="2013-10-31">2013-10-31</option>
			  <option value="2014-03-11" selected>2014-03-11</option>
			</select>
		</div>	

		<!-- Initialize the multi-select plugin: -->
		<script type="text/javascript">
		  $(document).ready(function() {
			  $('#metricfilter').multiselect({
				buttonClass: 'btn-primary btn-sm',
				onChange: function(element,checked){
					
					var _val = $(element).val()
					if (checked)
						hideMetrics([{"name":_val,"hide":true}])
					else
						hideMetrics([{"name":_val,"hide":false}])
					
					drawAll();
					console.log("element: "+_val+" checked: "+checked);
				}
			});
		  });
		 
		 
		  $(document).ready(function() {
			  $('#metricview').multiselect({
				buttonClass: 'btn-primary btn-sm',
				onChange: function(element,checked){
					
					var _val = $(element).val()
					_setMetricContext(_val);
					drawAll();
		//			console.log("element: "+_val+" checked: "+checked);
				}
			});
		  });
		 
		 
		  
		  //change the configured forecast calculation basedate
		  $(document).ready(function() {
			  $('#basedate').multiselect({
				buttonClass: 'btn-primary btn-sm',
				onChange: function(element,checked){
					var _val = $(element).val()
					console.log("element: "+_val+" checked: "+checked);
					
					if (_val=="2013-10-31"){
						console.log("______val="+_val);
						if (_getMetricContextByColumn("right1")) _getMetricContextByColumn("right1").forecastDate=[_val];
						if (_getMetricContextByColumn("right2")) _getMetricContextByColumn("right2").forecastDate=[_val];
					}
					else if(_val=="2014-03-11"){
						if (_getMetricContextByColumn("right1")) _getMetricContextByColumn("right1").forecastDate=["2013-10-31",_val];
						if (_getMetricContextByColumn("right2")) _getMetricContextByColumn("right2").forecastDate=["2013-10-31",_val];

						//_getDataBy("dimension","forecast1",METRIC_CONTEXT).data.baseDate=["2013-10-31",_val];
						//_getDataBy("dimension","forecast2",METRIC_CONTEXT).data.baseDate=["2013-10-31",_val];
					}
					drawAll();
				}
			});
		  });
		</script>
			
			<div class="btn-group-xs">
			  <button id="b1" type="button" class="btn btn-default">Queues</button>
			  <button id="b2" type="button" class="btn btn-default">Items</button>
			  <button id="btargets" type="button" class="btn btn-default">Targets</button>
			  <button id="b3" type="button" class="btn btn-default">Lanes</button>
			  <button id="b4" type="button" class="btn btn-default">Grid</button>
			  <button id="bvision" type="button" class="btn btn-default">Vision</button>
			  <button id="bhidemetrics" type="button" class="btn btn-default">Metrics</button>
			  <button id="b5" type="button" class="btn btn-default">No NGR</button>
			  <button id="bcorporate" type="button" class="btn btn-default">Corporate</button>
			  <button id="b8" type="button" class="btn btn-default">Releases</button>
			  <button id="b0" type="button" class="btn btn-default">Dependencies</button>
			  <button id="btargetdeps" type="button" class="btn btn-default">Target2Item</button>
			  <button id="b9" type="button" class="btn btn-default">Swag</button>
			  <button id="bevents" type="button" class="btn btn-default">Events</button>
			  <button id="bmetaphors" type="button" class="btn btn-default">Metaphors</button>
			</div>
			<div class="btn-group-xs">
			  <button id="b15" type="button" class="btn btn-default">Linechart</button>
			  <button id="b6" type="button" class="btn btn-default">WIP=120</button>
			  <button id="b7" type="button" class="btn btn-default">WIP=90</button>
			  <button id="b10" type="button" class="btn btn-default">Blur Back</button>
			  <button id="bguides" type="button" class="btn btn-default">Guides</button>
			  <button id="b100" type="button" class="btn btn-default">Version1 items</button>
			  <button id="b101" type="button" class="btn btn-default">Other items</button>
			</div>

			<div style="width:250px" class="input-group input-group-sm">
			  <input id="input_width" type="text" class="form-control input-sm">
			  <span class="input-group-btn">
				<button id="b11" class="btn btn-default input-sm" type="button">WIDTH</button>
			  </span>
			  <input id="input_height" type="text" class="form-control input-sm">
			  <span class="input-group-btn">
				<button id="b12" class="btn btn-default input-sm" type="button">HEIGHT</button>
			  </span>
			</div><!-- /input-group -->

			<div style="width:250px" class="input-group input-group-sm">
			  <input id="input_postit" type="text" class="form-control input-sm">
			  <span class="input-group-btn">
				<button id="b30" class="btn btn-default input-sm" type="button">create postit</button>
			  </span>
		   </div><!-- /input-group -->

			<div class="btn-group-xs">
			  <button id="l1" type="button" class="btn btn-info">Backlog Treemap</button>
			  <button id="l2" type="button" class="btn btn-info">Backlog Tree</button>
			  <button id="l3" type="button" class="btn btn-info">Backlog ForceMap</button>
			  <button id="l4" type="button" class="btn btn-info">Orgchart Circle Contain</button>
			  <button id="l44" type="button" class="btn btn-info">Orgchart Linear Tree</button>
			</div>

			<div class="btn-group-xs">
			  <button id="l5" type="button" class="btn btn-danger"><span class="glyphicon glyphicon-wrench"></span> V1 sync admin</button>
			</div>

			<div class="btn-group-xs">
			  <button id="l6" type="button" class="btn btn-danger"><span class="glyphicon glyphicon-wrench"></span> item admin</button>
			  <button id="l7" type="button" class="btn btn-danger"><span class="glyphicon glyphicon-wrench"></span> target admin</button>
			  <button id="l8" type="button" class="btn btn-danger"><span class="glyphicon glyphicon-wrench"></span> metric admin</button>
			  <button id="l9" type="button" class="btn btn-danger"><span class="glyphicon glyphicon-wrench"></span> lanetext admin</button>
			  <button id="l10" type="button" class="btn btn-danger"><span class="glyphicon glyphicon-wrench"></span> scrumteams admin</button>
			
			</div>

			  <div class="control-zoom">
					  <a class="control-zoom-in" href="#" title="Zoom in"></a>
					  <a class="control-zoom-out" href="#" title="Zoom out"></a>
			  </div>


<?php } ?>


	<!-- ########### The Export Section ####### -->
	<div>
			<button class="btn btn-primary btn-xs" id="save_as_svg" value="">
				<span class="glyphicon glyphicon-export"></span> export SVG</button>
			<button class="btn btn-primary btn-xs" id="save_as_pdf" value="">
				<span class="glyphicon glyphicon-export"></span> export PDF</button>
			<button class="btn btn-primary btn-xs" id="save_as_png" value="">
				<span class="glyphicon glyphicon-export"></span> export PNG</button>

<?php if ($auth =="admin"){ ?>
			<div style="width:250px" class="input-group input-group-sm">
				  <input id="input_transcode_url" type="text" class="form-control input-sm">
				  <span class="input-group-btn">
					<button id="b99" class="btn btn-default input-sm" type="button">URL</button>
				  </span>
			</div><!-- /input-group -->
<?php } ?>
			
			
	</div>
	
	
<?php if ($auth =="admin"){ ?>

<div id="kanban_data_sources" style="font-size:8px">

</div>
<?php } ?>



</div>


<script>


var _html="<br><br>v1.data.link: <a href=\""+V1_DATA_URL+"\"target=\"_new\"> "+V1_DATA_URL+"</a>";
	_html+="<br>kanban.initiatives.link: <a href=\""+dataSourceFor("initiatives")+"\"target=\"_new\"> "+dataSourceFor("initiatives")+"</a>";
	_html+="<br>kanban.initiatives_diff_trail.link: <a href=\""+dataSourceFor("initiatives_diff_trail")+"\"target=\"_new\"> "+dataSourceFor("initiatives_diff_trail")+"</a>";
	_html+="<br>kanban.targets.link: <a href=\""+dataSourceFor("targets")+"\"target=\"_new\"> "+dataSourceFor("targets")+"</a>";
	_html+="<br>kanban.metrics.link: <a href=\""+dataSourceFor("metrics")+"\"target=\"_new\"> "+dataSourceFor("metrics")+"</a>";
	_html+="<br>kanban.lanetext.link: <a href=\""+dataSourceFor("lanetext")+"\"target=\"_new\"> "+dataSourceFor("lanetext")+"</a>";
	_html+="<br>kanban.releases.link: <a href=\""+dataSourceFor("releases")+"\"target=\"_new\"> "+dataSourceFor("releases")+"</a>";
	_html+="<br>kanban.postits.link: <a href=\""+dataSourceFor("postits")+"\"target=\"_new\"> "+dataSourceFor("postits")+"</a>";

if (document.getElementById("kanban_data_sources")) document.getElementById("kanban_data_sources").innerHTML+=_html;



	// Attached actions to the buttons
	
	$("#show_svg_code").click(function() { show_svg_code(); });
	$("#save_as_svg").click(function() { submit_download_form("svg"); });
	$("#save_as_pdf").click(function() { submit_download_form("pdf"); });
	$("#save_as_png").click(function() { submit_download_form("png"); });
	if (document.getElementById("input_transcode_url")) document.getElementById("input_transcode_url").value = TRANSCODE_URL;
	$("#b99").click(function() { TRANSCODE_URL = document.getElementById("input_transcode_url").value });
	
		
	initHandlers();
		

function hide(group){
	d3.select(group).style("visibility","hidden");
}

function show(group){
	d3.select(group).style("visibility","visible");
}

function isHidden(group){
	return (d3.select(group).style("visibility")=="hidden");
}

function isVisible(group){
	return (d3.select(group).style("visibility")=="visible");
}

		
function switchVisibility(button,ref){
	d3.select(button).on("click", function(){
		var dep = d3.select(ref);
		if (dep.style("visibility") =="visible") dep.style("visibility","hidden");
		else dep.style("visibility","visible");
	});
}


function redirect(button,url){
	d3.select(button).on("click", function(){
	window.location.href=url;
	});		
}

		
function initHandlers(){	
	
	d3.select("#b0").on("click", function(){
		var dep = d3.select("#dependencies").selectAll("g");
		if (dep.style("visibility") =="visible") dep.style("visibility","hidden");
		else dep.style("visibility","visible");
	});

	d3.select("#btargetdeps").on("click", function(){
		var dep = d3.select("#targetDependencies").selectAll("g");
		if (dep.style("visibility") =="visible") dep.style("visibility","hidden");
		else dep.style("visibility","visible");
	});

	switchVisibility("#b1","#queues");
	switchVisibility("#b2","#initiatives");
	switchVisibility("#btargets","#targets");
	switchVisibility("#b3","#lanes");
	switchVisibility("#bhidemetrics","#metrics");
	switchVisibility("#b4","#axes");
	switchVisibility("#bguides","#guides");
	switchVisibility("#bvision","#vision");
	//switchVisibility("#bmetaphors","#metaphors");
	switchVisibility("#bevents","#events");
	


	
	redirect ("#l1","treemap.html");
	redirect ("#l2","tree.html");
	redirect ("#l3","force.html");
	redirect ("#l4","org.html");
	redirect ("#l44","org_tree.php");
	redirect ("#l5","v1sync.php");
	
	redirect ("#l6","admin.php?type=initiatives");
	redirect ("#l7","admin.php?type=targets");
	redirect ("#l8","admin.php?type=metrics");
	redirect ("#l9","admin.php?type=lanetext");
	redirect ("#l10","admin.php?type=scrumteams");


	
	d3.select("#bmetaphors").on("click",function(){
		if (isHidden("#metaphors")){
			show("#metaphors");
			hide("#initiatives");
			hide("#metrics");
			hide("#queues");
			hide("#targets");
			hide("#events");
			if (!d3.selectAll("#metrics,#queues,#lanes,#vision,#axes").attr("filter")) d3.selectAll("#metrics,#queues,#lanes,#vision,#axes").attr("filter", "url(#blur)");
	
		}
		
		else {
			hide("#metaphors");
			show("#initiatives");
			show("#metrics");
			show("#queues");
			show("#targets");
			show("#events");
			d3.selectAll("#metrics,#queues,#lanes,#vision,#axes").attr("filter", "");
		}
	});
	


	d3.select("#b5").on("click", function(){
		if (SHOW_METRICS_NGR){
			 hideNGR();
			 
		 }
		else{
			 showNGR();

		 }
	});	

	d3.select("#bcorporate").on("click", function(){
		if (SHOW_METRICS_CORPORATE){
			hideCorpMetrics();
			hideGoalRisk();
			SHOW_METRICS_CORPORATE = false;
		}
		else{
			showCorpMetrics();
			if (SHOW_METRICS_GOAL) showGoalRisk();
			SHOW_METRICS_CORPORATE = true;
		}
	});	


	d3.select("#b15").on("click", function(){
		if (d3.select("#linechart").style("visibility") =="visible"){
			 d3.select("#linechart").style("visibility","hidden");
			 d3.select("#initiatives").selectAll("g").filter(function(d){return (d.lane=="bwin") && new Date(d.planDate)<=TODAY ;}).attr("filter", 0);

		}
		else{
			d3.select("#linechart").style("visibility","visible");
			d3.select("#initiatives").selectAll("g").filter(function(d){return (d.lane=="bwin") && new Date(d.planDate)<=TODAY ;}).attr("filter", "url(#blur)");

		}
	});	


	d3.select("#b100").on("click", function(){
		
		if (!SHOW_ONLY_VERSION1){
			 console.log("hide");
			 d3.select("#items").selectAll("g").filter(function(d){return d.ExtId==""}).style("visibility","hidden");
			 SHOW_ONLY_VERSION1 = true;
		 }
		else {
			d3.select("#items").selectAll("g").filter(function(d){return d.ExtId==""}).style("visibility","visible");
			SHOW_ONLY_VERSION1 = false;
		}
	});	

	d3.select("#b101").on("click", function(){
		
		if (!SHOW_ONLY_NONVERSION1){
			 console.log("hide");
			 d3.select("#items").selectAll("g").filter(function(d){return d.ExtId!=""}).style("visibility","hidden");
			 SHOW_ONLY_NONVERSION1 = true;
		 }
		else {
			d3.select("#items").selectAll("g").filter(function(d){return d.ExtId!=""}).style("visibility","visible");
			SHOW_ONLY_NONVERSION1 = false;
		}
	});	



	d3.select("#b8").on("click", function(){
		if (d3.select("#releases").style("visibility") =="visible"){
			 d3.select("#releases").style("visibility","hidden");
			 d3.select("#initiatives").style("opacity",1);
		 }
		 
		else{
			 d3.select("#releases").style("visibility","visible");
			 d3.select("#initiatives").style("opacity",0.5);
		 }
	});	

	d3.select("#b9").on("click", function(){
		if (d3.select("#sizings").style("opacity") >0){
		 
			 d3.selectAll("#initiatives,#queues,#metrics")
			 .style("visibility","visible");
			 
			 d3.selectAll("#sizings,#labels")
			 .transition()
			 .delay(0)
			 .duration(1000)
			 .style("opacity",0);

			 d3.selectAll("#initiatives,#queues,#lanes,#axes,#metrics")
			 .transition()
			 .delay(0)
			 .duration(1000)
			 .style("opacity",1);
		 }
		 
		else{
			 
			 d3.selectAll("#sizings,#labels")
			 .transition()
			 .delay(0)
			 .duration(1000)
			 .style("opacity",1);

			 d3.selectAll("#initiatives,#queues,#metrics")
			 .transition()
			 .delay(0)
			 .duration(1000)
			 .style("opacity",0);
			 
			 d3.selectAll("#initiatives,#queues,#metrics")
			 .transition()
			 .delay(1000)
			 .style("visibility","hidden");
			 
			 d3.selectAll("#lanes,#axes")
			 .transition()
			 .duration(1000)
			 .style("opacity",0.5);
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
	if (!d3.selectAll("#metrics,#queues,#lanes,#vision,#axes").attr("filter")) d3.selectAll("#metrics,#queues,#lanes,#vision,#axes").attr("filter", "url(#blur)");
	else d3.selectAll("#metrics,#queues,#lanes,#vision,#axes").attr("filter", "");

	});


	if (document.getElementById("input_width")) document.getElementById("input_width").value = WIDTH;
	d3.select("#b11").on("click", function(){
		WIDTH = document.getElementById("input_width").value;
		drawAll();
	});	

	if (document.getElementById("input_height")) document.getElementById("input_height").value = HEIGHT;
	d3.select("#b12").on("click", function(){
		HEIGHT = document.getElementById("input_height").value;
		drawAll();
	});	


	d3.select("#b30").on("click", function(){
		CUSTOM_POSTIT_SCALE = 1; 
		
		post = new Postit(null,document.getElementById("input_postit").value,x(KANBAN_START),-100,CUSTOM_POSTIT_SCALE,4,"blue","black");
		var gCustomPostits = d3.select("#kanban").append("g").attr("id","customPostits");
		
		post.draw(gCustomPostits);
		post.save();

	});	
	
	d3.select("#b70").on("click", function(){
		renderHolding();
	});	

	d3.select("#b71").on("click", function(){
		renderB2CGaming();
	});	

	d3.select("#b72").on("click", function(){
		renderNewBiz();
	});	

	d3.select("#b73").on("click", function(){
		renderBwin();
	});	

	d3.select("#b74").on("click", function(){
		renderBwinSecondLevel();
	});	

	d3.select("#b75").on("click", function(){
		renderEntIT();
	});	



	d3.select("#b77").on("click", function(){
		renderTechdebt();
	});	

	d3.select("#b78").on("click", function(){
		renderShared();
	});	


	d3.select("#bwhiteboard").on("click", function(){
		renderWhiteboard();
	});	


}


function check(){
	return "[OK]";
}


    </script>

<!--
<div style="position:relative">
  <div style="width:600px;">
    <div id="grid_items" style="width:100%;height:500px;"></div>
  </div>
 </div>
-->
 <?php

	}
}

?>	

</body>
</html>
