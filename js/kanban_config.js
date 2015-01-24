
var host = window.location.host;

var TRANSCODE_URL;
var MONGO_GATEWAY_URL;

var V1_PROD_URL = "http://v1.bwinparty.corp/V1-Production/";

var V1_DATA_URL = "http://knbnprxy.ea.bwinparty.corp/rest/epics";
//var V1_DATA_URL = "data/json/epics.json";

var DS ="MONGO";
//var DS ="MYSQL";

var COLOR_BPTY="#174D75";


// LEGACY OR NG
	var RUNMODE ="NG";
//	var RUNMODE ="LEGACY";

var FQ_DELIMITER=".";
	if (RUNMODE=="NG") FQ_DELIMITER="/"; 
	


if (host=="portfolio.ea.bwinparty.corp") {
	MONGO_GATEWAY_URL = "http://portfolio.ea.bwinparty.corp/nodejs/";
	TRANSCODE_URL = "http://tomcat.ea.bwinparty.corp/transcode/";
}
else if (host.split(":")[0]=="localhost"){
	MONGO_GATEWAY_URL = "http://localhost:9999/";
	TRANSCODE_URL = "http://localhost:8080/transcode/";
}


var JSON_CONFIG =
				[
					{type:"MONGO",url:MONGO_GATEWAY_URL},
					{type:"MYSQL",url:"/data/data.php?type="},
				];



function dataSourceFor(collection){
	for (var p in JSON_CONFIG){
		if (JSON_CONFIG[p].type==DS) return JSON_CONFIG[p].url+collection; 
	}
}


/** tests all needed connections
 */
function checkServices(){
		var check = $.get( MONGO_GATEWAY_URL+"targets", function() {
	  console.log("[DEBUG] checkServices()....");
	})
	  .done(function() {
		console.log( " success" );
	  })
	  .fail(function() {
		 $('.top-left').notify({
				message: { html: "<span class=\"glyphicon glyphicon-fire\"></span><span style=\"font-size:10px;font-weight:bold\"> kanban.checkServices() says:</span> <br/><div style=\"font-size:10px;font-weight:normal;margin-left:20px\">* nodeJS datagateway ("+MONGO_GATEWAY_URL+") offline...<br>* please contact <a href=\"mailto:gerold.kathan@bwinparty.com?Subject=[kanban issue]#nodeJS datagateway offline\" target=\"_top\">[your corpkanban support team]</a> for assistance</div>" },
				fadeOut: {enabled:false},
				type: "danger"
			  }).show(); // for the ones that aren't closable and don't fade out there is a .hide() function.
				  });
}

function initShortcuts(){
	Mousetrap.bind(['v'], function(e) {
		console.log("redirect to v1sync");
		window.location.href="v1sync.php";
		return false;
	});

	Mousetrap.bind(['a i'], function(e) {
		console.log("redirect to admin initiatives");
		window.location.href="admin.php?type=initiatives";
		return false;
	});

	Mousetrap.bind(['a t'], function(e) {
		console.log("redirect to admin targets");
		window.location.href="admin.php?type=targets";
		return false;
	});

	Mousetrap.bind(['a m'], function(e) {
		console.log("redirect to admin metrics");
		window.location.href="admin.php?type=metrics";
		return false;
	});
	
		Mousetrap.bind(['a l'], function(e) {
		console.log("redirect to admin lanetext");
		window.location.href="admin.php?type=lanetext";
		return false;
	});



	Mousetrap.bind(['k'], function(e) {
		console.log("redirect to kanban");
		window.location.href="kanban.php";
		return false;
	});
	

	Mousetrap.bind(['m'], function(e) {
		console.log("open menus");
		$('#kanban_menu').trigger('click');
		return false;
	});
	
	Mousetrap.bind(['e p'], function(e) {
		console.log("export pdf");
		$('#save_as_pdf').trigger('click');
		return false;
	});
	
	Mousetrap.bind(['e g'], function(e) {
		console.log("export png");
		$('#save_as_png').trigger('click');
		return false;
	});

}

