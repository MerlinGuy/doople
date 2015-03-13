/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 5/7/13
 * Time: 12:13 PM
 */


function CsvReader () {
    this.CSV = "csv";
    this.cols = {
        'indx':['INDEX'],
        'utcdate':['UTC DATE'],
        'utctime':['UTC TIME'],
        'utcdatetime':['utcdate'],
        'localdate':['LOCAL DATE'],
        'localtime':['LOCAL TIME'],
        'localdatetime':['localdate'],
        'latitude':['LATITUDE'],
        'northing':['N/S'],
        'longitude':['LONGITUDE'],
        'easting':['E/W'],
        'altitude':['ALTITUDE'],
        'speed':['SPEED']
    },
        this.callback = null;
    this.failcallback = null;
};

CsvReader.prototype.getColumnName = function(col_name) {
    var cols = this.cols;
    col_name = col_name.toLowerCase().replace(/\n/g, '');
    var ent_name;
    for (var name in cols) {
        var entity = cols[name];
        for (var ele in entity) {
            ent_name = entity[ele].toLowerCase();
            if (ent_name == col_name) {
                return name;
            }
        }
    }
    return null;
},

    CsvReader.prototype.readFile = function(file, callback, failcallback) {
        var _this = this;
        this.callback = callback;
        this.failcallback = failcallback;

        var ext = FileUtil.getExtension(file.name);
        if (ext == this.CSV) {
            var cb = function(e) {
                var contents = e.target.result;
                var tracks = _this.readTracks(contents);
                if (_this.callback) {
                    _this.callback( tracks );
                }
            }
            var reader = new FileReader();
            reader.onloadend = cb;
            reader.readAsText(file);

        } else {
            return [{'error':'Invalid file extension, only *.csv readable'}];
        }

    }

CsvReader.prototype.readTracks = function (contents) {
    try {
        var track = {};
        track.bounds = {};
        var minlat=null;
        var minlng=null;
        var maxlat=null;
        var maxlng=null;

        track.points = [];
        track.times = [];
        var lines = contents.split("\n");
        if (lines.length == 0) {
            return null;
        }
        var col_names = lines[0].split(",");
        var nameMap = [];
        var col_len = col_names.length;
        for (var indx = 0; indx < col_len; indx++) {
            nameMap[indx]= this.getColumnName(col_names[indx]);
        }
        var point_len = lines.length;
        var point;
        var minlat
        for (var indx = 1; indx < point_len; indx++) {
            point = this.parsePoint(lines[indx], nameMap);
            if (point != null) {
                if (minlat == null || point.latitude < minlat) {
                    minlat = point.latitude;
                }
                if (minlng == null || point.longitude < minlng) {
                    minlng = point.longitude;
                }
                if (maxlat == null || point.latitude > maxlat) {
                    maxlat = point.latitude;
                }
                if (maxlng == null || point.longitude > maxlng) {
                    maxlng = point.longitude;
                }
                track.points.push(point);
                track.times.push(point.utcdate);
            }
        }
        var tracks = [];
        track.bounds = {'minlat':minlat,'minlng':minlng,'maxlat':maxlat,'maxlng':maxlng};
        tracks.push(track);
        return tracks;

    } catch (e) {
        Geof.log(e);
        return null;
    }
}

CsvReader.prototype.parsePoint = function(line, lineMap) {
    var values = line.split(",");
    var map_len = lineMap.length;
    if (values.length < map_len) {
        return null;
    }
    var point = {};
    var col_name;
    for (var indx=0; indx < map_len; indx++) {
        col_name = lineMap[indx];
        if ( col_name || false ) {
            point[col_name] = values[indx];
        }
    }
    if ('utcdate' in point && 'utctime' in point) {
        point.utcdate = DateUtil.parseDate(point.utcdate + " " + point.utctime);
    }
    if ('northing' in point) {
        point.latitude = point.latitude * (point.northing == 'N' ? 1 : -1 );
    }
    if ('easting' in point) {
        point.longitude = point.longitude * (point.easting == 'E' ? 1 : -1 );
    }
    point.latitude = point.latitude.toFixed(6);
    point.longitude = point.longitude.toFixed(6);
    return point;
}


