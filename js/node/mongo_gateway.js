/**
 mongo windows service install

sc.exe create MongoDB binPath= "\"C:\mongodb\bin\mongod.exe\" --service --dbpath=\"C:\mongodb\db\" --config=\"C:
\mongodb\mongod.cfg\"" DisplayName= "MongoDB 2.6 Standard" start= "auto"

mongoimport items.json

mongoimport "c:\Users\gkathan\Dropbox\_work\d3\kanban\data\initiatives.json" --jsonArray --db kanban
mongoimport c:\Users\gkathan\Dropbox\_work\d3\kanban\data\metrics.json --jsonArray --db kanban


WOW :-)

node.js + mongodb
+ resitfy

https://www.openshift.com/blogs/day-27-restify-build-correct-rest-web-services-in-nodejs


=> built a REST server in 10 minutes


in work dir where source (mongo_gateway.js) sits
=> npm install restify
=> npm install mongojs

node mongo_gateway.js


http://localhost:9999/items


**/
var restify = require('restify');
var mongojs = require("mongojs");
var jsondiffpatch = require("jsondiffpatch");
// https://github.com/functionscope/Node-Excel-Export
var nodeExcel = require('excel-export');
 
var ip_addr = '127.0.0.1';
var port    =  '9999';
 
var server = restify.createServer({
    name : "kanban"
});
 
server.listen(port ,ip_addr, function(){
    console.log('%s listening at %s ', server.name , server.url);
});


server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());



var connection_string = '127.0.0.1:27017/kanban';
var db = mongojs(connection_string, ['kanban']);



var PATH_INITIATIVES = '/initiatives'
server.get({path : PATH_INITIATIVES , version : '0.0.1'} , findAllByName);
server.get({path : PATH_INITIATIVES +'/:id' , version : '0.0.1'} , findByName);
server.post({path : PATH_INITIATIVES, version : '0.0.1'} , save);
server.del({path : PATH_INITIATIVES, version : '0.0.1'} , remove);

var PATH_INITIATIVES_DIFF_TRAIL = '/initiatives_diff_trail'
//server.get({path : PATH_INITIATIVES_DIFF_TRAIL , version : '0.0.1'} , findAllByName);
server.get({path : PATH_INITIATIVES_DIFF_TRAIL +'/:initiativeId' , version : '0.0.1'} , findTrailByNameForId);


var PATH_METRICS = '/metrics';
server.get({path : PATH_METRICS , version : '0.0.1'} , findAllByName);
server.get({path : PATH_METRICS +'/:id' , version : '0.0.1'} , findByName);
server.post({path : PATH_METRICS, version : '0.0.1'} , save);
server.del({path : PATH_METRICS, version : '0.0.1'} , remove);

var PATH_TARGETS = '/targets';
server.get({path : PATH_TARGETS , version : '0.0.1'} , findAllByName);
server.get({path : PATH_TARGETS +'/:id' , version : '0.0.1'} , findByName);
server.post({path : PATH_TARGETS, version : '0.0.1'} , save);
server.del({path : PATH_TARGETS, version : '0.0.1'} , remove);

var PATH_LANETEXT = '/lanetext';
server.get({path : PATH_LANETEXT , version : '0.0.1'} , findAllByName);
server.get({path : PATH_LANETEXT +'/:id' , version : '0.0.1'} , findByName);
server.post({path : PATH_LANETEXT, version : '0.0.1'} , save);
server.del({path : PATH_LANETEXT, version : '0.0.1'} , remove);


var PATH_POSTITS = '/postits';
server.get({path : PATH_POSTITS , version : '0.0.1'} , findAllByName);
server.get({path : PATH_POSTITS +'/:id' , version : '0.0.1'} , findByName);


var PATH_RELEASES = '/releases';
server.get({path : PATH_RELEASES , version : '0.0.1'} , findAllByName);
server.get({path : PATH_RELEASES +'/:id' , version : '0.0.1'} , findByName);


var PATH_SUBLANES = '/sublanes';
server.get({path : PATH_SUBLANES , version : '0.0.1'} , findAllByName);
server.get({path : PATH_SUBLANES +'/:id' , version : '0.0.1'} , findByName);

var PATH_LANES = '/lanes';
server.get({path : PATH_LANES , version : '0.0.1'} , findAllByName);
server.get({path : PATH_LANES +'/:id' , version : '0.0.1'} , findByName);

var PATH_THEMES = '/themes';
server.get({path : PATH_THEMES , version : '0.0.1'} , findAllByName);
server.get({path : PATH_THEMES +'/:id' , version : '0.0.1'} , findByName);

