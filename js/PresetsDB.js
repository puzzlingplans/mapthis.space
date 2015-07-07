
function PresetsDB(data)
{
  this.fields = data.fields;
  this.presets = data.presets;
  for (var k in data.new_fields)
    this.fields[k] = $.extend(this.fields[k], data.new_fields[k]);
  for (var k in data.new_presets)
    this.presets[k] = $.extend(this.presets[k], data.new_presets[k]);
  this.iconmap = data.iconmap;
  this.keys = {};
  var modified_presets = {};
  // merge (new) presets with inherited
  for (var p in data.new_presets)
  {
    var preset = this.presets[p];
    var searchable = preset.searchable;
    if (preset.inherits)
    {
      var inherits = $.merge([], preset.inherits);
      for (var i=0; i<inherits.length; i++)
      {
        var ip = inherits[i];
        var parent = this.presets[ip];
        if (parent)
        {
          preset = $.extend({}, parent, preset);
          var initial_fields = $.merge([], preset.priority?preset.priority:[]); // put "priority" fields before parent fields
          preset.fields = $.merge($.merge(initial_fields, parent.fields), preset.fields); // preserve ordering
          if (parent.terms)
            preset.terms = $.merge($.merge([], parent.terms), preset.terms);
          if (parent.inherits)
            $.merge(inherits, parent.inherits);
          // TODO: don't add duplicate inherits
          //console.log(parent, preset, preset.priority);
        }
      }
      if (searchable != false) preset.searchable = true; // if not explicitly marked, make inherited presets searchable
      //console.log(inherits, preset);
      modified_presets[p] = preset;
    }
  }
  // merge back into presets
  for (var k in modified_presets)
    this.presets[k] = modified_presets[k];
  // process presets; build key table
  for (var p in this.presets)
  {
    var preset = this.presets[p];
    preset.id = p;
    if (preset.tags)
    {
      var tags = preset.tags;
      for (var k in tags)
      {
        if (this.keys[k])
          this.keys[k].push(p);
        else
          this.keys[k] = [p];
      }
    }
  }
}

PresetsDB.prototype.getIconForPreset = function(preset)
{
        if (preset.id && this.iconmap[preset.id])
                return this.iconmap[preset.id];
        else if (preset.icon && this.iconmap[preset.icon])
                return this.iconmap[preset.icon];
        else if (preset.icon)
                return 'oc-' + preset.icon;
        else {
                var arr = preset.id.split('/');
                return 'oc-' + arr[arr.length-1];
        }
}

PresetsDB.prototype.getPossiblePresets = function(tags)
{
  var pset = {};
  for (var tagname in tags)
  {
    if (this.keys[tagname])
    {
      for (var pname in this.keys[tagname])
      {
        pset[pname] = true;
      }
    }
  }
  return Object.keys(pset);
}

PresetsDB.prototype.findMatch = function(tags)
{
	var bestscore = 0;
	var bestobj = null;
	var presets = this.getPossiblePresets(tags);
	for (var key in this.presets)
	{
		var value = this.presets[key];
		var score = this.matchTags(tags, value);
		if (score > bestscore)
		{
			bestscore = score;
			bestobj = value;
		}
	}
	return bestobj;
}

var MUTED_KEYS = ['building'];

PresetsDB.prototype.matchTags = function(tags, template)
{
	var n = 0;
	for (var k in template.tags)
	{
		if (tags[k])
		{
			var x = 0;
			if (template.tags[k] == tags[k])
				x = 10;
			else if (template.tags[k] == '*')
				x = 2;
			if (template.matchScore)
				x *= template.matchScore;
                        if (MUTED_KEYS.indexOf(k) >= 0)
                                x /= 2;
			n += x;
		} else {
			n -= 10; // TODO?
		}
	}
	/*
	for (var i in template.fields)
	{
	        var fieldname = template.fields[i];
	        var field = this.fields[fieldname];
	        if (field) 
	        {
	                for (var j in field.keys)
	                {
	                        var k = field.keys[j];
	                        if (tags[k])
	                                n++;
	                }
	        }
	}
	*/
	return n;
}

PresetsDB.prototype.updateObjName = function(obj)
{
        var preset = presets_db.findMatch(obj.tags);
        if (preset && preset.name)
                obj.preset_name = preset.name;
        if (obj.tags.name)
        	obj.name = obj.tags.name;
        else if (obj.preset_name)
        	obj.name = obj.preset_name;
        else
        	obj.name = "?";
        return preset;
}


// TODO: make into tests
if (typeof module != 'undefined' && !module.parent)
{
  var fs = require('fs');
  var db = new PresetsDB(JSON.parse(fs.readFileSync('./presets/db.json', 'utf8')));
  console.log(db.findMatch({'amenity':'bar'}));
  console.log(db.findMatch({'shop':'supermarket','area':'yes','building':'yes','name':"Shop"}));
  console.log(db.findMatch({'shop':'convenience','area':'yes','building':'retail','name':"7/11"}));
}