/*
 <Document>
 <name>Track201208181016</name>
 <Style id="lineStyle">
 <LineStyle>
 <color>99ffac59</color>
 <width>6</width>
 </LineStyle>
 </Style>
 <Folder>
 <name>Track 2012-08-18 10:16</name>
 <open>1</open>
 <Folder>
 <name>Segment 1</name>
 <open>1</open>
 <TimeSpan>
 <begin>2012-08-18T16:16:26Z</begin>
 <end>2012-08-18T17:02:11Z</end>
 </TimeSpan>
 <Placemark>
 <name>Path</name>
 <styleUrl>#lineStyle</styleUrl>
 <LineString>
 <tessellate>0</tessellate>
 <altitudeMode>clampToGround</altitudeMode>
 <coordinates>
 -105.07847602,40.59336797,1500.4000244140625 -105.07845983,40.59341792,1499.300048828125 					-105.0784452,40.59347025,1499.0999755859375 -105.07846116,40.59352008,1499.5999755859375  					-105.11345077,40.60741187,1514.199951171875 -105.11351314,40.60742246,1514.4000244140625
 </coordinates>
 </LineString>
 </Placemark>
 </Folder>
 </Folder>
 </Document></kml>
 */

KmzReader.prototype.readTracks = function(folder) {
    var name = folder.children(this.NAME);
}


function KmzReader () {
    this.KML = "kml";
    this.KMZ = "kmz";
    this.NAME = "name";
    this.TIMESPAN = "TimeSpan";
    this.FOLDER = "Folder";
    this.PLACEMARK = "Placemark";
    this.LINESTRING = "LineString";
    this.COORDS = "coordinates";
    this.ALT_MODE = "altitudeMode";
    this.BEGIN = "begin";
    this.END = "end";

};

KmzReader.prototype.readFile = function(file, callback, failcallback) {
    var _this = this;
    this.callback = callback;
    this.failcallback = failcallback;

    var ext = FileUtil.getExtension(file.name);
    if (ext == this.KMZ) {
        var cb = function(entries) {
            _this.processEntries(entries);
        }
        FileUtil.unzip(file, cb );

    } else if (ext == this.KML) {
        var cb = function(e) {
            var content = e.target.result;
            _this.json = _this.readTracks(content);
            if (_this.callback) {
                _this.callback(_this.json);
            }
        }
        var reader = new FileReader();
        reader.onloadend = cb;
        reader.readAsText(file);

    } else {
        return [{'error':'Invalid file extension, only *.kmz or *.kml readable'}];
    }

}

KmzReader.prototype.processEntries = function(entries) {
    var _this = this;
    var cb = function(kml) {
        _this.json = _this.readTracks(kml);

        if (_this.callback) {
            _this.callback(_this.json);
        }
    }

    for (var indx in entries) {
        var entry = entries[indx];
        entry.getData(new zip.TextWriter(), cb);
    }
}

KmzReader.prototype.readTracks = function (contents) {
    var rtn = null;
    try {
        var tracks = [];
        var $xml = $.parseXML(contents);
        var folders = $xml.getElementsByTagName(this.FOLDER);

        if (folders.length == 0) {
            return;
        }

        var main_folder = folders[0];
        folders = main_folder.getElementsByTagName(this.FOLDER);
        var len = folders.length;
        for (var fIndx=0;fIndx<len;fIndx++) {
            var track = this.readTrack(folders[fIndx]);
            if ((track != null) && (track.points != null)) {
                tracks.push(track);
            }
        }
        return tracks;

    } catch (e) {
        Geof.log(e);
    }
    return rtn;
}

