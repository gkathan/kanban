<?php

session_start();



if( !isset($_SESSION['auth']) ) {
     header("Location: login.html?page=org_tree.php");
}
else {
	
	$auth=$_SESSION['auth'];
	if ($auth!="exec" && $auth!="admin")
	{
	   header("Location: login.html?page=org_tree.php");
}
else{
	

?>

<!DOCTYPE html>
<meta charset="utf-8">

<link rel="stylesheet" type="text/css" href="css/org.css">

<body>
<script src="js/d3.v3.min.js"></script>
<script src="js/jquery-2.1.0.min.js"></script>


<script src="js/underscore-min.js"></script>
<script src="js/underscore.nest.min.js"></script>

<script src="bootstrap/dist/js/bootstrap.min.js"></script>
<script src="js/bootstrap-multiselect.js"></script>

<script src="js/underscore-min.js"></script>
<script src="js/underscore.nest.min.js"></script>
<script src="js/flippant.min.js"></script>
<script src="js/moment.min.js"></script>
<script src="js/daterangepicker.js"></script>
<script src="js/jquery.sidr.min.js"></script>


<script src="js/d3_util.js"></script>

<script src="js/kanban_config.js"></script>
<script src="js/kanban_util.js"></script>
<script src="js/org_util.js"></script>
<script src="js/org_tree.js"></script>


<link rel="stylesheet" type="text/css" href="bootstrap/dist/css/bootstrap.min.css">
<link rel="stylesheet" type="text/css" href="css/bootstrap-multiselect.css">
<link href="css/font-awesome-4.0.3/css/font-awesome.min.css" rel="stylesheet">
<link rel="stylesheet" type="text/css" href="css/jquery.sidr.light.css">




<div class="btn-group-xs">
  <button id="kanban_menu" type="button" class="btn btn-primary btn-xs">org menu</button>
</div>

<script>
$(document).ready(function() {
  $('#kanban_menu').sidr({speed:300,displace:true});

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

checkServices();
render();


/*
   Utility function: populates the <FORM> with the SVG data
   and the requested output format, and submits the form.
*/
function submit_download_form(output_format)
{
	//dirty hack for the CSS declaration
	// last css is for bootstrap => exclude !
	
	var declaration ="";

	for (var i=0;i<1;i++){
		console.log("***"+i);
		declaration = declaration+"<?xml-stylesheet href=\""+document.styleSheets[i].href+"\" type=\"text/css\"?>";
	}
	//declaration = declaration+"<?xml-stylesheet href=\""+document.styleSheets[i].href+"\" type=\"text/css\"?>";
	console.log("***declaration"+declaration);

	// Get the d3js SVG element
	var svg = document.getElementsByTagName("svg")[0];
	// Extract the data as SVG text string
	var svg_xml = (new XMLSerializer).serializeToString(svg);
	
	var clean = svg_xml;//.replace("&nbsp;", "");
	var form = document.getElementById("svgform");
	
	//console.log(declaration+svg_xml);
	form.action=TRANSCODE_URL;
	form["format"].value = output_format;
	form["data"].value = declaration+clean ;
	form["context"].value = CONTEXT ;
	form["svg_width"].value = WIDTH ;
	form["svg_height"].value = HEIGHT ;
	//high res scale
	form["png_scale"].value = 3 ;
	console.log("*going to submit");
	
	form.submit();
}
</script>



<div id="sidr" style="margin-left:10px;margin-top:10px">
<?php 
	echo "<div style=\"font-size:6px\">logged in as <b> $auth</b> <a href=\"login.php?action=logout&page=org_tree.php\">logout</a></div>";

?>

  
  



	<!-- ########### The Export Section ####### -->
	<div>
			<button class="btn btn-primary btn-xs" id="save_as_svg" value="">
				Save as SVG</button>
			<button class="btn btn-primary btn-xs" id="save_as_pdf" value="">
				Save as PDF</button>
			<button class="btn btn-primary btn-xs" id="save_as_png" value="">
				Save as PNG</button>

			<div style="width:250px" class="input-group input-group-sm">
				  <input id="input_transcode_url" type="text" class="form-control input-sm">
				  <span class="input-group-btn">
					<button id="b99" class="btn btn-default input-sm" type="button">URL</button>
				  </span>
			</div><!-- /input-group -->
	</div>
	
	  <div class="control-zoom">
			  <a class="control-zoom-in" href="#" title="Zoom in"></a>
			  <a class="control-zoom-out" href="#" title="Zoom out"></a>
	  </div>

	<div style="width:300px" class="input-group input-group-sm">
			  <input id="input_root" type="text" class="form-control input-sm">
			  <span class="input-group-btn">
				<button id="b0" class="btn btn-default input-sm" type="button">root node (Full Name)</button>
			  </span>
	 </div><!-- /input-group -->

	<div style="width:120px" class="input-group input-group-sm">
			  <input id="input_depth" type="text" class="form-control input-sm">
			  <span class="input-group-btn">
				<button id="b1" class="btn btn-default input-sm" type="button">depth level</button>
			  </span>
	 </div><!-- /input-group -->
	
	<div style="width:120px" class="input-group input-group-sm">
			  <input id="input_depthwidth" type="text" class="form-control input-sm">
			  <span class="input-group-btn">
				<button id="b2" class="btn btn-default input-sm" type="button">depth width</button>
			  </span>
	 </div><!-- /input-group -->

	<div style="width:120px" class="input-group input-group-sm">
			  <input id="b3" type="checkbox" class="form-control input-sm"> <span style="font-size:8px">show leaf nodes</span>
	  </div><!-- /input-group -->

	<div class="btn-group-xs">
			<span style="font-size:8px">PI data snapshot</span>	<select id="pi_date" class="multiselect" >
			  <option value="org" selected>2014 JUNE</option>
			   <option value="org2014april">2014 APRIL</option>
			  <option value="org2013april">2013 APRIL</option>
			  <option value="org2012april">2012 APRIL</option>
			  <option value="org2011april">2011 APRIL</option>
			</select>
	</div>	

	<br/>

	<div class="btn-group-xs">
			<span style="font-size:8px">hierarchy tape</span>	<select id="hierarchy" class="multiselect" >
			  <option value="bp" selected>business process supervisor</option>
			   <option value="hr">HR line supervisor</option>
			</select>
	</div>	


	<br/>

	<div class="btn-group-xs">
			<span style="font-size:8px">role type</span>	<select id="roletype" class="multiselect" >
			  <option value="position" selected>position</option>
			  <option value="jobTitle">corporate job title</option>
			  <option value="job">job title</option>
			  <option value="function">function</option>
			</select>
	</div>	





</div>
<script>
	// Attached actions to the buttons

  
		  $(document).ready(function() {
			  $('#pi_date').multiselect({
				buttonClass: 'btn-primary btn-sm',
				onChange: function(element,checked){
					console.log("element: "+_val+" checked: "+checked);
					
					var _val = $(element).val()
					ORG_DATA = _val;
					d3.select("svg").remove();
					render();

				}
			});
		  });
		  
		   $(document).ready(function() {
			  $('#hierarchy').multiselect({
				buttonClass: 'btn-primary btn-sm',
				onChange: function(element,checked){
					console.log("element: "+_val+" checked: "+checked);
					
					var _val = $(element).val()
					HIERARCHY_TYPE = _val;
					d3.select("svg").remove();
					render();

				}
			});
		  });
	
	
		$(document).ready(function() {
			  $('#roletype').multiselect({
				buttonClass: 'btn-primary btn-sm',
				onChange: function(element,checked){
					console.log("element: "+_val+" checked: "+checked);
					
					var _val = $(element).val()
					ROLE_TYPE = _val;
					d3.select("svg").remove();
					render();

				}
			});
		  });
	
	
	initHandlers();	
		

		
		
function switchVisibility(button,ref){
	d3.select(button).on("click", function(){
		var dep = d3.select(ref);
		if (dep.style("visibility") =="visible") dep.style("visibility","hidden");
		else dep.style("visibility","visible");
	});
	
}		
function initHandlers(){	
	console.log("button handling..");
	
	$("#show_svg_code").click(function() { show_svg_code(); });
	$("#save_as_svg").click(function() { submit_download_form("svg"); });
	$("#save_as_pdf").click(function() { submit_download_form("pdf"); });
	$("#save_as_png").click(function() { submit_download_form("png"); });
	document.getElementById("input_transcode_url").value = TRANSCODE_URL;
	$("#b99").click(function() { TRANSCODE_URL = document.getElementById("input_transcode_url").value });

	document.getElementById("input_root").value=ROOT_NAME;
	$("#b0").click(function() { ROOT_NAME = document.getElementById("input_root").value; d3.select("svg").remove();render();});
	document.getElementById("input_depthwidth").value=DEPTH_WIDTH;
	$("#b2").click(function() { DEPTH_WIDTH = document.getElementById("input_depthwidth").value; d3.select("svg").remove();render();});
	document.getElementById("input_depth").value=MAX_DEPTH;
	$("#b1").click(function() { MAX_DEPTH = document.getElementById("input_depth").value; d3.select("svg").remove();render();});
	$("#b3").click(function() { console.log("* checkbox !");LEAF_NODES = document.getElementById("b3").checked; d3.select("svg").remove();render();});
		
}
</script>

<?php

	}
}

?>	
</body>
</html>



