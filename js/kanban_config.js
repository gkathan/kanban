
var host = window.location.host;

var TRANSCODE_URL;
var MONGO_GATEWAY_URL;
var V1_DATA_URL = "http://knbnprxy.ea.bwinparty.corp/rest/epics";
//var V1_DATA_URL = "data/json/epics.json";

var DS ="MONGO";
//var DS ="MYSQL";



if (host=="portfolio.ea.bwinparty.corp") {
	MONGO_GATEWAY_URL = "http://portfolio.ea.bwinparty.corp/nodejs/";
	TRANSCODE_URL = "http://tomcat.ea.bwinparty.corp/transcode/";
}
else if (host=="localhost"){
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


