
GoogleMap.MAP_JS_LOCATION = 'https://maps.googleapis.com/maps/api/js';
GoogleMap.MAP_API_KEY = '?key=AIzaSyAebzlNTIv_Dxmo3wbhWm8kVa6-9X71dPA';
GoogleMap.MAP_SENSOR = '&sensor=false';
GoogleMap.MAP_LIBRARIES = '&libraries=geometry';


function GoogleMap(mapdiv, latlng, zoom, mapTypeId) {

    this.center = new google.maps.LatLng(40.552287, -105.076675);
    this.zoom = 12;
    this.typeId = google.maps.MapTypeId.ROADMAP;

    if (latlng != null) {
        this.center = latlng;
    }
    if (zoom != null) {
        this.zoom = zoom;
    }
    if (mapTypeId != null) {
        this.typeId = mapTypeId;
    }

    var options = {
        center: this.center,
        zoom: this.zoom,
        mapTypeId: this.typeId
    };

    this.map = new google.maps.Map(mapdiv, options);
    this.selectedIcon = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    this.icon = 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png';
    this.crop1 = 'http://maps.google.com/mapfiles/kml/paddle/blu-circle-lv.png';
    this.crop2 = 'http://maps.google.com/mapfiles/kml/paddle/red-circle-lv.png';
    this.track_color = "blue";
    this.track_selected_color = "red";

    this.markers = [];
    this.selected_marker = null;
//    this.selected_marker_id = null;
    this.point_marker = null;
    this.crop_data = null;

    this.dragging = false;
    this.drag_rect = null;
    this.drag_ne = null;
    this.drag_sw = null;
    this.drag_start = null;

//    this.setExtent_callback = null;
//    this.select_callback = null;
    this.point_callback = null;
//    this.video_callback = null;
    this.selectClosest = false;
    Geof.event.addFileListener(this.selectMarker);

}

GoogleMap.prototype.setMap = function(map) {
    this.map = map;

    this.drag_rect = new google.maps.Rectangle({
        map: this.map,
        strokeColor:"#0000FF",
        strokeWeight:1
    });
};

GoogleMap.prototype.getMap = function(){
    return this.map;
};

GoogleMap.prototype.resize = function(){
    if (this.map || false) {
        google.maps.event.trigger(this.map, 'resize')
    }
};

GoogleMap.prototype.getCenter = function(){
    return this.map.getCenter();
};

GoogleMap.prototype.setCenter = function(latlng){
    this.map.setCenter(latlng);
};

GoogleMap.prototype.getZoomCenterStr = function(){
    var latlng = this.map.getCenter();
    return latlng.lat() + ',' + latlng.lng() + ',' + this.map.getZoom();
};

GoogleMap.prototype.setZoomCenter = function(latlng, zoom) {
    this.setCenter(latlng);
    this.setZoom(zoom);
};

GoogleMap.prototype.getGoogleBounds = function () {
    return this.map.getBounds();
}

GoogleMap.prototype.getZoom = function(){
    return this.map.getZoom();
};

GoogleMap.prototype.setZoom = function(zoom){
    this.map.setZoom (zoom);
};

GoogleMap.prototype.getDrawRange = function(granularity) {
    var grains = [10240, 20480, 40960];
    if (granularity == null) {
        granularity = 1;
    }
    var value = grains[ granularity ];
    return value / Math.pow( 2, this.map.getZoom());
}

