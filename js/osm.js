
//
 
var OSMDBPREFIX = 'osmcs.';

var GENERATOR_ID = 'mapthis.space'; // TODO
var GENERATOR_VERSION = '0.0.1';
var GENERATOR_ID_VERSION = GENERATOR_ID + ' ' + GENERATOR_VERSION;

//

function changesetGetKey(obj)
{
  return OSMDBPREFIX + obj.type.charAt(0) + obj.id;
}

function objGetCenter(obj)
{
    var pos;
    if (obj.type == "node") {
      pos = new L.LatLng(obj.lat, obj.lon);
    } else if (obj.type == "way") {
      var cenlat = (obj.bounds.minlat + obj.bounds.maxlat)/2;
      var cenlon = (obj.bounds.minlon + obj.bounds.maxlon)/2;
      pos = new L.LatLng(cenlat, cenlon);
    }
    return pos;
}

function changesetGetObject(type,id)
{
  return JSON.parse(localStorage.getItem(OSMDBPREFIX + type.charAt(0) + id));
}

function changesetGetStagedObject(type,id)
{
  var o = changesetGetObject(type,id);
  if (!o)
  {
    o = {type:type,id:id};
  }
  return o;
}

function changesetGetMetadata()
{
  return JSON.parse(localStorage.getItem("osmcsmeta"));
}

function changesetNextSeq()
{
  var seq = localStorage.getItem("osmnextseq") - 1;
  localStorage.setItem("osmnextseq", seq);
  return seq; // TODO: when to reset?
}

function changesetCreate(csid)
{
  var data = {changeset:csid};
  localStorage.setItem("osmcsmeta", JSON.stringify(data));
}

function changesetAddObject(obj)
{
  if (obj.id == null)
    throw Exception("Bad id: " + obj.id);
  if (obj.type == null)
    throw Exception("Bad type: " + obj.type);
    
  if (!obj.timestamp) obj.timestamp = new Date().toISOString();
  changesetStoreData(obj.type, obj.id, obj);
}

function changesetStoreData(type, id, data)
{
  localStorage.setItem(OSMDBPREFIX + type.charAt(0) + id, JSON.stringify(data));
}

function changesetDeleteObject(obj)
{
  if (obj.id > 0) {
    obj.deleted = true;
    changesetAddObject(obj);
  } else {
    changesetRevertObject(obj);
  }
}

function changesetRevertObject(obj)
{
  localStorage.removeItem(changesetGetKey(obj));
}

