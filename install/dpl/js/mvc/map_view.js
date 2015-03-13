/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 4/22/13
 * Time: 1:18 PM
 */


var Geof = Geof || {};

Geof.cntrl.map = {

    name:'map',
    center:null,
    zoom:null,
    typeId: google.maps.MapTypeId.ROADMAP,
    file_tmpl : '<li class="ui-widget-content" data-id="%id">'
        + '<label class="">%originalname</label>'
        + '<label class="floatRight">%id</label></li>',

    line_tmpl : '<li class="ui-widget-content" data-id="%lineid">'
            +' <label>%originalname</label><label class="floatRight">%pointcount</label></li>',

    gmap:null,
    videoMarker : null,
    container_width:0,

    initialize: function() {
        var _this = Geof.cntrl.map;
        var center_zoom = localStorage.getItem('map_center_zoom');
        if (center_zoom || false) {
            var val = center_zoom.split(',');
            _this.center = new google.maps.LatLng(parseFloat(val[0]),parseFloat(val[1]));
            _this.zoom = parseInt(val[2]);
        }

        var $map = $("#mapViewCanvas")[0];
        _this.gmap = new GoogleMap($map, _this.center, _this.zoom, _this.typeId);

        google.maps.event.addListener(_this.gmap.getMap(), 'center_changed', function(event) {
            _this.setBounds();
        });

        Gicon.click("btnSaveBounds",function() {
            var center_zoom = GMap.getZoomCenterStr();
            localStorage.setItem('map_center_zoom', center_zoom);
        });

        Gicon.click("btnCopyExtent",function() {
            alert("implementation missing btnCopyExtent");
        });

        Gicon.toggle("btnShowPhoto");
        Gicon.toggle("btnSetMapMarker", _this.loadList);

        $("#btnCntrlMapDrawPoint").click(function() {
            _this.togglePlacePoint();
        });

        $("#btnCntrlMapDrawExtent").click(function() {
            _this.toggleDrawExtent();
        });

        _this.gmap.setExtentCallback(_this.setExtent);
        $('.buttonBar').tooltip();

        _this.timecntrl = Geof.timecntrl;
        _this.timecntrl.setStage('timecntrl');
        _this.timecntrl.clickCallback = _this.selectListItem;

        _this.loadList();

        var icoUrl = window.location.pathname + "img/symbol/grn-diamond-lv.png"
        _this.videoMarker = new google.maps.Marker({
            icon: new google.maps.MarkerImage(
                icoUrl,
                new google.maps.Size(16,16),
                new google.maps.Point(0, 0),
                new google.maps.Point(8, 8)
            ),
            zindex: 20
        });

        Geof.cntrl.map.gmap.addMarker(_this.videoMarker);
        Geof.event.addFileListener(_this.selectItem);
    },

    resize:function() {
        var _this = Geof.cntrl.map;
        var parent = $("#mapview_container").parent();
        var remainder = parent.width() - $("#mapList").width() - 16;
        $("#mapViewCanvas").width (remainder);
        if (Geof.cntrl.map.gmap) {
            Geof.cntrl.map.gmap.resize();
        }
        if (_this.timecntrl || false) {
            $("#timecntrl").width (remainder);
            _this.timecntrl.resize();
        }
    },

    loadList: function (results, refreshAction) {
        var _this = Geof.cntrl.map;

        if (results || false) {
            _this.data = results;
        } else {
            _this.data = Geof.cntrl.search.results;
        }
        if (refreshAction || false) {
            _this.refresh = refreshAction;
        } else {
            _this.refresh = Geof.cntrl.search.execute;
        }

        _this.gmap.clearMarkers();
        var $ol = $('#olGMapFileList');
        $ol.empty();

        if ((! _this.data) || _this.data.length == 0) {
            return;
        }

        var gps_list = [];
        for (var indx in _this.data) {
            var record = _this.data[indx];
            if ('gpsTrack' in record && record.gpsTrack.points.length > 0) {
                   _this.createTrackMarker(record);
            } else if ('gpsPoint' in record && record.gpsPoint.latitude !== undefined) {
                  _this.createPointMarker(record);

            }else {
                gps_list.push(record);
            }
            $ol.append( Templatetor.mergeDftTemplate (record,_this.file_tmpl));
        }

        _this.getGpsData(gps_list);

        $ol.selectable({
            stop: function() {
                var selected = $( ".ui-selected", this );
                if (selected.length == 1) {
                    Geof.event.fireFileListener( $(selected[0]).data('id') );
                }
            }
        });
        _this.timecntrl.setData(_this.data, 'createdate');

    },

    selectItem:function(id) {
        var _this = Geof.cntrl.map;
        id = JsUtil.isArray(id) ? id[0] : id ;
        $('#olGMapFileList .ui-selected').removeClass('ui-selected');
        $('#olGMapFileList').children('li').each(function() {
            if ($(this).data('id') == id) {
                $(this).addClass('ui-selected');
            }
        });

        if (Gicon.isActive("btnShowPhoto")) {
            _this.showPopup(id);
        }
        Geof.cntrl.map.zoomToFileLocation(id);
    },

    showPopup:function(id) {
        var _this = Geof.cntrl.map;

        var file = _this.getFile(id);
        var options = null;
        if ((file.geomtype === 1) && (file.gpsTrack || false)) {
            var offsets = file.gpsTrack.timeoffsets || [];
            var points = file.gpsTrack.points;

            var syncCB = function(time) {
                var indx = 0;
                while (indx < offsets.length && offsets[indx] <= time ) {
                    indx++;
                }
                if (indx < offsets.length) {
                    indx--;
                    _this.videoMarker.setVisible(true);
                    _this.videoMarker.setPosition(points[indx]);
                }
            }

            var callback = function(vp) {
                file.video = vp;
                var vcb = function(index) {
                    _this.videoMarker.setPosition(points[index]);
                    vp.currentTime = offsets[index];
                }

                _this.videoMarker.setVisible(true);
                _this.videoMarker.setPosition(points[0]);
                var tMarker =_this.gmap.getMarker(id);
                _this.gmap.addClosestTrackListener(tMarker,vcb);
            }

            var closeCB = function() {
                file.video = null;
                _this.videoMarker.setVisible(false);
                _this.gmap.removeListener();
            }
            options = {modal:false,callback:callback, syncCB:syncCB, closeCB:closeCB};
        }
        Filetypes.showPopupById(id,options);

    },

    zoomToFileLocation:function(id) {
        var donotbubble = true
        Geof.cntrl.map.gmap.zoomToMarker(id, null, true, donotbubble);
    },

    getFile:function(id) {
        var data = Geof.cntrl.map.data;
        for (var indx in data) {
            if (data[indx].id === id) {
                return data[indx];
            }
        }
        return null;
    },

    getGpsData:function(data) {
        var _this = Geof.cntrl.map;
        if (data.length == 0) {
            _this.gmap.zoomToMarkers();
            return;
        }
        var rowmap = {};
        var trans = new Transaction(Geof.session);

        var cb = function(requests) {
            for (var indx in requests) {
                var request = requests[indx];
                var row = rowmap[request.requestid];
                var data = request.data[0];
                if (request.entity == 'linepoint') {
                    var tracks = GpsUtil.convertJsonToTracks(request.data);
                    var track = tracks[0];
                    track.complete = true;
                    var file = {
                        video : null,
                        id: row.id,
                        gpsTrack: track
                    };
                    _this.createTrackMarker(file);
                } else if (request.entity == 'file_point') {
                    row.gpsPoint = {
                        latitude:data.latitude,
                        longitude:data.longitude,
                        utcdate:data.utcdate
                    }
                    Geof.cntrl.map.createPointMarker(row);
                }
            }
            _this.gmap.zoomToMarkers();
        }

        var req;
        for (var indx in data) {
            var row = data[indx];
            if (row.geomtype == 0) {
                if ('gpsPoint' in row && row.gpsPoint.latitude != undefined) {
                    Geof.cntrl.map.createPointMarker(row);
                } else {
                    var json = {"entity":"file_point","action":"read",
                        "data":{
                            "join":[{"entity":"point","join":"parent","columns":"id,latitude,longitude,utcdate"}]
                            ,"where":{"fileid":row.id}
                        }
                    };
                    req = GRequest.fromJson(json);
                    rowmap[req.requestid] = row;
                    trans.addRequest(req , null);
                }

            } else if (row.geomtype == 1) {
                if ('gpsTrack' in row && !row.gpsTrack.complete ) {
                    var json = {"entity":"linepoint","action":"read",
                        "data":{
                            "where":{"fileid":row.id},
                            "columns":"ordernum,latitude,longitude,utcdate,timeoffset,distance",
                            "orderby":"ordernum"
                        }
                    };
                    req = GRequest.fromJson(json);
                    rowmap[req.requestid] = row;
                    trans.addRequest(req , null);
                }
            }
        }
//        trans.setLastCallback(cb);
        trans.send(cb);
    },

    createPointMarker : function(file) {
        var _this = Geof.cntrl.map;
        var gmap = _this.gmap;
        var fileid = file.id;
        var p = file.gpsPoint;

        var options = {
            fileid:fileid,
            name: file.originalname,
            gmap:gmap
        };

        if (Gicon.isActive("btnSetMapMarker") && file.filetype == Filetypes.PHOTO) {
            options['icon'] =  gs.url + '?size=1&id=' + fileid  + '&sessionid=' + Geof.session.sessionId;
            options['isPhoto'] = true
        }
        Geof.cntrl.map.gmap.addPoint(p.latitude, p.longitude, options);

    },

    createTrackMarker: function(file) {
        try {
            var _this = Geof.cntrl.map;
            var gmap = _this.gmap;
            file.video = null;

            var lmarker = null;

            var cb = function(event) {
                var loc = {
                    minDistance: 9999999999, //silly high
                    index : -1
                };
                lmarker.getPath().forEach(function(routePoint, index){
                    var dist = google.maps.geometry.spherical.computeDistanceBetween(event.latLng, routePoint);
                    if (dist < loc.minDistance){
                        loc.minDistance = dist;
                        loc.index = index;
                    }
                });
                lmarker.file.gps.selectedIndex = loc.index;
                if (lmarker.file.video != null) {
                    var point = lmarker.file.gps[loc.index];
                    lmarker.file.video.currentTime = point.timeoffset;
                }
            };

            var options = {
                'file':file,
                'fileid':file.id,
                'callback':cb,
                gmap:Geof.cntrl.map.gmap
            }
            lmarker = gmap.addTrack(file.gpsTrack.points, options);
            file.track = lmarker;
        } catch(e) {
            Geof.log(e);
        }

    },

    setBounds: function () {
        $('#gmap_bounds').html(
            Geof.cntrl.map.formatGmapBounds(
                Geof.cntrl.map.gmap.getGoogleBounds(),4
            )
        );
    },

    setExtent: function (bounds) {
        $('#gmap_extent').html(
            Geof.cntrl.map.formatGmapBounds(bounds,3)
        );
    },

    formatGmapBounds:function (bounds, decimal) {
        if (! (bounds || false)) {
            return;
        }

        var _dec = 3;
        if (decimal || false) {
            _dec = decimal;
        }
        var ne = bounds.getNorthEast();
        var sw = bounds.getSouthWest();
        return "(" + parseFloat(ne.lat()).toFixed(_dec)
            + ", " + parseFloat(ne.lng()).toFixed(_dec) + ") - ("
            + parseFloat(sw.lat()).toFixed(_dec)
            + ", " + parseFloat(sw.lng()).toFixed(_dec) + ")";
    },

    toggleDrawExtent : function() {
        Geof.cntrl.map.gmap.removeListener();
        if (Gicon.isEnabled("btnCntrlMapDrawExtent")) {
            Gicon.setActive("btnCntrlMapDrawExtent", true);
            Geof.cntrl.map.gmap.addExtentListener();
            Gicon.setEnabled("btnCntrlMapDrawPoint", true);
        } else  {
            Gicon.setEnabled("btnCntrlMapDrawExtent", true);
        }
    },

    togglePlacePoint : function() {
        Geof.cntrl.map.gmap.removeListener();
        if (Gicon.isEnabled("btnCntrlMapDrawPoint")) {
            Gicon.setActive("btnCntrlMapDrawPoint", true);
            Geof.cntrl.map.gmap.addMarkerListener();
            Gicon.setEnabled("btnCntrlMapDrawExtent", true);

        } else  {
            Gicon.setEnabled("btnCntrlMapDrawPoint", true);
        }
    }
}
