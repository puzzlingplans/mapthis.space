
db.json: presets.json fields.json iconmap.json new_presets.json new_fields.json
	jsonlint new_presets.json
	jsonlint new_fields.json
	jsonlint iconmap.json
	jsonlint presets.json
	jsonlint fields.json
	echo '{' > $@
	echo '"fields":' >> $@
	cat fields.json >> $@
	echo ',"presets":' >> $@
	cat presets.json >> $@
	echo ',"new_fields":' >> $@
	cat new_fields.json >> $@
	echo ',"new_presets":' >> $@
	cat new_presets.json >> $@
	echo ',"iconmap":' >> $@
	cat iconmap.json >> $@
	echo '}' >> $@
	jsonlint $@
	
copyall:
	cp ../../iD/data/presets/fields.json  .
	cp ../../iD/data/presets/presets.json  .

allkeys.txt: fields.json
	jq -r  ".[].key" $< | grep -v null | sort | uniq > $@
	
