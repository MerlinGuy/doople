var Geof = Geof || {};
Geof.map_popup = null;

GMapPopup.filesloaded = false;
GMapPopup.html = null;
GMapPopup.curDialog = null;

function GMapPopup( parent ) {
    this.parent = parent;
    this.GMap = null;
    this.files = null;
//    this.GMap_Popup = null;
//    this.setup_complete = setup_callback;
    this.toggleButtons = [
        "btnGmapDrawExtent",
        "btnGmapDrawPoint",
        "btnGmapClosestPoint",
        "btnGmapCropTrack",
        "btnGmapDrawExtent"];

    }

//GMapPopup_filesloaded_complete = function () {
//    GMapPopup.filesloaded = true;
//}

GMapPopup.prototype.showDialog = function (options) {

    var _this = this;
    var modal = (options.modal ||false) ? true : options.modal;

    var cb = function(html) {
        GMapPopup.html = html;
        $('#mainBody').append(html);
        var $dlg = $('#gmapDialog');
        GMapPopup.curDialog = $dlg;

        _this.initialize_gmap_dialog(_this);
        var pos = localStorage.getItem('default_map_position') || "20,20";
        pos = pos.split(",");
        var top = parseInt(pos[0]);
        var left = parseInt(pos[1]);

        var options = { autoOpen: false, position:[left, top],
            close: function() {
                $('#gmapDialog').remove();
                GMapPopup.curDialog = null;
                if (options.closeCallback) {
                    options.closeCallback();
                }

            },
            resizeStop: function () {
                var mapHolder = $('#mapHolder');
                var bar = $('#gmapviewerBar');
                var width = bar.width();
                var height = this.clientHeight - (bar[0].clientHeight  + 20);
                mapHolder.width(width).height(height);
                google.maps.event.trigger(_this.GMap.map, 'resize');
            },
            dragStop:function(event, ui) {
                var top = ui.position.top;
                var left = ui.position.left;
                localStorage.setItem('default_map_position', top + "," + left);
            },
            modal:modal, resizable:true, draggable:true, width:'auto', height:'auto'
        };

        $dlg.dialog(options);

        $dlg.dialog( "open" );

        $('#btnGmapDrawExtent').click(function() {
            _this.toggleDrawExtent(_this.GMap)
        });

        $('#btnGmapDrawPoint').click(function() {
            _this.togglePlacePoint(_this.GMap)
        });

        $('#btnGmapClosestPoint').click(function() {
            _this.toggleSelectClosestPoint(_this.GMap)
        });

        Gicon.click('btnGmapCropTrack',function() {
            _this.toggleCropTrack(_this.GMap)
        });

        $(".buttonBar").tooltip();
        if (options.completeCB || false) {
            options.completeCB(_this);
        }

        if (options.bounds || false){
            _this.GMap.fitBounds(options.bounds);
        } else if (options.center && options.zoom) {
            _this.GMap.setZoomCenter(options.center, options.zoom);
        }
    };

    if ( GMapPopup.curDialog != null) {
        GMapPopup.curDialog.dialog("close");
    }
    if (GMapPopup.html == null) {
        $.get("view/gmap_dialog.html", cb);
    } else {
        cb(GMapPopup.html);
    }
};

//GMapPopup.prototype.markerSelectedCB = function(marker) {
//    Geof.log('markerSelectedCB');
//    if (Gicon.isActive('btnGmapCropTrack')) {
//        this.toggleButton('btnGmapCropTrack');
//    }
//
//    if ((marker || false) && (marker.marker_type == 1)) {
//        Gicon.setEnabled('btnGmapCropTrack',true);
//    } else {
//        Gicon.setEnabled('btnGmapCropTrack',false);
//    }
//}

GMapPopup.prototype.toogleButton = function(btnName) {
    var activate = Gicon.isEnabled(btnName);
    for (var indx in this.toggleButtons) {
        var name = this.toggleButtons[indx];
        if (activate && (btnName === name)) {
            Gicon.setActive(name, true);
        } else {
            if ((name === 'btnGmapCropTrack') && (this.GMap.selectedMarkerType() != 1)) {
                Gicon.setEnabled(name, false);
            }   else {
                Gicon.setEnabled(name, true);
            }
        }
    }
    return activate;
};

GMapPopup.prototype.setPointInfo = function(marker) {
    var p = marker.point;
    if (p !== undefined) {
        var text = p.lat() + ", " + p.lng() + " - " + p.utcdate;
        $("#gmap_pointinfo").text(text);
    }
};

