var express = require('express');
var sqlite  = require('sqlite3').verbose();
var util    = require('util')
var db      = new sqlite.Database('snmp.db');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/query', function(req, res, next) {
    if (req.params.node ) {
       db.all('select id from snmpdata where parent_id is null', function(err, rows) {
          console.log(util.inspect(rows[0]));
          build_list(res, rows[0].id);
       });
    }
    else {
	build_list(res, req.params.node)
      }
});

function build_list(res, target_id) {
    node_list = {};
    node_heirarchy = {};

    db.serialize(function() {
      var query = "WITH RECURSIVE below_here(id,depth) as (" +
	"     values(" + target_id + ",0)" +
	"      union all" +
	"       select snmpdata.id, below_here.depth + 1 from snmpdata join below_here" +
	"        on snmpdata.parent_id = below_here.id where below_here.depth < 2)" +
	"	 select id, parent_id, oid, oid_name from snmpdata where id in" +
	"     (select id from below_here);" 

      //var query = "WITH RECURSIVE below_here(x) as (" +
	//    "select id from snmpdata where id = "  + target_id + 
	//    " UNION ALL " + 
	//    " select id from snmpdata, below_here " +
	//    " where snmpdata.parent_id = below_here.x)" +
        //    " select id, parent_id, oid, oid_name, 1 as child_flag from snmpdata where id in below_here;"
      //var query = "select id, parent_id, oid, oid_name, 1 as child_flag from snmpdata where id = "  + target_id + " order by parent_id"
      console.log(query)
      db.all(query, function(err,rows) {
       console.log(util.inspect(err));
	      for(var i=0; i<rows.length;i++) {
                node_list['x' + rows[i].id] = {children:[], id:rows[i]['id'], parent_id: rows[i]['parent_id'],oid: rows[i]['oid'],oid_name: rows[i]['oid_name']};
	        if (rows[i]['parent_id'] != null && rows[i]['id'] != target_id)
                {
		    node_list['x' + rows[i]['parent_id']]['children'].push(node_list['x' + rows[i].id]);
	        }
                else
                {
                   node_heirarchy=node_list['x' + rows[i].id];
	        } 
	      }
        res.json(node_heirarchy);
      }); 
    }); 
}

module.exports = router;