function changesetClearAll()
{
  var len = localStorage.length;
  var keysToDelete = [];
  for (var i=0; i<len; i++)
  {
    var key = localStorage.key(i);
    if (key && key.substring(0, OSMDBPREFIX.length) == OSMDBPREFIX)
    {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(function(k) { localStorage.removeItem(k); });
  console.log("Deleted " + keysToDelete.length + " entries");
}

var CHAR2OBJTYPE = {'n':'node', 'w':'way', 'r':'relation'};

function changesetGetObjects(created,modified,deleted)
{
  var objs = [];
  var len = localStorage.length;
  var count = 0;
  for (var i=0; i<len; i++)
  {
    var key = localStorage.key(i);
    if (key.substring(0, OSMDBPREFIX.length) == OSMDBPREFIX)
    {
      var type = CHAR2OBJTYPE[key.substring(OSMDBPREFIX.length, OSMDBPREFIX.length+1)];
      if (!type) { console.log('bad type: ' + key); continue; }
      var id = parseInt(key.substring(OSMDBPREFIX.length + 1));
      if (!id) { console.log('bad id: ' + key); continue; } // TODO?
      var nch = changesetGetObject(type,id);
      if (!nch) { console.log('no node data: ' + id); continue; } // TODO?
      // TODO: deleted?
      if (nch.deleted)
      {
        if (deleted) objs.push(nch);
      }
      else if ((created && id < 0) || (modified && id > 0))
      {
        objs.push(nch);
      }
    }
  }
  return objs;
}

function changesetGetXML()
{
  var doc = $.parseXML('<osmChange version="0.6" generator="' + GENERATOR_ID + '"></osmChange>');
  var modify = doc.createElement('modify');
  var create = doc.createElement('create');
  var deletes = doc.createElement('delete');
  doc.documentElement.appendChild(modify);
  doc.documentElement.appendChild(create);
  doc.documentElement.appendChild(deletes);
  var csmeta = changesetGetMetadata();
  if (csmeta == null) {
    console.log("No changeset metadata");
    return null;
  }
  var objs = changesetGetObjects(true,true,true);
  for (var i=0; i<objs.length; i++)
  {
      var nch = objs[i];
      var el = doc.createElement(nch.type);
      el.setAttribute('id',nch.id);
      if (nch.lat) el.setAttribute('lat',nch.lat);
      if (nch.lon) el.setAttribute('lon',nch.lon);
      el.setAttribute('timestamp',nch.timestamp);
      el.setAttribute('changeset',csmeta.changeset);
      if (nch.version) el.setAttribute('version',nch.version);
      if (nch.deleted)
      {
        if (nch.id > 0) // TODO: needed?
          deletes.appendChild(el);
      }
      else
      {
        // add nodes (ways only)
        if (nch.nodes && nch.nodes.length)
        {
          for (var j=0; j<nch.nodes.length; j++)
          {
            var nd = doc.createElement('nd');
            nd.setAttribute('ref', nch.nodes[i]);
            el.appendChild(nd);
          }
        }
        // add tags
        for (var k in nch.tags)
        {
          var v = nch.tags[k];
          if (v && v != '') {
            var tag = doc.createElement('tag');
            tag.setAttribute('k', k);
            tag.setAttribute('v', v);
            el.appendChild(tag);
          }
        }
        (nch.id<0?create:modify).appendChild(el);
      }
  }
  return objs.length ? doc : null;
}

//

var encodeQString = function(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

// callback = function(err, details)
function osmQuery(method, path, data, callback)
{
  console.log(path);
  var options = null;
  if (data && typeof data == 'object')
  {
    if (data['multipart'] != null)
    {
      var boundary = new Date().getTime() + '';
      options = {
        header:{
          'Content-Type': "multipart/form-data; boundary=" + boundary,
        }
      };
      var s = '';
      for (var k in data) {
        if (k != 'multipart') {
          var v = data[k];
          s += "--" + boundary + "\r\n";
          if (k == 'file') {
            s += "Content-Disposition: form-data; name=\"" + k + "\"; filename=\"" + data.multipart + "\"\r\n";
            s += "Content-Type: text/xml\r\n\r\n";
            s += v;
            s += "\r\n";
          } else {
            s += "Content-Disposition: form-data; name=\"" + k + "\"\r\n\r\n" + v + "\r\n";
          }
        }
      }
      s += "--" + boundary + "--\r\n\r\n";
      data = s;
    } else {
      // turn dictionary into a string
      data = encodeQString(data);
    }
  } else {
    // we don't want the form-encoded header
    options = {header:{}};
  }
  osm_auth.xhr({
    method: method,
    path: '/api/0.6' + path,
    content: data,
    options: options,
  }, function(error, response) {
    // TODO: check error
    if (error) alert('Could not contact server: ' + error); // TODO
    else if (callback) callback(response);
  });
}

function osmLogin(callback)
{
  // fetch user details
  osmQuery('GET', '/user/details', null, function(userData) {
    osmUserID = userData.getElementsByTagName('user')[0].id;
    console.log('OSM user id = ' + osmUserID);
    // fetch open changesets
    osmQuery('GET', '/changesets?open=true&user=' + osmUserID, null, function(changesetsData) {
      var changeset = changesetsData.getElementsByTagName('changeset');
      var changesetID = changeset && changeset.length ? changeset[0].id : null;
      if (!changesetID)
      {
        // TODO: http://wiki.openstreetmap.org/wiki/Key:imagery_used
        osmQuery('PUT', '/changeset/create',
          '<osm><changeset><tag k="created_by" v="' + GENERATOR_ID_VERSION + '"/></changeset></osm>',
          function(newChangeset) {
            console.log('created changeset = ' + newChangeset);
            changesetCreate(newChangeset);
            if (callback) callback();
          });
      } else {
        console.log('open changeset = ' + changesetID);
        changesetCreate(changesetID);
        if (callback) callback();
      }
    });
  });
}

function osmUploadChanges(callback)
{
  // TODO: what if empty? not logged in?
  // TODO: what if error?
  var xml = changesetGetXML();
  if (!xml) {
    callback();
    return;
  }
    
  var data = (new XMLSerializer()).serializeToString(xml);
  console.log(data);
  var meta = changesetGetMetadata();
  osmQuery('POST', '/changeset/' + meta.changeset + '/upload', data, function(uploadResponse) {
    console.log(uploadResponse);
    changesetClearAll();
    if (callback) callback();
  });
}

function osmUploadTrack(gpx, callback)
{
  var data = {
    'multipart': 'file.gpx',
    // TODO?
    'file': gpx.toString(),
    'description': 'created by ' + GENERATOR_ID_VERSION,
    'tags': 'from_web',
    'public': '0',
    'visibility': 'private',
  };
  //console.log(data);
  osmQuery('POST', '/gpx/create', data, callback);
}

function osmUploadNote(obj, comment, callback)
{
  var cen = objGetCenter(obj);
  osmQuery('POST', '/notes', {
    lat: cen.lat,
    lon: cen.lng,
    text: comment
  }, callback);
}

function tagsChanged(tags, base)
{
	var changed = {};
	for (var k in tags)
	{
		var newv = tags[k];
		var oldv = base ? base[k] : null;
		// fix empty strings -> null
		if (!newv) newv = null;
		if (!oldv) oldv = null;
		if (newv != oldv)
		{
			changed[k] = newv;
		}
	}
	return changed;
}


//

var osm_auth = osmAuth({
    oauth_consumer_key: oauthConsumerKey,
    oauth_secret: oauthConsumerSecret,
    url: osmRootUrl,
    auto: true // show a login form if the user is not authenticated and you try to do a call
});


//TODO: remove
if (typeof localStorage === "undefined" || localStorage === null) 
{
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('/tmp/poifun_scratch');
}