GMapPopup.prototype.toggleDrawExtent = function(gmap) {
    if ( this.toogleButton("btnGmapDrawExtent") ) {
        this.GMap.addExtentListener();
    } else {
        this.GMap.removeListener();
    }
};

GMapPopup.prototype.togglePlacePoint = function(gmap) {
    if ( this.toogleButton("btnGmapDrawPoint") ) {
        this.GMap.addMarkerListener(false);
        Geof.event.addMapListener(this.setPointInfo);
    } else {
        this.GMap.removeListener();
        Geof.event.removeMapListener(this.setPointInfo);
    }
};

GMapPopup.prototype.toggleSelectClosestPoint = function(gmap) {
    if ( this.toogleButton("btnGmapClosestPoint") ) {
        this.GMap.addMarkerListener(true);
        Geof.event.addMapListener(this.setPointInfo);
    } else {
        this.GMap.removeListener();
        Geof.event.removeMapListener(this.setPointInfo);
    }
};

GMapPopup.prototype.toggleCropTrack= function(gmap) {
    if ( this.toogleButton("btnGmapCropTrack") ) {
        this.GMap.addCropTrackListener();
    } else {
        this.GMap.removeListener();
    }
};

GMapPopup.prototype.setExtentPointCallback = function(callback) {
    if (this.GMap || false ) {
        this.GMap.setExtentCallback(callback);
    }
};

GMapPopup.prototype.initialize_gmap_dialog = function(_this) {
    var gmap_center = null;
    var gmap_zoom = null;
    var gmap_typeId = google.maps.MapTypeId.ROADMAP;

    var center_zoom = localStorage.getItem('map_center_zoom');
    if (center_zoom || false) {
        var val = center_zoom.split(',');
        gmap_center = new google.maps.LatLng(parseFloat(val[0]),parseFloat(val[1]));
        gmap_zoom = parseInt(val[2]);
    }

    var $map = $("#mapHolder")[0];
    _this.GMap = new GoogleMap($map, gmap_center, gmap_zoom, gmap_typeId);

    _this.GMap_Popup = new GMapPopup('mainBody');
    _this.GMap.clearMarkers();
    for (var indx in this.files) {
        _this.findMapData(this.files[indx].id);
    }
};

GMapPopup.prototype.findMapData = function(fileid) {

    var _this = this;
    var cb = function(req) {
        var data = req[0].data;
        var record;
        for (var indx in data) {
            record = data[indx];
            if (record.pointid > 0) {
                _this.addPointMarker(record.id);
            } else if (record.lineid > 0) {
                _this.loadTrackPoints(record.lineid);
            }
        }
    };

    var obj =  {
        "entity":"file",
        "action":"read",
        "data":{
            "columns":"id,originalname,filetype",
            "join":[
                {
                    "entity":"file_point",
                    "join":"outer",
                    "columns":"pointid"
                },
                {
                    "entity":"file_line",
                    "join":"outer",
                    "columns":"lineid"
                }
            ],
            "where":{
                "status":1,
                "id":fileid
            }
        }
    };
    TransMgr.sendNow( GRequest.fromJson(obj), cb);
};

GMapPopup.prototype.loadTrackPoints = function(lineid) {

    var _this = this;
    var cb = function(req) {
        var data = req[0].data;
        var linepoints = [];
        var bounds = new google.maps.LatLngBounds();
        var pWidth = _this.GMap.getDrawRange(2);
        if ("compressed" in data) {
            if (data.linepoints.length === 0) {
                return;
            }
            var lps = data.linepoints.split(',');
            var p;
            var lastp = null;
            for (var lp in lps) {
                p = lps[lp].split(' ');
                var point = new google.maps.LatLng(p[0],p[1]);
                if (lastp != null) {
                    var dist = _this.GMap.getDistance(lastp, point);
                    if (dist > pWidth) {
                        bounds.extend(point);
                        linepoints.push(point);
                        lastp = point;
                    }
                } else {
                    bounds.extend(point);
                    linepoints.push(point);
                    lastp = point;
                }
            }
        } else {
            for (var indx in data) {
                var lp = data[indx];
                p = new google.maps.LatLng(lp.latitude, lp.longitude)
                bounds.extend(p);
                linepoints.push(p);
            }
        }

        var gmap = _this.GMap;
        var lmarker = gmap.addTrack(linepoints, {
                'file':null,
                'fileid':lineid,
                'callback':cb
            }
        );
        _this.GMap.getMap().setCenter( bounds.getCenter());
    };

    var obj =  {
        "entity":"linepoint",
        "action":"read",
        "actionas":"compressed",
        "data":{
            "where":{"lineid":lineid},
            "orderby":[{"column":"ordernum","order":"asc"}]
        }
    };
    TransMgr.sendNow(GRequest.fromJson(obj), cb);
};