var PATH_BM = '/bm';
server.get({path : PATH_BM , version : '0.0.1'} , findAllByName);
server.get({path : PATH_BM +'/:id' , version : '0.0.1'} , findByName);



// --------------------------- EXCEL EXPOR TARGETS --------------------------------------------


var PATH_TARGETS = '/excel/targets'
server.get({path : PATH_TARGETS , version : '0.0.1'} , excelTargets);

var PATH_METRICS = '/excel/metrics'
server.get({path : PATH_METRICS , version : '0.0.1'} , excelMetrics);

var PATH_INITIATIVES = '/excel/initiatives'
server.get({path : PATH_INITIATIVES , version : '0.0.1'} , excelInitiatives);

var PATH_LANETEXT = '/excel/lanetext'
server.get({path : PATH_LANETEXT , version : '0.0.1'} , excelLanetext);


// --------------------------- EXCEL EXPORT TARGETS --------------------------------------------


/**
 * autoinc stuff
 * http://docs.mongodb.org/manual/tutorial/create-an-auto-incrementing-field/
 */
function getNextSequence(name,callback) {
   console.log("[DEBUG] > getNextSequence called for: "+name);
   db.collection(name+"_counter").findAndModify(
          {
            query: { _id: name+"Id" },
            update: { $inc: { seq: 1 } },
            new: true
          }
   ,function (error,success){
	  console.log("[DEBUG] > seq= "+success.seq);
	  
	  callback(success.seq);   
   });
   
   //return ret.seq;
}


function findAllByName(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    var _name = req.path().split("/")[1];
    db.collection(_name).find().sort({id : 1} , function(err , success){
        //console.log("[DEBUG] findAllByName() for: "+_name+", Response success: "+JSON.stringify(success));
        //console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }else{
            return next(err);
        }
 
    });
 
}
 
function findByName(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    db.collection(req.path().split("/")[1]).findOne({id:req.params.id} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }
        return next(err);
    })
}

/**
 * gets all change trail documents
 * slected by refID which is the id of the changed entity
 */
function findTrailByNameForId(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    console.log("*** find Trail for :"+req.params.initiativeId);
    db.collection(req.path().split("/")[1]).find({refId:mongojs.ObjectId(req.params.initiativeId)} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }
        return next(err);
    })
}



/**
 * async pattern to handle a list of items to be processed
 * inspired by http://book.mixu.net/node/ch7.html (chapter 7.2.1)
 */
function save(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    var items = JSON.parse(req.params.itemJson);
    var _collection = req.path().split("/")[1];
    var results = [];
    var _timestamp = new Date();

	// Async task 
	function async(item, callback) {
	    console.log("----------------------------------- async(item:"+item.name+" called");

	    console.log("[DEBUG] save POST: collection= "+_collection+" itemJson: "+JSON.stringify(item));
		if (!(item.createDate)){
			item.createDate=_timestamp;
			//TODO refactor to ASYNC handling !!!!
			//item.id = getNextSequence("initiativeId");
			console.log("--->>>>>>>>>>no create date found: "+item.createDate);
			//console.log("--->>>>>>>>>>autoinc id: "+item.id);
		}
		else console.log("[DEBUG] createDate: "+item.createDate);
		
		item.changeDate=_timestamp;

		console.log("************_item: "+item.ExtId);
		
		// get old before update
		var _old;
		var _diff;

		db.collection(_collection).findOne({_id:mongojs.ObjectId(item._id)}, function(err , success){
			//console.log('FindOne() Response success '+success);
			//console.log('FindOne() Response error '+err);
			_old=success;
			console.log("************_old: "+JSON.stringify(_old));
			_diff = jsondiffpatch.diff(_old,item);
			console.log("************diff: "+JSON.stringify(_diff));
			
			if (!_old){ 
				console.log("[DEBUG] > no _old found -> concluding this will be an INSERT, need to get a seq.....");
				getNextSequence(_collection,restOfTheFunction);
				return;
			}
			else console.log("[DEBUG] ok - old item found ...");
		
		restOfTheFunction();	
			
		function restOfTheFunction(seq){	
			console.log("++++++++++++++++++++++ restOfTheFunction() called +++++++++++++++++++++++++++");
			if (seq){
				console.log("[DEBUG] > restOfTheFunction() called with seq ="+seq);
				item.id=seq;
			}
			
			// http://stackoverflow.com/questions/13031541/mongoerror-cannot-change-id-of-a-document
			if ( item._id && ( typeof(item._id) === 'string' ) ) {
				console.log("[DEBUG] fixing mongDB _id issue....");
			    item._id = mongojs.ObjectId.createFromHexString(item._id)
			}

			
			console.log("[DEBUG] going to update collection ...");

			db.collection(_collection).update({_id:mongojs.ObjectId(item._id)},item,{upsert:true} , function(err , success){
				//console.log('Response success '+success);
				//console.log('Response error '+err);
				console.log("[DEBUG] updated collection ...");
				if(success){
					console.log("[DEBUG] SUCCESS updatedExisting: "+success.updatedExisting);
					
					//insert trail (in case of update)
					if (success.updatedExisting){
						console.log("[DEBUG] going to insert trail ...");
						db.collection(_collection+"_diff_trail").insert({timestamp:_timestamp,refId:_old._id,diff:_diff,old:_old}	 , function(err , success){
							//console.log('Response success '+success);
							console.log('Response error '+err);
							if(success){
								callback(success);
							}
							//return next(err);
							
						})
					}
					callback(success);
				}
				else {
					console.log("[DEBUG] ERROR no success returned.. what to do now ????"+JSON.stringify(err));
					callback(err);
				}
				
				//return next(err);
			})
		}
		
		});
		
	  
	}

    // Final task 
	function final() { 
		console.log('Done', results);
		res.send(200 , results);
		return next();
	}
    
	
	function series(item) {
	  if(item) {
		async( item, function(result) {
		  results.push(result);
		  return series(items.shift());
		});
	  } else {
		return final();
	  }
	}
	
	series(items.shift());
    
}


