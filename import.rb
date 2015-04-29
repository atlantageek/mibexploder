require 'nokogiri'
require 'sqlite3'

db =  SQLite3::Database.new("snmp.db")

doc = Nokogiri::XML(File.open('/tmp/docs-if-mib.xml'))
puts "STARTING"
doc.xpath('//*[@oid]').each do |node|
	puts "XX"
	puts node.name
	descr = node.search("description").text
	oid = node["oid"]
	suboid = oid.split(".")
	suboid.pop()
	firstrow = db.execute("select id from snmpdata where oid = ?", [suboid.join(".")])[0]
        puts firstrow
	node_name = node["name"]
	if firstrow.nil?
		parent_id = nil
	else
		parent_id = firstrow[0].to_i
	end
	db.execute("insert into snmpdata (oid, oid_name, snmp_type, description,parent_id) values(?,?,?,?,?)", 
		  [oid, node_name, node.name, descr, parent_id]);
end
