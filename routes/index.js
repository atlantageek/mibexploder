var express = require('express');
var sqlite  = require('sqlite3').verbose();
var util    = require('util')
var db      = new sqlite.Database('snmp.db');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/details', function(req, res, next) {
  db.serialize(function() {
    db.all("select * from snmpdata where id=" + req.query.node_id, function(err,rows) {
      res.json(rows[0]);

    });
  });
});

router.get('/query', function(req, res, next) {
    if (!req.query.node ) {
          build_list(res, null);
    }
    else {
	build_list(res, req.query.node)
      }
});
router.get('/uptree', function(req, res, next) {
    var oid = req.query.oid 
     query_get_id = "select a.id as id , a.oid_name || \" [\" || a.oid || \"]\" as label, a.oid as oid, count(b.oid_name) > 0  as load_on_demand from snmpdata a left join snmpdata b on a.id = b.parent_id where a.parent_id = " + target_id +" group by a.id,label, a.oid"
    db.all(query_get_id, function(err,rows) {
	  backout(res, rows[0]['id']);
    });
});

function build_list(res, target_id) {
    node_list = {};
    node_heirarchy = {};
    if (target_id == null) {
      query = "select a.id as id , a.oid_name || \" [\" || a.oid || \"]\" as label, a.oid as oid, count(*) > 0  as load_on_demand from snmpdata a left join snmpdata b on a.id = b.parent_id where a.parent_id is null group by a.id, label, a.oid"
    }
    else {
      query = "select a.id as id , a.oid_name || \" [\" || a.oid || \"]\" as label, a.oid as oid, count(b.oid_name) > 0  as load_on_demand from snmpdata a left join snmpdata b on a.id = b.parent_id where a.parent_id = " + target_id +" group by a.id,label, a.oid"
    }
    db.serialize(function() { 

      db.all(query, function(err,rows) {
        var result = [];
	for(i=0;i<rows.length;i++) {
          var new_row = {};
	  new_row["load_on_demand"] = (rows[i]["load_on_demand"] == 1);
	  new_row["id"] = rows[i]["id"];
	  new_row["label"] = rows[i]["label"];
	  new_row["oid"] = rows[i]["oid"];
          result.push(new_row);
	}
       console.log(util.inspect(result));
       console.log(util.inspect(err));
        res.json(result);
      }); 
    }); 
}
function backout(res, target_id) {
    node_list = {};
    node_heirarchy = {};

    query = "WITH RECURSIVE above_here(x) as (select parent_id from snmpdata where id = \"" + target_id  + "\" union all select parent_id from snmpdata, above_here where snmpdata.id = above_here.x) select id, parent_id, oid, oid_name from snmpdata where id in above_here; "
    db.serialize(function() { 

      console.log(query)
      db.all(query, function(err,rows) {
        var result = {};
	var curr_row=result;
	for(i=0;i<rows.length;i++) {
          var new_row={};
	  curr_row["load_on_demand"] = (rows[i]["load_on_demand"] == 1);
	  curr_row["id"] = rows[i]["id"];
	  curr_row["label"] = rows[i]["label"];
	  curr_row["oid"] = rows[i]["oid"];
	  curr_row["children"] = [new_row];
	  curr_row=new_row;

	}
       console.log(util.inspect(result));
       console.log(util.inspect(err));
        res.json(result);
      }); 
    }); 
}

module.exports = router;