KmzReader.prototype.readTrack= function(folder){
    var children = folder.childNodes;
    var track = {
        fileid:0,
        points:[],
        times:[],
        bounds:{}
    };

    var minlat=null;
    var minlng=null;
    var maxlat=null;
    var maxlng=null;
    var start = null;
    var end = null;

    var len = children.length;
    for (var indx =0; indx < len; indx++ ) {
        var node = children[indx];
        if (node.nodeName === this.NAME) {
            track[this.NAME] = node.textContent;
        } else if (node.nodeName === this.TIMESPAN) {
            for (var tIndx in node.childNodes) {
                var tchild = node.childNodes[tIndx];
                if (tchild.nodeName === this.BEGIN) {
                    start = DateUtil.parseDate(tchild.textContent);
                } else if (tchild.nodeName == this.END) {
                    end = DateUtil.parseDate(tchild.textContent);
                }
                if (start && end) {
                    break;
                }
            }

        } else if (node.nodeName === this.PLACEMARK) {
            var line = node.getElementsByTagName(this.LINESTRING) || false;
            if ((!line) || line.length == 0) {
                return;
            }
            var coords = line[0].getElementsByTagName(this.COORDS);
            if ((!coords) || coords.length == 0) {
                return;
            }
            var coordText = coords[0].textContent;
            if (coordText.length == 0) {
                return;
            }
            var pointList = coordText.split(" ");
            for (var indx in pointList) {
                var geo = pointList[indx].split(',');
                if (geo.length == 3) {
                    var point = {
                        longitude:parseFloat(geo[0]),
                        latitude:parseFloat(geo[1]),
                        altitude:parseFloat(geo[2])
                    };
                    track.points.push(point);
                    if (minlat == null || point.latitude < minlat) {
                        minlat = point.latitude;
                    }
                    if (minlng == null || point.longitude < minlng) {
                        minlng = point.longitude;
                    }
                    if (maxlat == null || point.latitude > maxlat) {
                        maxlat = point.latitude;
                    }
                    if (maxlng == null || point.longitude > maxlng) {
                        maxlng = point.longitude;
                    }
                }
            }
        }
    }
    track.bounds = {'minlat':minlat,'minlng':minlng,'maxlat':maxlat,'maxlng':maxlng};

    if (start && end) {
        var points = track['points'];
        var len = points.length;
        var diff = end.getTime() - start.getTime();
        var msecs = diff / (len - 1);
        points[0].utcdate = start;
        points[len - 1].utcdate = end;
        var startMillis = start.getTime();
        track.times = [];
        var newDate;
        for (var indx=0; indx < len; indx++) {
            newDate = new Date(startMillis + (indx * msecs) );
            points[indx].utcdate = newDate;
            track.times.push(newDate);
        }
    }

    return track;
},

    KmzReader.prototype.readPlacemark= function(pmark, fldr){
        var children = pmark.childNodes;

        var len = children.length;
        for (var indx =0; indx < len; indx++ ) {
            var node = children[indx];
            if (node.nodeName === this.NAME) {
                fldr[this.NAME] = node.textContent;
            } else if (node.nodeName === this.TIMESPAN) {
                fldr[this.TIMESPAN] = node.textContent;

            } else if (node.nodeName === this.PLACEMARK) {
                var pmark = node.getElementsByTagName(this.LINESTRING);
                this.readPlacemark(pmark,fldr);
            }
        }
    }

//KmzReader.prototype.parseBounds = function(ele) {
//    if ((ele || false) && (ele.length == 1)) {
//        var attrs = ele[0].attributes;
//        var sw = new google.maps.LatLng(
//            parseFloat(attrs[this.MINLAT].value),
//            parseFloat(attrs[this.MINLON].value));
//        var ne = new google.maps.LatLng(
//            parseFloat(attrs[this.MAXLAT].value),
//            parseFloat(attrs[this.MAXLON].value));
//
//        return new google.maps.LatLngBounds(ne, sw);
//    }
//}

//KmzReader.prototype.parseTrack = function(ele) {
//    var track = {
//        'start':null,
//        'end':null,
//        'distance':'',
//        'points':[],
//        'times':[],
//        'bounds': new google.maps.LatLngBounds()
//    }
//    var points = $(ele).find(this.POINT);
//    var len = points.length;
//    var p;
//    for (var indx=0;indx<len;indx++) {
//        p = points[indx];
//        var point = new google.maps.LatLng($(p).attr(this.LAT),$(p).attr(this.LON));
//        track.points.push(point);
//        track.bounds.extend(point);
//        var time = $(p).find(this.TIME);
////        time = this.parseTime(time);
//        time = DateUtil.parseDate(time);
//        if (time != null) {
//            track.times[indx] = time;
//            if (track.start == null || time < track.start) {
//                track.start = time;
//            }
//            if (track.end == null || time > track.end) {
//                track.end = time;
//            }
//        }
//    }
//    track.distance = google.maps.geometry.spherical.computeLength(track.points);
//    return track;
//}



