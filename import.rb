require 'sqlite3'
require 'json'

db =  SQLite3::Database.new("snmpweb.db")

def file_import (db, filename)
  doc = JSON.parse(File.read(filename))
  mib_name = filename.split('.')[0]
  doc.each do |key, value|
     if ((value.class == Hash) && ( value.keys.include?('oid')))
	 descr = value['description']
	 access = value['access']
	 oid = value['oid']
	 suboid = oid.split(".")
	 suboid.pop()
	 firstrow = db.execute("select id from snmpdata where oid = ?", [suboid.join(".")])[0]
	 puts firstrow
	 node_name = value['name']
	if firstrow.nil?
		parent_id = nil
	else
		parent_id = firstrow[0].to_i
	end
	puts oid
        db.execute("insert or replace into snmpdata (oid, oid_name, snmp_type, description,parent_id, access, mib_name) values(?,?,?,?,?,?,?)", 
		  [oid, node_name, node_name, descr, parent_id, access, mib_name]);
    end
  end
end

def parentize(db) 
	db.execute("delete from snmpdata where oid_name = 'anonymous'")
	db.execute("update snmpdata set parent_id = null  where parent_id not in (select id from snmpdata);")
	orphans = db.execute("select id, oid from snmpdata where parent_id is null")
	orphans.each do |orphan|
		adopt(db, orphan)
	end
#	root_data = [ ['iso','1'],['identified-organization','1.3'],['dod','1.3.6'],['internet','1.3.6.1']]
#        root_data.each do |pair|
#		db.execute("update snmpdata set oid_name=? where oid=?;", pair[0], pair[1])
#	end

end

def adopt(db, orphan)
	puts "---------------------------------------------#{orphan.inspect()}"
	oid = orphan[1]
	id = orphan[0]
	parent_oid = oid.split(".")
	return if parent_oid.length == 1
	parent_oid.pop()
	parent_oid_str = parent_oid.join(".")
	parent_id = db.execute("select id from snmpdata where oid = ?", parent_oid_str)[0]
	if parent_id.nil?  
		db.execute("insert into snmpdata(oid, oid_name) values(?,?)", [parent_oid_str, 'anonymous'])
		parent = db.execute("select id, oid from snmpdata where oid = ?", parent_oid_str)[0]
		parent_id = parent[0]
		puts "Recursive Adopt #{parent}, #{parent_oid_str}"
		adopt(db, parent)
	end
	 db.execute("update snmpdata set parent_id=? where id=?;", parent_id, id)
end

Dir.chdir('/home/tj/dev/mibexploder/jsonfiles')
Dir.foreach('/home/tj/dev/mibexploder/jsonfiles') { |file|
	puts ">>>>>>>>>>>>>>>>>>>>>>>>>#{file}"
	if file =~ /.json/
		file_import( db, file)
		#file_import( db, "SNMPv2-SMI.xml")
	end
}
parentize(db)

