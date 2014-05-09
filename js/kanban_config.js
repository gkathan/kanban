/*
var JSON_CONFIG =
				[{type:"MONGO",collections:{lanetext:"http://localhost:9999/lanetext",initiatives:"http://localhost:9999/initiatives",metrics:"http://localhost:9999/metrics",targets:"http://localhost:9999/targets",releases:"http://localhost:9999/releases",postits:"http://localhost:9999/postits"}},
				  {type:"MYSQL",collections:{lanetext:"/data/data.php?type=lanetext",initiatives:"/data/data.php?type=initiatives",metrics:"/data/data.php?type=metrics",targets:"/data/data.php?type=targets",releases:"/data/data.php?type=releases",postits:"/data/data.php?type=postits"}},
				];
*/
var JSON_CONFIG =
				[
					{type:"MONGO",url:"http://localhost:9999/"},
					//{type:"MONGO",url:"http://localhost:9999/"},
					{type:"MYSQL",url:"/data/data.php?type="},
				];


var DS ="MONGO";
//var DS ="MYSQL";

function dataSourceFor(collection){
	for (var p in JSON_CONFIG){
		if (JSON_CONFIG[p].type==DS) return JSON_CONFIG[p].url+collection; 
	}
}

//var V1_DATA_URL = "/data/json/epics.json";
var V1_DATA_URL = "http://knbnprxy.ea.bwinparty.corp/rest/epics";

