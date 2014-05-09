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

/*
var items = db.collection("initiatives");
var metrics = db.collection("metrics");
var lanes = db.collection("lanes");
var sublanes = db.collection("sublanes");
*/




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

var PATH_TARGETS = '/targets';
server.get({path : PATH_TARGETS , version : '0.0.1'} , findAllByName);
server.get({path : PATH_TARGETS +'/:id' , version : '0.0.1'} , findByName);

var PATH_LANETEXT = '/lanetext';
server.get({path : PATH_LANETEXT , version : '0.0.1'} , findAllByName);
server.get({path : PATH_LANETEXT +'/:id' , version : '0.0.1'} , findByName);

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


/**
 * autoinc stuff
 * http://docs.mongodb.org/manual/tutorial/create-an-auto-incrementing-field/
 */
function getNextSequence(name,callback) {
   console.log("[DEBUG] > getNextSequence called for: "+name);
   db.collection("initiatives_counter").findAndModify(
          {
            query: { _id: name },
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
    db.collection(req.path().split("/")[1]).find().sort({postedOn : -1} , function(err , success){
        //console.log('Response success '+success);
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

	    console.log("save POST: collection= "+_collection+" itemJson: "+item.name);
		if (!(item.createDate)){
			item.createDate=_timestamp;
			//TODO refactor to ASYNC handling !!!!
			//item.id = getNextSequence("initiativeId");
			console.log("--->>>>>>>>>>no create date found: "+item.createDate);
			//console.log("--->>>>>>>>>>autoinc id: "+item.id);
		
		}
		item.changeDate=_timestamp;

		console.log("************_item: "+item.ExtId);
		
		// get old before update
		var _old;
		var _diff;

		db.collection(_collection).findOne({ExtId:item.ExtId}, function(err , success){
			//console.log('FindOne() Response success '+success);
			//console.log('FindOne() Response error '+err);
			_old=success;
			console.log("************_old: "+JSON.stringify(_old));
			_diff = jsondiffpatch.diff(_old,item);
			console.log("************diff: "+JSON.stringify(_diff));
			
			if (!_old){ 
				console.log("[DEBUG] > no _old found -> concluding this will be an INSERT, need to get a seq.....");
				getNextSequence("initiativeId",restOfTheFunction);
				return;
			}
		
		restOfTheFunction();	
			
		function restOfTheFunction(seq){	
			console.log("++++++++++++++++++++++ restOfTheFunction() called +++++++++++++++++++++++++++");
			if (seq){
				console.log("[DEBUG] > restOfTheFunction() called with seq ="+seq);
				item.id=seq;
			}
			db.collection(_collection).update({ExtId:item.ExtId},item,{upsert:true} , function(err , success){
				//console.log('Response success '+success);
				//console.log('Response error '+err);
				if(success){
					console.log("updatedExisting: "+success.updatedExisting);
					
					//insert trail
					//
					db.collection(_collection+"_diff_trail").insert({timestamp:_timestamp,refId:_old._id,diff:_diff,old:_old}	 , function(err , success){
						//console.log('Response success '+success);
						console.log('Response error '+err);
						if(success){
							callback(success);
						}
						//return next(err);
					})
					callback(success);
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

