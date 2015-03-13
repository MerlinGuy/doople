var GpsUtil = (function () {

    return {
        POINT:0,
        TRACK:1,
        LINE:1,
        POLYGON:2,

        convertLatitude:function (GPSLatitude, GPSLatitudeRef) {
            var sign = ((GPSLatitudeRef) && (GPSLatitudeRef.toUpperCase() == "S")) ? -1 : 1;

            if ((GPSLatitude) && (GPSLatitude.length == 3)) {
                return (sign * (GPSLatitude[0]
                    + (GPSLatitude[1] / 60)
                    + (GPSLatitude[2] / 3600))).toFixed(6);
            } else {
                return 0;
            }

        },

        convertLongitude:function (GPSLongitude, GPSLongitudeRef) {
            var sign = ((GPSLongitudeRef) && (GPSLongitudeRef.toUpperCase() == "W")) ? -1 : 1;

            if ((GPSLongitude) && (GPSLongitude.length == 3)) {
                return (sign * (GPSLongitude[0]
                    + (GPSLongitude[1] / 60)
                    + (GPSLongitude[2] / 3600))).toFixed(6);
            } else {
                return 0;
            }
        },

        convertGpsTime:function (GPSTimeStamp) {
            if ((GPSTimeStamp) && (GPSTimeStamp.length == 3)) {
                return JFormat.lpad(GPSTimeStamp[0], '0', 2)
                    + ":" + JFormat.lpad(GPSTimeStamp[1], '0', 2)
                    + ":" + JFormat.lpad(GPSTimeStamp[2], '0', 2);
            } else {
                return "00:00:00";
            }
        },

        convertAltitude:function (GPSAltitude, GPSAltitudeRef) {
            return GPSAltitude * ((GPSAltitudeRef > 0) ? GPSAltitudeRef : 1);
        },

        convertAzimuth:function () {
            return 0;
        },

        hasGpsTags:function (tags) {
            try {
                return  (tags.GPSLatitude) && (tags.GPSLatitude.length == 3)
                    && (tags.GPSLongitude) && (tags.GPSLongitude.length == 3)
                    && (tags.GPSTimeStamp) && (tags.GPSTimeStamp.length == 3)
                    && (tags.GPSDateStamp) && (tags.GPSDateStamp.length > 0);
            } catch (e) {
                return false;
            }
        },

        getGpsDecimal:function (tags) {
            var gps = {};
            if (GpsUtil.hasGpsTags(tags)) {
                var date = tags.GPSDateStamp.replace(new RegExp(':', "g"), '-');
                gps.latitude = GpsUtil.convertLatitude(tags.GPSLatitude, tags.GPSLatitudeRef);
                gps.longitude = GpsUtil.convertLongitude(tags.GPSLongitude, tags.GPSLongitudeRef);
                gps.datetime = date + ' ' + GpsUtil.convertGpsTime(tags.GPSTimeStamp);
                gps.altitude = GpsUtil.convertAltitude(tags.GPSAltitude, tags.GPSAltitudeRef);
            }
            return gps;
        },

        convertJsonToTracks:function (data) {
            var tracks = [];
            var track = {
                'start':null,
                'end':null,
                'distance':'',
                'points':[],
                'times':[],
                'timeoffsets':[],
                'bounds':new google.maps.LatLngBounds(),
                complete:true
            }

            var row, point;
            for (var indx in data) {
                row = data[indx];
                point = new google.maps.LatLng(row.latitude, row.longitude);
                track.points.push(point);
                track.bounds.extend(point);
                track.times.push(DateUtil.parseDate(row.utcdate));
                track.timeoffsets.push('timeoffset' in row ? row.timeoffset : 0.0);
            }
            track.distance = google.maps.geometry.spherical.computeLength(track.points);
            tracks.push(track);
            return tracks;
        },

        readTrackFiles:function (trackFiles, callback) {
            var tracks = [];
            if (trackFiles.length > 0) {
                var readFile = null;
//        Geof.log('file count: ' + trackFiles.length);
                var tFile = null;

                var collectTracks = function (rtnTracks) {
                    for (var rIndx in rtnTracks) {
                        var track = rtnTracks[rIndx];
                        track.fileid = tFile.fileid;
                        track.file = tFile;
                        tFile.gpsTracks.push(track);
                        if ('error' in track) {
                            //TODO: handle error alert here
                            alert(track.error);
                        } else {
                            tracks.push(track);
                        }
                    }
//            Geof.log('track count: ' + tracks.length);
                    if (trackFiles.length > 0) {
                        readFile();
                    } else if (tracks.length > 0) {
                        callback(tracks);
                    } else {
                        alert(",readTrackFile - No tracks found");
                    }
                }

                readFile = function () {
                    tFile = trackFiles.pop();
                    tFile.gpsTracks = [];
                    var reader = Filetypes.getReader(tFile.name);
                    if (reader != null) {
                        reader = new this[reader]();
                        reader.readFile(tFile, collectTracks);
                    }
                }
                readFile();
            } else {
                callback();
            }
        },

        readTrackFile:function (trackFile, callback) {
            var tracks = [];
            if (trackFile || false) {
                var readFile = null;
//        Geof.log('file count: ' + trackFiles.length);

                var collectTracks = function (rtnTracks) {
                    for (var rIndx in rtnTracks) {
                        var track = rtnTracks[rIndx];
                        track.fileid = trackFile.id;
                        trackFile.gpsTracks.push(track);
                        if ('error' in track) {
                            //TODO: handle error alert here
                            alert(track.error);
                        } else {
                            tracks.push(track);
                        }
                    }
                    trackFile.createdate = GpsUtil.getTrackCreatedate(trackFile);
                    callback(tracks);
                }

                trackFile.gpsTracks = [];
                var reader = Filetypes.getReader(trackFile.name);
                if (reader != null) {
                    var fn = (window || this);
                    reader = new fn[reader]();
                    reader.readFile(trackFile, collectTracks);
                } else {
                    callback([]);
                }
            } else {
                callback([]);
            }

        },

        isValidGps:function (gps) {
            if (!(gps || false)) {
                return false;
            }
            if (!(gps.latitude || false)) {
                return false;
            }
            if (gps.latitude < -90 || gps.latitude > 90) {
                return false
            }
            if (!(gps.longitude || false)) {
                return false;
            }
            if (gps.longitude < -180 || gps.longitude > 180) {
                return false
            }
            return DateUtil.isValidDate(gps.datetime)
        },

        isValidLatLng:function (lat, lng) {
            if (!(lat || false)) {
                return false;
            }
            if (lat < -90 || lat > 90) {
                return false
            }
            if (!(lng || false)) {
                return false;
            }
            if (lng < -180 || lng > 180) {
                return false
            }
            return true;
        },

        setFileCreatedate:function (file, createdate, adjustGMT) {
            if (createdate || false) {
                file.createdate = createdate;
                return;
            }
            createdate = (file.createdate || false) ? file.createdate : DateUtil.getFileDate(file);
            if (!(createdate || false)) {
                return;
            }
            if (Object.prototype.toString.call(createdate) !== '[object Date]') {
                createdate = DateUtil.parseDate(createdate);
            }
            if (adjustGMT) {
                createdate = new Date(createdate.valueOf() + createdate.getTimezoneOffset() * 60000);
            }
            file.createdate = createdate;
        },

        matchPhotoToTrack:function (options, adjustGMT) {
            var photos = options.photos;
            var tracks = options.tracks;
            for (var pIndx in photos) {
                var photo = photos[pIndx];
                GpsUtil.setFileCreatedate(photo, null, adjustGMT);
                if (!(photo.createdate || false)) {
                    continue;
                }
                var createMillis = photo.createdate.getTime();
                var matched = false;
                var createdate;
                for (var tIndx in tracks) {
                    var points = tracks[tIndx].points;
                    var times = tracks[tIndx].times;
                    var first = times[0].getTime();
                    var last = times[times.length - 1].getTime();
                    if (createMillis < first || createMillis > last) {
                        continue;
                    }
                    for (var indx in times) {
                        createdate = times[indx];
                        if (createMillis <= createdate.getTime()) {
                            var nextTime = times[indx];
                            var gps = {};
                            if (indx > 0) {
                                var prevTime = times[indx - 1];
                                var fraction = (createMillis - prevTime) / (nextTime - prevTime);
                                var nextPoint = points[indx];
                                nextPoint = new google.maps.LatLng(nextPoint.latitude, nextPoint.longitude)
                                var prevPoint = points[indx - 1];
                                prevPoint = new google.maps.LatLng(prevPoint.latitude, prevPoint.longitude)
                                p = google.maps.geometry.spherical.interpolate(prevPoint, nextPoint, fraction);
                                gps.latitude = p.lat();
                                gps.longitude = p.lng();

                            } else {
                                gps.latitude = points[indx].latitude;
                                gps.longitude = points[indx].longitude;
                            }
                            gps.datetime = createdate;
                            photo.createdate = createdate;
                            photo.gpsPoint = gps;
                            matched = true;
                            break;
                        }
                    }
                    if (matched) {
                        break;
                    }
                }
            }
            return options;
        },

        getBoundsFromTrack:function (track) {
            var b = track.bounds;
            var bounds;
            if ((b || false) && (b.minlat || false) && b.minlat != null) {
                var ne = new google.maps.LatLng(b.maxlat, b.maxlng);
                var sw = new google.maps.LatLng(b.minlat, b.minlng)
                bounds = new google.maps.LatLngBounds(sw, ne);

            } else {
                var points = track.points;
                bounds = new google.maps.LatLngBounds();
                for (var i = 0; i < points.length; i++) {
                    var p = points[i];
                    bounds.extend(new google.maps.LatLng(p.latitude, p.longitude));
                }
            }
            return bounds;
        },

        getGoogleBounds:function (gbounds) {
            var bounds = null;
            if (gbounds || false) {
                var ne = new google.maps.LatLng(gbounds.maxlat, gbounds.maxlng);
                var sw = new google.maps.LatLng(gbounds.minlat, gbounds.minlng)
                bounds = new google.maps.LatLngBounds(sw, ne);

            }
            return bounds;
        },

        getTrackCreatedate:function (file) {
            var createmillis = null;
            if ((file.gpsTracks || false) && (file.gpsTracks.length > 0)) {
                var tracks = file.gpsTracks;
                var times;
                var millis
                for (var indx in tracks) {
                    times = tracks[indx].times;
                    if ((times || false) && (times.length > 0)) {
                        millis = times[0].getTime();
                        if (createmillis == null || millis < createmillis) {
                            createmillis = millis;
                        }
                    }
                }
            }
            return createmillis != null ? new Date(createmillis) : createmillis;
        },

        getSubTrack:function (track, index, duration, offset) {
            offset = offset || 0;

            var times = track.times;
            var points = track.points;
            var start = index;

            var millis = times[index].getTime() - (offset * 1000);

            while ((times[start].getTime() > millis) && (start > -1)) {
                start--;
            }

            if (start == -1) {
                //Todo: time is off at the front of the track
                return null;
            }

            millis = times[start].getTime() + (duration * 1000);
            var end = start;
            var len = times.length;
            while ((times[end].getTime() < millis) && (end < len)) {
                end++;
            }

            if (end == len) {
                //Todo: time is off the end of the track
                return null;
            }
            var subTrack = {points:[], times:[]};
            var p, t;
            while (start <= end) {
                p = points[start];
                t = times[start];
                p.utcdate = t;
                subTrack.points.push(p);
                subTrack.times.push(t);
                start++;
            }
            return subTrack;
        },

        getVideoSubTrack:function (track, videofile) {

            if (videofile.createdate === undefined || videofile.duration === undefined){
                return null;
            }
            var duration = videofile.duration;

            var createdate = DateUtil.parseDate(videofile.createdate,null,null);
            createdate = DateUtil.convertToGMT(createdate);
            var vStart = createdate.getTime();
            var vEnd = vStart + (videofile.duration * 1000);

            var times = track.times;
            var trackStartMillis = times[0].getTime();
            var trackEndMillis = times[times.length-1].getTime();

            if (vStart < trackStartMillis || vStart > trackEndMillis) {
                return null;
            }

            var afterStart = false;
            var startTime = null;
            var startIndx = null;
            var endTime = null;
            var endIndx = null;
            var fulltrack = false;
            var millis;
            for (var indx in times) {
                millis = times[indx].getTime();
                if (afterStart) {
                    if (vEnd <= millis) {
                        endTime = millis;
                        endIndx = parseInt(indx);
                        fulltrack = true;
                        break;
                    }
                } else {
                    if (vStart <= millis) {
                        startTime = millis;
                        startIndx = parseInt(indx);
                        afterStart = true;
                    }
                }
            }

            if (! fulltrack) {
                return null;
            }

            var points = track.points;

            var subTrack = {points:[], times:[]};
            var prev = times[startIndx - 1];
            var fraction = (vStart - prev) / (startTime - prev);
            var p,t;
            p = GpsUtil.interpolate(points[startIndx-1], points[startIndx],fraction);
            p.utcdate = vStart;
            subTrack.points.push(p);
            subTrack.times.push(new Date(vStart));

            //Push the interim points into the array
            for (var indx = startIndx + 1; indx < endIndx; indx++) {
                p = points[start];
                t = times[start];
                p.utcdate = t;
                subTrack.points.push(p);
                subTrack.times.push(t);
            }

            prev = times[endIndx - 1];
            var fraction = (vEnd - prev) / (endTime - prev);
            p = GpsUtil.interpolate(points[endIndx - 1], points[endIndx],fraction);
            p.utcdate = vEnd;
            subTrack.points.push(p);
            subTrack.times.push(new Date(vEnd));
            return subTrack;
        },

        interpolate:function(p1,p2,fraction) {
            var latlon1 = new google.maps.LatLng(p1.latitude, p1.longitude);
            var latlon2 = new google.maps.LatLng(p2.latitude, p2.longitude);
            var ll = google.maps.geometry.spherical.interpolate(latlon1,latlon2, fraction);
            return {latitude:ll.lat(),longitude:ll.lng()}
        },

        getGooglePoints:function (track, start, end) {
            start = start || 0;
            end = end || track.points.length;
            var tpoints = track.points;
            end = end || tpoints.length;

            var points = [];
            var p;
            for (var indx = start; indx < end; indx++) {
                p = tpoints[indx];
                points.push(new google.maps.LatLng(p.latitude, p.longitude));
            }
            return points;
        }, setTrackOffsets:function (track) {
            var offsets = [];
            var times = track.times;
            var start = times[0].getTime();
            for (var indx in times) {
                offsets.push((times[indx].getTime() - start) / 1000);
            }
            return offsets;
        },

        trackDistances:function (track) {
            var distances = [];
            var min = Number.POSITIVE_INFINITY;
            var max = 0;
            distances.push[0];
            var points = track.points;
            var len = points.length;
            var p1, dist;
            var p2 = points[0];
            p2 = new google.maps.LatLng(p2.latitude, p2.longitude);
            for (var indx = 1; indx < len; indx++) {
                p1 = points[indx];
                p1 = new google.maps.LatLng(p1.latitude, p1.longitude);
                dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
                if (dist > max) {
                    max = dist;
                }
                if (dist < min) {
                    min = dist;
                }
                distances.push(dist);
                p2 = p1;
            }
            return {'items':distances, 'max':max, 'min':min};
        },

        trackSpeeds:function (track, max_speed) {
            var speeds = [];
            var min = Number.POSITIVE_INFINITY;
            var max = 0;
            speeds.push[0];
            var points = track.points;
            var len = points.length;
            var p1, dist, speed;
            var p2 = points[0];
            var t = track.times;

            p2 = new google.maps.LatLng(p2.latitude, p2.longitude);
            for (var indx = 1; indx < len; indx++) {
                p1 = points[indx];
                p1 = new google.maps.LatLng(p1.latitude, p1.longitude);
                dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
                var secs = (t[indx].getTime() - t[indx - 1].getTime()) / 1000;
                speed = dist / secs;
                if (speed > max_speed) {
                    speed = max_speed;
                }
                if (speed > max) {
                    max = speed;
                }
                if (speed < min) {
                    min = speed;
                }
                speeds.push(speed);

                p2 = p1;
            }
            return {'items':speeds, 'max':max, 'min':min};
        }, trackTimes:function (track, max_time) {
            var times = [];
            times.push[0];
            var min = Number.POSITIVE_INFINITY;
            var max = 0;
            var t = track.times;
            var len = t.length;
            var t2 = t[0];
            var t1;
            var secs;

            for (var indx = 1; indx < len; indx++) {
                t1 = t[indx];
                secs = (t1.getTime() - t2.getTime()) / 1000;
                if (secs > max_time) {
                    secs = max_time;
                }

                if (secs > max) {
                    max = secs;
                }
                if (secs < min) {
                    min = secs;
                }
                times.push(secs);
                t2 = t1;
            }
            return {'items':times, 'max':max, 'min':min};
        },

        getBoundedTrack:function (track, bounds) {
            var subtrack = {points:[], times:[]};
            var ne = bounds.getNorthEast();
            var sw = bounds.getSouthWest();
            var maxLat = ne.lat();
            var maxLng = ne.lng();
            var minLat = sw.lat();
            var minLng = sw.lng();
            var p;
            var points = track.points
            for (var indx in points) {
                p = points[indx];
                if ((p.latitude >= minLat) && (p.latitude <= maxLat)
                    && (p.longitude >= minLng) && (p.longitude <= maxLng)) {
                    subtrack.points.push(p);
                    subtrack.times.push(track.times[indx]);
                }
            }
            return subtrack;
        }
    }

})()