GMapPopup.prototype.addTrackMarker = function(track) {

    var _this = this;
    var fileid = ('fileid' in track) ? track.fileid : -1;
    var points = [];
    var p;
    for (var indx in track.points) {
        var lp = track.points[indx];
        p = new google.maps.LatLng(lp.latitude, lp.longitude);
        p.utcdate = track.times[indx];
        points.push(p);
    }
    var gmap = _this.GMap;
    var lmarker = gmap.addTrack(points, {'file':null,'fileid':fileid});
    if (track.bounds || false) {
        lmarker.bounds = track.bounds;
    }
    google.maps.event.addListener(lmarker, 'click', function(event){gmap.selectMarker(lmarker.fileid)});
    Gicon.setEnabled('btnGmapClosestPoint',true);
};

GMapPopup.prototype.addVideoMarker = function(file) {

    var _this = this;
    var fileid = ('fileid' in file) ? file.fileid : -1;
    var points = [];
//    var bounds = new google.maps.LatLngBounds();
    var p, lp;
    var track = file.gpsTracks[0];
    var tpoints = track.points;
    for (var indx in tpoints) {
        var lp = tpoints[indx];
        p = new google.maps.LatLng(lp.latitude, lp.longitude);
        points.push(p);
    }
    var gmap = _this.GMap;
    var lmarker = gmap.addTrack(points, {'file':file,'fileid':fileid});
    if (file.bounds || false) {
        lmarker.bounds = file.bounds;
    }
    var vp = file.vp;
    if (vp || false) {
        var markers = [];
        markers.push(lmarker);
        var times = track.times;
        var clickCB = function(event){
            if ( event.latLng ) {
                var cpoint = gmap.getClosestTrackPoint(markers, event.latLng);
                gmap.setPointMarker(cpoint.latlng);
                file.vp.currentTime = (times[cpoint.index].getTime() - times[0].getTime()) / 1000;;
            }
        };
        google.maps.event.addListener(lmarker, 'click', clickCB);

        if (! (track.offsets || false)) {
            track.offsets = GpsUtil.setTrackOffsets(track);
        }
        var timeupdateCB = function() {
            if (! vp.paused) {
                var curTime = vp.currentTime;
                var offsets = track.offsets
                for (var indx in offsets) {
                    if (offsets[indx]> curTime) {
                        indx = parseInt(indx) - 1;
                        var point = track.points[indx];
                        gmap.setPointMarker(new google.maps.LatLng(point.latitude, point.longitude));
                        break;
                    }
                }
            }
        }

        vp.addEventListener("timeupdate",timeupdateCB, false);
    }
};

GMapPopup.prototype.addPhotoMarker = function(file) {
//    var useImage = Gicon.isActiveIcon("btnSetMapMarker");

    var _this = this;
    var gmap = _this.GMap;
    var options = {
        fileid:file.id,
        name: file.name
    };
    var gps = file.gpsPoint;
    var marker = gmap.addPoint(gps.latitude, gps.longitude,options);
    google.maps.event.addListener(marker, 'click', function(event){gmap.selectMarker(marker.fileid)});
    gmap.setCenter(marker.getPosition());

};

GMapPopup.prototype.addPointMarker = function(fileid) {
//    var useImage = Gicon.isActiveIcon("btnSetMapMarker");

    var _this = this;
    var gmap = _this.GMap;
    var cb = function(req) {
        var data = req[0].data;
        if (data.length === 0) {
            return;
        }
        var record = data[0];
        var options = {
            fileid:fileid,
            name: record.originalname
        };
        var marker = gmap.addPoint(record.latitude, record.longitude,options);
        google.maps.event.addListener(marker, 'click', function(event){gmap.selectMarker(marker)});
        gmap.setCenter(marker.getPosition());
    };

    var obj =  {
        "entity":"file",
        "action":"read",
        "data":{
            "columns":"id,originalname,filename,filesize,status",
            "join":[
                {
                    "entity":"point",
                    "join":"outer",
                    "columns":"id as pointid,latitude,longitude,utcdate"
                }
            ],
            "where":{
                "id":fileid
            }
        }
    };
    TransMgr.sendNow(GRequest.fromJson(obj), cb);
};