function GpxReader () {
    this.GPX = "gpx";
    this.NAME = "name";
    this.TIME = "time";
    this.BOUNDS = "bounds";
    this.MINLAT = "minlat";
    this.MINLON = "minlon";
    this.MAXLAT = "maxlat";
    this.MAXLON = "maxlon";
    this.TRACK = "trk";
    this.SEGMENT = "trkseg";
    this.POINT = "trkpt";
    this.WPT = "wpt";
    this.LAT = "lat";
    this.LON = "lon";
    this.ELE = "ele";
    this.RTE = "rte";
    this.RTEPT = "rtept";
    this.callback = null;
    this.failcallback = null;

};

GpxReader.prototype.readFile = function(file, callback, failcallback) {
    var _this = this;
    this.callback = callback;
    this.failcallback = failcallback;

    var ext = FileUtil.getExtension(file.name);
    if (ext == this.GPX) {
        var cb = function(e) {
            var contents = e.target.result;
            var tracks = _this.readTracks(contents);
            if (_this.callback) {
                _this.callback( tracks );
            }
        }
        var reader = new FileReader();
        reader.onloadend = cb;
        reader.readAsText(file);

    } else {
        return [{'error':'Invalid file extension, only *.gpx readable'}];
    }

}

GpxReader.prototype.readTracks = function (contents) {
    var rtn = null;
    try {
        var $xml = $($.parseXML(contents));
        var gpx = $xml.find(this.GPX);
        if (gpx.length != 1) {
            return;
        }
        var tracks = [];
        var trks = gpx.children(this.TRACK);
        if (trks.length > 0) {
            var len = trks.length;
            for (var indx=0;indx<len;indx++) {
                var track = this.parseTrack(trks[indx]);
                if (track != null) {
                    tracks.push(track);
                }
            }
        } else {
            var wpts = gpx.children(this.WPT);
            if (wpts.length) {
                var track = this.parseWayPoints(wpts);
                if (track != null) {
                    tracks.push(track);
                }
            }
        }

        rtn = tracks;
    } catch (e) {
        Geof.log(e);
    }
    return rtn;
}

GpxReader.prototype.parseBounds = function(ele) {
    if ((ele || false) && (ele.length == 1)) {
        var attrs = ele[0].attributes;
        var sw = new google.maps.LatLng(
            parseFloat(attrs[this.MINLAT].value),
            parseFloat(attrs[this.MINLON].value));
        var ne = new google.maps.LatLng(
            parseFloat(attrs[this.MAXLAT].value),
            parseFloat(attrs[this.MAXLON].value));

        return new google.maps.LatLngBounds(ne, sw);
    }
}

GpxReader.prototype.parseTrack = function(ele) {
    var points = $(ele).find(this.POINT);
    var track = this.parseWayPoints(points);
    return track;
}

GpxReader.prototype.parseWayPoints = function(points) {
    var minlat=null;
    var minlng=null;
    var maxlat=null;
    var maxlng=null;

    var track = {
        'distance':'',
        'points':[],
        'times':[],
        'bounds': {}
    }
    var len = points.length;
    var p;
    for (var indx=0;indx<len;indx++) {
        p = points[indx];
        var point = {
            'latitude':parseFloat($(p).attr(this.LAT)).toFixed(6),
            'longitude':parseFloat($(p).attr(this.LON)).toFixed(6)
        };
        if (minlat == null || point.latitude < minlat) {
            minlat = point.latitude;
        }
        if (minlng == null || point.longitude < minlng) {
            minlng = point.longitude;
        }
        if (maxlat == null || point.latitude > maxlat) {
            maxlat = point.latitude;
        }
        if (maxlng == null || point.longitude > maxlng) {
            maxlng = point.longitude;
        }

        track.points.push(point);
        var time = $(p).find(this.TIME);

        time = this.parseDate(time);
        if (time != null) {
            track.times.push(time);
        }
    }
    track.bounds = {'minlat':minlat,'minlng':minlng,'maxlat':maxlat,'maxlng':maxlng};
//    track.distance = google.maps.geometry.spherical.computeLength(track.points);
    return track;
}

GpxReader.prototype.parseDate = function(ele) {
    if ((ele || false) && (ele.length == 1)) {
        var datetime = ele[0].textContent;
        return DateUtil.parseDate(datetime);
    }
    return null;
}