function remove(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','OPTIONS,DELETE');
    console.log("remove DELETE: action= "+req.params.action+" itemJson: "+JSON.parse(req.params.itemJson)[0].kanbanMongoId);
    
    // ??????????????????????????
    db.collection(req.path().split("/")[1]).remove({_id:mongojs.ObjectId(JSON.parse(req.params.itemJson)[0].kanbanMongoId)} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }
        return next(err);
    })
    
}



// --------------------------------------- EXCEL EXPORT --------------------------------------------


function _stripCrap(object){
	if (typeof object =="string"){ 
		//strip out all HTML tags - http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
		object = object.replace(/(<([^>]+)>)/ig,"");
		object = object.replace(/[^ -~]/g, "");

		//object = object.replace(/(\r\n|\n|\r)/gm,"");
		/*object = object.replace(/(\u001c)/g, "");
		object = object.replace(/(\u001a)/g, "");
		object = object.replace(/(\u001b)/g, "");
		object = object.replace(/(\u001e)/g, "");
		object = object.replace(/(\u001f)/g, "");
		object = object.replace(/(\u0013)/g, "");
		*/
	}
	return object;
}

/** row formatting 
 * 
 */
function _formatCell(row, cellData,eOpt){
             if (eOpt.rowNum%2 ==0)
				eOpt.styleIndex=1;
			 else 
				eOpt.styleIndex=3;
			 
             //console.log(JSON.stringify(row));
             return _stripCrap(cellData);
        }

/**
 * extracts the captions from a conf arrax
 * needed for deterministically create the data for CSV export
 */
function _getCaptionArray(conf){
   var _fields = new Array();
   
   for (c in conf.cols){
	   _fields.push(conf.cols[c].caption);
   }
   
   return _fields;
}

/** 
 * builds array of values for excel export
 */
function _createDataRows(conf,data){
	var _fields = _getCaptionArray(conf);
	var _list = new Array();
	
	for (var d in data){
		var _row = new Array();
		//console.log("JSON: "+JSON.stringify(success[m]));
		for (var f in _fields){
			var _column = _fields[f];
			//console.log("+ column: "+_column);
			if (! data[d][_column]) _row.push("");
			else _row.push(data[d][_column]);
		}
		_list.push(_row);
		console.log("** row: "+_row);
	}	
	return _list;
}


/**
 * generate targets excel
 */
function excelLanetext(req, res , next){
	 var conf ={};
  
    
  
    conf.stylesXmlFile = "styles.xml";
    conf.cols = [
		{caption:'_id',type:'string',width:20,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'id',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'lane',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'text',type:'string',width:40,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'side',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'format',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'size',type:'number',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell}
		
	];
    // here we import tha data :-)
    db.collection("lanetext").find().sort({postedOn : -1} , function(err , success){
		//console.log('Response success '+success);
		//console.log('Response error '+err);
		if(success){
		  conf.rows = _createDataRows(conf,success);
				
		  var result = nodeExcel.execute(conf);
		  res.setHeader('Content-Type', 'application/vnd.openxmlformats');
		  res.setHeader("Content-Disposition", "attachment; filename=" + "lanetext.xlsx");
		  res.end(result, 'binary');
		}
    });
}