GoogleMap.prototype.getOptions = function () {
    return {
        center: this.getGCenter(),
        zoom: this.getZoom(),
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
}

GoogleMap.prototype.setExtentCallback = function (callback) {
    this.setExtent_callback = callback;
}

GoogleMap.prototype.setPointCallback = function (callback) {
    this.setPoint_callback = callback;
}

GoogleMap.prototype.addMarker = function (marker) {
    if (marker.fileid !== undefined) {
        this.markers[marker.fileid] = marker;
    }
    marker.gmap = this;
    marker.setMap(this.map);
}

GoogleMap.prototype.getMarker = function (id) {
    return this.markers[id];
}

GoogleMap.prototype.zoomToMarker = function (id, zoom, select, donotbubble) {
    if (id in this.markers) {
        var marker = this.markers[id];
        var type = marker.marker_type;
        zoom = (zoom || false);
        if (type === 0) {
            this.map.setCenter(marker.getPosition());
            if (zoom) {
                this.setZoom(zoom);
            }
        } else if (type === 1) {
            var bounds = null;
            if (marker.bounds || false ) {
                bounds = GpsUtil.getGoogleBounds(marker.bounds);
            } else {
                var coordinates = marker.getPath();
                bounds = new google.maps.LatLngBounds();
                for (var i = 0; i < coordinates.length; i++) {
                    bounds.extend(coordinates.getAt(i));
                }
            }
            if (zoom || (bounds || false)) {
                this.map.fitBounds(bounds);
            }
        }
    }
}

GoogleMap.prototype.zoomToMarkers = function () {
    var bounds = new google.maps.LatLngBounds();
    for (var indx in this.markers) {
        var marker = this.markers[indx];
        var type = marker.marker_type;

        if (type == 0) {
            bounds.extend(marker.getPosition());
        } else if (type === 1) {
            if (marker.bounds || false) {
                bounds = GpsUtil.getGoogleBounds(marker.bounds);
            } else {
                var coordinates = marker.getPath();
                for (var i = 0; i < coordinates.length; i++) {
                    bounds.extend(coordinates.getAt(i));
                }
            }
        }
    }
    this.map.fitBounds(bounds);
}

GoogleMap.prototype.fitBounds = function (bounds) {
    this.map.fitBounds(bounds);
}

GoogleMap.prototype.addPoint = function(lat, lng, options) {
    var _this = this;
    var marker_data = {
        position: new google.maps.LatLng(lat, lng),
        title: ('name' in options) ? options.name : 'no title',
        fileid: ('fileid' in options) ? options.fileid : -1,
        marker_type:0,
        icon: ('icon' in options || false) ? options.icon : this.icon,
        gmap:_this,
        isPhoto:options['isPhoto'] || false
    }
    var marker = new google.maps.Marker(marker_data);
    marker.selectCallback = function() {
        Geof.event.fireFileListener(marker);
    }
//    marker.gmap = _this;
    google.maps.event.addListener(marker, 'click', marker.selectCallback);
    this.addMarker(marker);
    return marker;
}

GoogleMap.prototype.addTrack = function (points, options) {
    options = options || {};
    var file =  ('file' in options) ? options.file : null;
    var fileid =  ('fileid' in options) ? options.fileid : -1;
    var color =  ('color' in options) ? options.color : this.getNextColor();
    var weight =  ('weight' in options) ? options.weight : 4;
    var _this = this;

    var lmarker = new google.maps.Polyline({
        path:points,
        strokeColor: color,
        baseColor : color,
        strokeOpacity: 1.0,
        strokeWeight: weight,
        file:file,
        fileid: fileid,
        marker_type:1,
        zIndex:2,
        gmap:_this

    });

    google.maps.event.addListener(lmarker, "click", function(event) {
        Geof.event.fireFileListener(lmarker.fileid);
    });
    this.addMarker(lmarker);
    return lmarker;
}

GoogleMap.cur_color = 255;
GoogleMap.red = 18;
GoogleMap.cur_color = 210;
GoogleMap.green = 210;
GoogleMap.blue = 224;

GoogleMap.prototype.getNextColor = function () {
    GoogleMap.cur_color -= 15;
    if (GoogleMap.cur_color < 10){
        GoogleMap.cur_color = 255;
    }
    var color = JsUtil.rgbToHex(GoogleMap.red, GoogleMap.cur_color, GoogleMap.blue);
    return color;
}

GoogleMap.prototype.selectMarker = function(obj) {
    var marker;
    var fileid;
    if (JsUtil.isObject(obj)) {
        marker = obj;
    } else {
        fileid = obj
        marker = Geof.cntrl.map.gmap.markers[fileid];
    }
    if (marker === undefined) {
        return;
    }
    var _this = marker.gmap;
    _this.unselectMarker(_this);
    var id = ('fileid' in marker) ? marker.fileid : -1;
    _this.selected_marker_id = id;
    _this.selected_marker = marker;
    if (marker.marker_type == 1) {
        marker.setOptions({strokeColor:_this.track_selected_color,zIndex:150});
    } else {
        marker.setZIndex(150);
        if (! (marker['isPhoto'] || false)) {
            marker.setIcon(_this.selectedIcon);
        }
    }
}

GoogleMap.prototype.unselectMarker = function(_this) {
    var marker = _this.selected_marker;
    if (marker != null) {
        marker.setOptions({zIndex:1});
        if (marker.marker_type == 1) {
            marker.setOptions({strokeColor:marker.baseColor});
        } else {
            if (! (marker['isPhoto'] || false)) {
                marker.setIcon(_this.icon);
            }
        }
    }
}

GoogleMap.prototype.selectedMarkerType = function() {
    if (this.selected_marker || false) {
        return this.selected_marker.marker_type;
    } else {
        return -1;
    }
}

GoogleMap.prototype.removeMarker = function (id) {
    if ( id in this.markers) {
        var marker = this.markers[id];
        marker.setMap(null);
        this.markers.splice(id,1);
    }
    if (marker.selectCallback || false) {
        Geof.event.removeFileListener(marker.selectCallback);
    }
}

GoogleMap.prototype.clearMarkers = function () {
    for (var id in this.markers) {
        var marker = this.markers[id];
        if (marker.selectCallback || false) {
            Geof.event.removeFileListener(marker.selectCallback);
        }
        marker.setMap(null);
    }
    this.markers = new Array();
}

GoogleMap.prototype.setPointMarker= function(point, closest) {
    if (point.latlng || false ) {
        if (this.point_marker == null) {
            this.point_marker = new google.maps.Marker(
                {
                    position: point.latlng,
                    icon:new google.maps.MarkerImage(
                        window.location.pathname + "img/symbol/grn-diamond-lv.png",
                        new google.maps.Size(16,16),
                        new google.maps.Point(0, 0),
                        new google.maps.Point(8, 8)
                    ),
                    zIndex: 9999
                }
            );
        } else {
            this.point_marker.setPosition(point.latlng)
        }
        this.point_marker.utcdate = point.utcdate;
        this.point_marker.setMap(this.map);

        if (closest || false) {
            this.point_marker.parent_point = closest;
        }
    } else {

    }
}

GoogleMap.prototype.newMarker=function(url,latlng,size,center,zindex) {
    return new google.maps.Marker(
        {
            position: latlng,
            icon:new google.maps.MarkerImage(
                url,
                new google.maps.Size(size[0],size[1]),
                new google.maps.Point(0, 0),
                new google.maps.Point(center[0],center[1])
            ),
            zIndex: zindex
        }
    );
}

GoogleMap.prototype.getPointMarker = function() {
    return this.point_marker;
}

GoogleMap.prototype.getClosestTrackPoint = function(markers, latlng) {
    var marker = null;
    var loc = {dist: Number.POSITIVE_INFINITY,index:-1,marker:null,latlng:null};

    for (var indx in markers) {
        marker = markers[indx];
        if (marker.marker_type == 1) {
            loc = this.closestPolylinePoint(marker, latlng, loc);
        }
    }
    return loc;
}

GoogleMap.prototype.closestPolylinePoint = function(polyline, latlng, loc) {
    var loc = loc || {dist: Number.POSITIVE_INFINITY,index:-1,marker:null,latlng:null};
    var path = polyline.getPath();

    path.forEach(function(routePoint, index){
        var dist = google.maps.geometry.spherical.computeDistanceBetween(latlng, routePoint);
        if (dist < loc.dist){
            loc.dist = dist;
            loc.index = index;
            loc.marker = polyline;
            loc.latlng = routePoint;
            if ('utcdate' in routePoint) {
                loc.utcdate = routePoint.utcdate;
            }
        }
    });
    return loc;
}

GoogleMap.prototype.removeListener = function(removeReplacement) {
    this.map.setOptions({draggable: true, draggableCursor:'default'});
    google.maps.event.clearListeners(this.map, 'click');
    if (this.removeListenerFunc != null) {
        this.removeListenerFunc();
        this.removeListenerFunc = null;
    }
    if (removeReplacement || false) {
        this.removeListenerFunc = removeReplacement;
    }

}

GoogleMap.prototype.addMarkerListener = function(selectClosest) {
    var _this = this;
    _this.selectClosest = selectClosest || false;
    _this.removeListener();
    _this.removeListenerFunc = function() {
        if (_this.point_marker != null) {
            _this.point_marker.setMap(null);
            _this.point_marker = null;
        }

        if (_this.point_callback) {
            _this.point_callback(null);
        }
    };

    _this.map.setOptions({draggable: false, draggableCursor:'crosshair'});

    google.maps.event.addListener(this.map, "click", function(event) {
        if ( event.latLng ) {
            var lat = event.latLng.lat();
            var lng = event.latLng.lng();

            if (_this.point_marker != null) {
                _this.point_marker.setMap(null);
            }
            var point = {};
            if (_this.selectClosest) {
                point = _this.getClosestTrackPoint(_this.markers, event.latLng);
                _this.setPointMarker(point, point);
            } else {
                point.latlng = new google.maps.LatLng(lat,lng);
                point.utcdate = null;
                _this.point_marker = new google.maps.Marker(
                    {
                        position: point.latlng,
                        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                        zIndex: 9999
                    }
                );
                _this.point_marker.setMap(_this.map);
            }

            if (_this.setPoint_callback) {
                _this.setPoint_callback(_this.point_marker);
            }
            Geof.event.fireMapListener({point:point.latlng});

        }
     });
},

GoogleMap.prototype.addClosestTrackListener = function(marker, callback) {
    var _this = this;
    _this.removeListener();
    _this.map.setOptions({draggable: false, draggableCursor:'crosshair'});

    google.maps.event.addListener(this.map, "click", function(e) {
        if ( e.latLng ) {
            callback(_this.closestPolylinePoint(marker, e.latLng).index);
        }
    });
},

GoogleMap.prototype.addExtentListener = function() {
    var _this = this;
    _this.removeListener();
    _this.removeListenerFunc = function() {
        google.maps.event.clearListeners(_this.map, 'mousedown');
        google.maps.event.clearListeners(_this.map, 'mousemove');
        google.maps.event.clearListeners(_this.map, 'mouseup');
        if (_this.drag_rect != null) {
            google.maps.event.clearListeners(_this.drag_rect, 'mouseup');
            _this.drag_rect.setMap(null);
        }
    }
    
    _this.map.setOptions({draggable: false, draggableCursor:'crosshair'});
    
    google.maps.event.addListener(_this.map, 'mousedown', function(mEvent) {
        _this.map.draggable = false;
        _this.drag_start = mEvent.latLng;
        if (_this.drag_rect != null) {
            _this.drag_rect.setMap(null);
        }
        if (_this.drag_rect.getMap() == null) {
            _this.drag_rect.setMap(_this.map);
        }
        _this.dragging = true;
    });

    google.maps.event.addListener(_this.map, 'mousemove', function(mEvent) {
        if (_this.dragging) {
            if (_this.drag_start.lng() < mEvent.latLng.lng()) {
                if (_this.drag_start.lat() < mEvent.latLng.lat()) {
                    _this.drag_ne = mEvent.latLng;
                    _this.drag_sw = _this.drag_start;
                } else {
                    _this.drag_ne = new google.maps.LatLng(_this.drag_start.lat(), mEvent.latLng.lng());
                    _this.drag_sw = new google.maps.LatLng(mEvent.latLng.lat(), _this.drag_start.lng());
                }

            } else {
                if (_this.drag_start.lat() < mEvent.latLng.lat()) {
                    _this.drag_ne = new google.maps.LatLng(mEvent.latLng.lat(), _this.drag_start.lng());
                    _this.drag_sw = new google.maps.LatLng(_this.drag_start.lat(), mEvent.latLng.lng());

                } else {
                    _this.drag_ne = _this.drag_start;
                    _this.drag_sw = mEvent.latLng;
                }
            }
            _this.drag_rect.setBounds(new google.maps.LatLngBounds( _this.drag_sw, _this.drag_ne ));
            Geof.event.fireMapListener({extent:_this.drag_rect.getBounds()});
        }
    });

    google.maps.event.addListener(_this.map, 'mouseup', function(mEvent) {
        _this.map.draggable = true;
        _this.dragging = false;
    });

    if (_this.drag_rect == null) {
        _this.drag_rect = new google.maps.Rectangle({
            map: _this.map,
            strokeColor:"#0000FF",
            strokeWeight:1
        });
    }

    google.maps.event.addListener(_this.drag_rect, 'mouseup', function(data){
        _this.map.draggable = true;
        _this.dragging = false;
    });
}

GoogleMap.prototype.addCropTrackListener = function() {
    var _this = this;
    _this.removeListener();
    _this.crop_data = {
        marker1:null,
        marker2:null,
        curMarker:1
    }
    var cd = _this.crop_data;

    _this.removeListenerFunc = function() {
        if (cd.marker1 || false) {
            cd.marker1.setMap(null);
        }
        if (cd.marker2 || false) {
            cd.marker2.setMap(null);
        }
        delete(_this.crop_data);
        _this.crop_data = null;
    };

    _this.map.setOptions({draggable: false, draggableCursor:'crosshair'});

    google.maps.event.addListener(this.map, "click", function(event) {
        if (!( event.latLng || false)) {
            return;
        }
        var markers = [];
        markers.push(_this.selected_marker);
        var loc = _this.getClosestTrackPoint(markers, event.latLng);
        var marker = cd['marker' + cd.curMarker];
        if (marker == null) {
            marker = _this.newMarker(_this['crop' + cd.curMarker],loc.latlng,[16,16],[8,8],999);
            marker.setMap(_this.map);
        }else {
            marker.setPosition(loc.latlng)
        }
        cd['marker' + cd.curMarker] = marker;
        cd.curMarker = 3 - cd.curMarker;
    });
}

GoogleMap.prototype.getDistance = function(latlng1, latlng2) {
    var point1 = this.map.getProjection().fromLatLngToPoint(latlng1);
    var point2 = this.map.getProjection().fromLatLngToPoint(latlng2);
    var dX = point1.x - point2.x;
    var dY = point1.y - point2.y;
    var dist = Math.sqrt((dX * dX) + (dY * dY)) * 10000;
//    Geof.log("distance: " + dist);
    return dist;
}

GoogleMap.getMapUrl = function(callback) {
    return this.MAP_JS_LOCATION + this.MAP_API_KEY + this.MAP_SENSOR + this.MAP_LIBRARIES;
};

GoogleMap.isValidLatLng = function(strLatLng) {
    if (strLatLng == null || strLatLng.length === 0) {
        return false;
    }
    var coordinate = strLatLng.split(',');

    if (coordinate.length < 2) {
        return false;
    }
    var lat = parseFloat(coordinate[0]);
    var lng = parseFloat(coordinate[1]);
    if ((lat === NaN) || (lng === NaN)) {
        return false;
    }
    if ((lat < -90.0) || (lat > 90.0)) {
        return false;
    }
    if ((lng < -180.0) || (lng > 180.0)) {
        return false;
    }
    return true;
}

