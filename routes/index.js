var express = require('express');
var sqlite  = require('sqlite3').verbose();
var util    = require('util')
var db      = new sqlite.Database('snmpweb.db');
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
 
// The page that your contact form is on should have a route like this
router.post('/contact-save', function(req, res){
   var name = req.body.name;
   var email = req.body.email;
   var comment = req.body.comment;
   console.log(comment);
   var stmt = db.prepare("insert into contactdata (name, email, comment) values (?,?,?)");
   stmt.run(name, email, comment);
   res.redirect("/");
});

router.get('/query', function(req, res, next) {
    if (!req.query.node ) {
          build_list(res, null);
    }
    else {
	build_list(res, req.query.node)
      }
});
router.get('/getId', function(req, res, next) {
     var oid = req.query.oid ;
     query_get_id = "select  id  from snmpdata where oid = \"" +  oid + "\""; 
     db.all(query_get_id, function(err,rows) {
	     res.json(rows[0].id);
     });

});
router.get('/search', function(req, res, next) {
     query_get_id = "select docid, t.oid_name, t.description, d.oid as oid from snmpdatatext t left join snmpdata d  on docid = id where t.description match '" + req.query.term  +"';"; 
     console.log(query_get_id);
     db.all(query_get_id, function(err,rows) {
	     util.inspect(rows);
       res.json(rows)
     });
});
router.get('/uptree', function(req, res, next) {
     console.log("Calling uptree2");
     var oid = req.query.oid ;
     query_get_id = "select  id, parent_id  from snmpdata where oid = \"" +  oid + "\""; 
     console.log("Calling uptree2");
     console.log( query_get_id);
     db.all(query_get_id, function(err,rows) {
       if (rows.length > 0) {
            db.all("select count(*) as cnt from snmpdata where parent_id=" + rows[0]['id'], function(err,rows2) {
		  if (rows2[0]['cnt'] == 0) {
			var target_id = rows[0]['parent_id'];
                        console.log("!!!!!!!!!!!!!!!!!!!!Childless" + target_id);
	  		backout(res, target_id);
		  }
		  else {
			var target_id = rows[0]['id'];
                        console.log("!!!!!!!!!!!!!!!!!!!!With Child" + target_id);
	  		backout(res, target_id);
		  }
	  });
       }
       else {
            res.json({status: "FAIL", message: "OID (" + oid  + ") Not Found"});
       }
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
        res.json(result);
      }); 
    }); 
}
function backout(res, target_id) {
    node_list = {};
    node_heirarchy = {};

    query = "WITH RECURSIVE above_here(x) as ( values("+ target_id +") union all select parent_id from snmpdata, above_here where snmpdata.id = above_here.x) " + 
	    "select id , oid_name || \" [\" || oid || \"]\" as label, 0 > 0  as load_on_demand, parent_id from snmpdata where (id in above_here or parent_id in above_here or parent_id is null )   order by oid; "; 
    query = "WITH RECURSIVE above_here(x) as ( values(" + target_id + ") union all " +
	    "select parent_id from snmpdata, above_here where snmpdata.id = above_here.x) " +
	    "select a.id , a.oid_name || \" [\" || a.oid || \"]\" as label, count(*) > 0  as load_on_demand, a.parent_id , b.id is not null children " +
	    "from snmpdata a left join snmpdata b on a.id = b.parent_id where (a.id in above_here or a.parent_id in above_here or a.parent_id is null )   group by a.oid, a.id, a.oid_name, a.parent_id order by a.oid;" ;

    var mibById = {};
    var mibTree = [];
    db.serialize(function() { 
      console.log(query);
      db.all(query, function(err,rows) {
	for(i=0;i<rows.length;i++) {
          var new_row={};
	  new_row["load_on_demand"] = (rows[i]["load_on_demand"] == 1);
	  new_row["id"] = rows[i]["id"];
	  new_row["parent_id"] = rows[i]["parent_id"];
	  new_row["label"] = rows[i]["label"];
	  new_row["children"] = [];
	  mibById[new_row["id"]] = new_row;
	  if (new_row["parent_id"] in mibById) {
       
	      mibById[new_row["parent_id"]].load_on_demand= false;
              mibById[new_row["parent_id"]].children.push(new_row);
	  } else {
	      mibTree.push(new_row);
	  }
	}
        res.json({status:"SUCCESS", data: mibTree});
      }); 
    }); 
}

module.exports = router;