/**
 * generate targets excel
 */
function excelTargets(req, res , next){
	 var conf ={};
  
    conf.stylesXmlFile = "styles.xml";
    conf.cols = [
		{caption:'_id',type:'string',width:20,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'id',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'ranking',type:'string',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'name',type:'string',width:40,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'description',type:'string',width:30,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'scope',type:'string',width:30,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'nonscope',type:'string',width:30,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'metrics',type:'string',width:30,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'risk',type:'string',width:30,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'targetOwner',type:'string',width:15,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'syndicate',type:'string',width:30,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'initiatives',type:'string',width:15,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'ExtId',type:'string',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'status',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'size',type:'number',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'Type',type:'string',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'accuracy',type:'number',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'bm',type:'string',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'theme',type:'string',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'lane',type:'string',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'sublane',type:'string',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'sublaneOffset',type:'number',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		
	];
    // here we import tha data :-)
    db.collection("targets").find().sort({postedOn : -1} , function(err , success){
		//console.log('Response success '+success);
		//console.log('Response error '+err);
		if(success){
		  conf.rows = _createDataRows(conf,success);
				
		  var result = nodeExcel.execute(conf);
		  res.setHeader('Content-Type', 'application/vnd.openxmlformats');
		  res.setHeader("Content-Disposition", "attachment; filename=" + "targets.xlsx");
		  res.end(result, 'binary');
		}
    });
}



/**
 * generate metrics excel
 */
function excelMetrics(req, res , next){
	 var conf ={};
  
    conf.stylesXmlFile = "styles.xml";
    conf.cols = [
		{caption:'_id',type:'string',width:20,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'id',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'dimension',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'class',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'lane',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'intervalStart',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'intervalEnd',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'forecastDate',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'number',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'scale',type:'string',width:15,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'type',type:'string',width:15,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'sustainable',type:'number',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'reforecast',type:'number',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'targets',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'direction',type:'number',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell}
	];
    // here we import tha data :-)
    db.collection("metrics").find().sort({postedOn : -1} , function(err , success){
		//console.log('Response success '+success);
		//console.log('Response error '+err);
		if(success){
		  conf.rows = _createDataRows(conf,success);
				
		  var result = nodeExcel.execute(conf);
		  res.setHeader('Content-Type', 'application/vnd.openxmlformats');
		  res.setHeader("Content-Disposition", "attachment; filename=" + "metrics.xlsx");
		  res.end(result, 'binary');
		}
    });
}

/**
 * generates initiatives excel
 */
function excelInitiatives(req, res , next){
	var conf ={};
    conf.stylesXmlFile = "styles.xml";
    conf.cols = [
 		{caption:'_id',type:'string',width:20,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'id',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'ExtId',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'name',type:'string',width:40,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'name2',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'isCorporate',type:'string',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'onKanban',type:'string',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'backlog',type:'string',width:15,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'bm',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'theme',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'lane',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'themesl',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'sublane',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'sublaneOffset',type:'number',width:7,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'startDate',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'planDate',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'actualDate',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'v1plannedStart',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'v1plannedEnd',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'v1launchDate',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'state',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'health',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'healthComment',type:'string',width:15,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'progress',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'status',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'size',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'Type',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'cost',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'Swag',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'benefit',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'dependsOn',type:'string',width:8,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'accuracy',type:'number',width:5,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'productOwner',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'businessOwner',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'programLead',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'DoD',type:'string',width:15,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'DoR',type:'string',width:15,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'createDate',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell},
		{caption:'changeDate',type:'string',width:10,captionStyleIndex:2,beforeCellWrite:_formatCell}
		
   ];
    // load tha data :-)
    db.collection("initiatives").find().sort({id:1}, function(err , success) {
        //console.log('Response success '+success);
        //console.log('Response error '+err);
        if(success){
		  conf.rows = _createDataRows(conf,success);
				
		  var result = nodeExcel.execute(conf);
		  res.setHeader('Content-Type', 'application/vnd.openxmlformats');
		  res.setHeader("Content-Disposition", "attachment; filename=" + "initiatives.xlsx");
		  res.end(result, 'binary');
        }
    });
}




