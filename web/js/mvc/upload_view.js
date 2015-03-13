/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 4/29/13
 * Time: 12:33 PM
 */

var Geof = Geof || {};
Geof.media = Geof.media || {};

Geof.cntrl.upload = {

    file_tmpl : '<li class="ui-widget-content" data-id="%index">'
        +'<div class="fileLiBlock"><label>%filename</label>'
        +'<label id="gps_%index" class="gpsRight no_gps">gps</label><br>'
        +'<input type="checkbox" id="cbUpl%index" class="floatLeft" data-id="%index" />'
        +'<div class="filePbar" id="pbar%index"></div></div>' +
        '<span class="ui-icon icon_geof_upload iconRight2R" id="upl%index"></span>'
        +'</li>',

    upload_tmpl : '<li class="ui-widget-content" data-id="%id" data-sendname="%filename" >'
        +'<label class="fileupload">File name:</label>%originalname<br>' +
        '<label class="fileupload">Registered By: </label>%registeredby<br>' +
        '<label class="fileupload">Status: </label>%status</li>',

    image_tmpl : '<img class="previewthumb" src="%result" title="%filename"/>',
    video_tmpl : '<video id="uplPreviewVideo" controls class="previewthumb" />',
    option_tmpl:'<option value="%id">%name</option>',
    INACTIVE : 0,
    ACTIVE : 1,

    stall_msg_tmpl : '<div id="stall-message" title="Upload Stall Warning!">'
        +'<p><span class="ui-icon ui-icon-alert" style="float: left; margin: 0 7px 20px 0;">'
        +'</span>Upload seems to have stalled.  Click Yes to cancel ALL uploads?</p></div>',

    ENCODE_PERCENT : 1.4,
    STALL_TIMEOUT : 300 * 1000, // 300 seconds or 5 minutes,
    UPLOAD_SLEEP_TIME : 500,
    REQUERY_SLEEP : 3000,
    
    filelist : {},
    fileIndex : 0,
    uploading_list : [],
    upload_timeout : null,
    upload_running : false,
    upload_callback : null,
    preview_type : -1,
    gmap_popup:null,
    cur_upload:null,
    cancelled: false,
    server_requery : null,

    initialize:function() {
        var _this = Geof.cntrl.upload

        $( '#fileUploadBtnBar' ).tooltip();

        $("#newUplProjectName").keyup(function() {
            var projName = $("#newUplProjectName").val();
            var validated = projName.length > 0;
            Gicon.setEnabled("btnUplProjectSave", validated);
        });

        Gicon.click("btnFileDiscard" , function() {
            $('#olFileuploadList .ui-selected').each( function(){
                $(this).remove();
            })
            _this.setFileUploadIconsEnabled();
            _this.setCheckGpsIconEnabled();
        });

        Gicon.click("btnFileAdd",function() {
            $('#fileUploadSelector').click();
        });

        Gicon.click("btnFileGps", _this.checkFileGps);

        Gicon.click("btnFileUpload",_this.startUpload);

        Gicon.click("btnCancelFileUpload",_this.cancelupload_callback);

        Gicon.click("btnUplReloadProjects", _this.resetProjects );

        Gicon.click("btnUplProjectSave", _this.saveProject);

        Gicon.click("btnUploadPending" ,_this.reloadPendingUploads);

        Gicon.click("btnUploadDiscard", _this.deleteUpload);

        $('#fileUploadSelector')[0].addEventListener('change', _this.fileSelectionCB, false);

        Gicon.click('btnUplShowMap',_this.viewFilesOnMap);

        Gicon.click('btnSyncWithTrack',_this.syncPhotosWithTrack);

        Gicon.click('btnAdjustDatetime',_this.showAdjustTime);

        Gicon.click('btnSyncVideoToTrack',_this.syncVideoToTrackPoints);

        Gicon.click('btnOpenTrackDialog',_this.showTrackDialog);

        Gicon.click('btnFileSelectAll',function() {
            $('#olFileuploadList li').each(function() {
                $(this).addClass('ui-selected');
            });
            $("#olFileuploadList input").prop('checked',true);

            Geof.cntrl.upload.setFileUploadIconsEnabled();
        });

        Gicon.click('btnFileDeselectAll',_this.unselectFiles);

        $("#uplProjects").change(function() {
            var checked = $("#uplProjects :selected").length > 0;
            $('#linkProjects').prop("checked",checked);
        });

        $( 'div.buttonBar' ).tooltip();
        $( 'span.ui-icon' ).tooltip();
        $( 'div.selectProject' ).tooltip();

        _this.setupKeywords();
        _this.resetProjects();

    },

    fileSelectionCB : function(evt) {
        var _this = Geof.cntrl.upload;
        var files = evt.target.files;

        for(var i = 0, f; f = files[i]; i++) {
            f.index = _this.fileIndex++;
            _this.filelist[f.index] = f;
            f.filetype = Filetypes.getEnumByExtension(f.name);
            GpsUtil.setFileCreatedate(f, null, false);
            var li= Geof.cntrl.upload.file_tmpl.replace(new RegExp('%index',"g"), f.index);
            li = li.replace(new RegExp('%filename',"g"), f.name);
            $("#olFileuploadList").append( li );
            $( "#pbar" + f.index ).progressbar({
                value: 0
            });
        }
        Gicon.setEnabled("btnFileSelectAll", files.length > 0);

        _this.setCheckGpsIconEnabled();
        $('#olFileuploadList').selectable({
            stop: function() {
                _this.preview_type = -1;
                $("#olFileuploadList input").attr('checked',false);
                $( ".ui-selected", this ).each(function() {
                    $("#cbUpl" + this.dataset.id).prop("checked", true);
                });
                _this.setFileUploadIconsEnabled();
                _this.setViewFile();
            }
        });
        var input =  $('#fileUploadSelector')[0];
        input.value = '';
    },

    setFileUploadIconsEnabled: function() {
        var files = Geof.cntrl.upload.getSelectedFiles();
        var enabled = files.length > 0;
        Gicon.setEnabled("btnFileDiscard",enabled);
        Gicon.setEnabled("btnFileDeselectAll",enabled);
        Gicon.setEnabled("btnFileUpload",enabled);
        Gicon.setEnabled("btnUplShowMap",enabled);

        Gicon.setEnabled("btnSyncWithTrack",false);
        Gicon.setEnabled("btnAdjustDatetime",false);

        var hasTrack = false;
        var hasPhotoNoGps = false;
        var hasPhoto = false;
        var file;
        var type;
        for (var indx=0; indx < files.length;indx++) {
            file = files[indx];
            type = Filetypes.getTypeByExtension(file.name);
            if (type === "photo") {
                hasPhoto = true;
                if ((! hasPhotoNoGps) && (! (file.gpsPoint || false))) {
                    hasPhotoNoGps = true;
                }
            } else if (type === "track") {
                hasTrack = true;
            }
            if (hasTrack && hasPhotoNoGps) {
                Gicon.setEnabled("btnSyncWithTrack",true);
                break;
            }
            Gicon.setEnabled('btnAdjustDatetime',hasPhoto);
        }
        Gicon.setEnabled('btnOpenTrackDialog',hasTrack);
    },

    getSelectedFiles: function() {
        var _this = Geof.cntrl.upload;
        var files = [];
        $("#olFileuploadList input:checked").each(function() {
            var file = _this.filelist[this.dataset.id];
            if (file || false) {
                files.push(file);
            }
        });
        return files;
    },

    unselectFiles:function() {
        $('#olFileuploadList .ui-selected').removeClass("ui-selected");
        $("#olFileuploadList input").attr('checked',false);
        Geof.cntrl.upload.setFileUploadIconsEnabled();
    },

    getTracksAndPhotoNoGps:function(files) {
        var tracks = [];
        var photos = [];
        for (var indx=0; indx < files.length;indx++) {
            var file = files[indx];
            var type = Filetypes.getTypeByExtension(file.name);
            if ((type === "photo") && (!(file.gpsPoint || false))) {
               photos.push(file);
            } else if (type === "track") {
                tracks.push(file);
            }
        }
        return {'tracks':tracks,'photos':photos};
    },

    syncPhotosWithTrack:function() {
        Gicon.setActive('btnSyncWithTrack',true);
        var _this = Geof.cntrl.upload;
        var files = _this.getSelectedFiles();
        var options = _this.getTracksAndPhotoNoGps(files);

        var cb = function(tracks) {
            var adjustGMT = true;
            options.tracks = tracks;
            options = GpsUtil.matchPhotoToTrack(options, adjustGMT);
            for (var indx in options.photos) {
                var file = options.photos[indx];
                _this.setGpsPoint(file, file.gpsPoint);
            }
            Gicon.setEnabled('btnSyncWithTrack',true);
            _this.checkFileGps();
            _this.unselectFiles();
        }
        GpsUtil.readTrackFiles(options.tracks, cb);

    },

    showAdjustTime:function() {
        var files = Geof.cntrl.upload.getSelectedFiles();
        Geof.cntrl.adjusttime.createDialog(files, true, null, null);
    },

    deleteUpload: function() {
        var _this = Geof.cntrl.upload
        Gicon.setActive("btnUploadDiscard", true);
        var order = 0;
        var trans = new Transaction(Geof.session);

        var $selected = $('#olPendinguploadList .ui-selected');
        var length = $selected.length;
        for (var indx = 0; indx < length; indx++) {
            var sendname = $($selected[indx]).data('sendname');
            if ( sendname || false ) {
                var req = GRequest.buildDataWhere('upload','delete', null);
                req.data.where = {"sendname": $($selected[indx]).data('sendname')};
                req.order = order++;
                trans.addRequest(req, null);
            }
        }
        var jsonRead = GRequest.build('upload','read', null, {});
        jsonRead.order = order;
        trans.addRequest(jsonRead, _this.reloadPendingUploads);
        trans.send();
    },

    setCheckGpsIconEnabled: function() {
        Gicon.setEnabled('btnFileGps', $('#olFileuploadList li').length > 0);
    },

    viewFilesOnMap:function( ) {
        var selected =$('#olFileuploadList li.ui-selected');
        var len = selected.length;
        var trackFiles = [];
        var tracks = [];
        var photoFiles = [];
        var videoFiles = [];

        var _this = Geof.cntrl.upload;
        for (var i=0;i<len;i++) {
            var file = _this.filelist[$(selected[i]).data('id')];
            var type = Filetypes.getTypeByExtension(file.name);
            // TODO: check for gpsPoint and gpsTracks first.  scan only non-gps files
            // TODO: map popup should handle all
            if (type === 'track') {
                trackFiles.push(file);
            } else if ((type === 'photo') && (file.gpsPoint || false)) {
                photoFiles.push(file);
            } else if ((type === 'video') && (file.gpsTracks || false)) {
                videoFiles.push(file);
            }
        }

        var cbSendToMap = function(gpopup) {
            _this.gmap_popup = gpopup;
            for (var indx in photoFiles) {
                gpopup.addPhotoMarker(photoFiles[indx]);
            }
            for (var indx in tracks) {
                gpopup.addTrackMarker(tracks[indx]);
            }
            for (var indx in videoFiles) {
                var file = videoFiles[indx];
                gpopup.addVideoMarker(file);
            }

            gpopup.GMap.zoomToMarkers();
            gpopup.GMap.select_callback = _this.selectFiles;
            gpopup.GMap.setPointCallback( _this.pointMarkerCallback);
        }

        Geof.event.addMapListener(_this.setExtentPoint);
        var options = {
            closeCallback: function() {
                Geof.event.removeMapListener(_this.setExtentPoint);
            },
            completeCB:cbSendToMap
        }

        if ( trackFiles.length > 0 ) {
            var cb = function(tracklist) {
                tracks = tracklist;
                Geof.map_popup.showDialog(options);
            }
            GpsUtil.readTrackFiles(trackFiles,cb);
        } else {
            Geof.map_popup.showDialog(options);
        }
    },

    showTrackDialog:function( ) {
        var selected =$('#olFileuploadList li.ui-selected');
        var len = selected.length;
        var trackFiles = [];
        var tracks = [];

        var _this = Geof.cntrl.upload;
        for (var i=0;i<len;i++) {
            var file = _this.filelist[$(selected[i]).data('id')];
            var type = Filetypes.getTypeByExtension(file.name);
            if (type === 'track') {
                trackFiles.push(file);
            }
        }

        if ( trackFiles.length == 0 ) {
            return;
        }

        var cb = function(tracklist) {
            var callback = function(trackProfile){
                trackProfile.setTrack(tracklist[0]);
            }
            var closeCB = null;
            Geof.track_popup.createTrackDialog(false, callback, closeCB);
        }

        GpsUtil.readTrackFiles(trackFiles,cb);

    },

    pointMarkerCallback: function(marker) {
        Gicon.setEnabled('btnSyncVideoToTrack', marker != null);
    },

    syncVideoToTrackPoints:function() {
        var _this = Geof.cntrl.upload;
        var marker = _this.gmap_popup.GMap.getPointMarker();
        var parent = marker.parent_point;
        var fileid = parent.marker.fileid;
        var index = parent.index;
        var file = _this.filelist[fileid];
        var track = file.gpsTracks[0];
        //Todo: Since some files may have more than one track this code needs to be tighter.
        var vp = document.getElementById('uplPreviewVideo');
        var offset = vp.currentTime;
        var duration = vp.duration;
        var subTrack = GpsUtil.getSubTrack(track, index, duration, offset);
        if (subTrack != null) {
            var matchFile = _this.getSelectedFiles()[0];
            matchFile.gpsTracks = [];
            matchFile.gpsTracks.push(subTrack);
            _this.setGpsTracks(matchFile, matchFile.gpsTracks);
            matchFile.createdate = subTrack.times[0];
            matchFile.geomtype = 1;
            matchFile.gpsPoint = null;
        } else {
            alert("Could not match file to track by date");
        }
    },

    setViewFile: function() {
        var _this = Geof.cntrl.upload;
        Gicon.setEnabled('btnSyncVideoToTrack',false);
        _this.preview_type = -1;
        var $selected = $('#olFileuploadList .ui-selected');
        var count = $selected.length;
        if ( count > 1) {
            return;
        }
        var id = $($selected[0]).data('id');
        var file = _this.filelist[id];
        if (! (file || false )) {
            return;
        }

        var name = file.name;
        var size = file.size / 1000000;
        size = parseFloat(Math.round(size * 10000) / 10000).toFixed(4);

        if (!( file.createdate || false)) {
            file.createdate = DateUtil.getFileDate(file);
        }

        $('#fu_filename').text(name);
        $('#fu_filesize').text(size + ' mb');
        $('#fu_filedate').text(file.createdate);
        if (file.gpsPoint || false) {
            $('#fu_latitude').text(file.gpsPoint.latitude);
            $('#fu_longitude').text(file.gpsPoint.longitude);
        } else {
            $('#fu_latitude').text("");
            $('#fu_longitude').text("");
        }

        // Only process image files.
        if(file.type.match('image.*')) {
            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function(theFile) {
                return function(e) {

                    var img = _this.image_tmpl.replace(new RegExp('%filename',"g"), escape(theFile.name));
                    img = img.replace(new RegExp('%result',"g"), e.target.result);
                    $('#image_preview').html(img);
                    _this.preview_type = 0;
                };
            })(file);

            // Read in the image file as a data URL.
            reader.readAsDataURL(file);
        } else if(file.type.match('video.*')) {
            var URL = window.URL || window.webkitURL
            var reader = new FileReader();
            // Closure to capture the file information.
            reader.onload = (function(theFile) {
                return function(e) {
                    $('#image_preview').html(_this.video_tmpl);
                    var vp = document.getElementById('uplPreviewVideo');
                    theFile.vp = vp;
                    vp.src = URL.createObjectURL(file)
                    _this.preview_type = 1;

                };
            })(file);

            // Read in the image file as a data URL.
            reader.readAsDataURL(file);
        }
    },

    reloadPendingUploads: function() {
        var cb = function(req) {
            var _this = Geof.cntrl.upload;
            var data = req[0].data;
            var $list = $('#olPendinguploadList');
            $list.empty();
            for (var indx in data) {
                var row = Templatetor.mergeDftTemplate(data[indx], Geof.cntrl.upload.upload_tmpl);
                $list.append(row);
            }
            $list.selectable({
                stop: function() {
                    _this.setUploadIconsEnabled();
                }
            });
            Gicon.setEnabled("btnUploadPending", true);
            _this.setUploadIconsEnabled();
        }

        Gicon.setActive("btnUploadPending", true);
        var obj = {"entity":"upload","action":"read","data":{}};
        TransMgr.sendNow( GRequest.fromJson(obj), cb);
    },

    setExtentPoint:function (mapObject) {
        var _this = Geof.cntrl.upload;
        var _dec = 5;
        if (mapObject.extent || false) {

        } else if (mapObject.point || false) {
            var point = mapObject.point;
            $("#olFileuploadList li.ui-selected").each(function() {
                var id = $(this).data('id');
                var fupload = _this.filelist[id];

                fupload['gpsPoint'] = null;
                fupload['gpsTrack'] = null;
                fupload.geomtype = 1;
                fupload.gpsPoint = {'latitude': point.lat(),'longitude':point.lng()};
                if (point.utcdate || false) {
                    fupload.gpsPoint.datetime = point.utcdate;
                }

                var item = $("#gps_" + id);
                if (item || false) {
                    $(item).switchClass('no_gps','has_gps');
                }

            });
        }
    },

    selectFiles:function(fileIds) {
        $("#olFileuploadList .ui-selected").each(function(){
           $(this).removeClass('ui-selected');
        });
        for (var indx in fileIds) {
            $("#li_file_" + fileIds[indx]).addClass('ui-selected');
        }
        Geof.cntrl.upload.setViewFile();
    },

// -----------------------------------------------------
//  File upload functions  -----------------------------

    startUpload: function() {
        if (Gicon.isActive("btnFileUpload")) {
            return;
        }
        var _this = Geof.cntrl.upload;
        _this.cancelled = false;
        _this.resetProgressBars();
        _this.cur_upload = null;
        var files = _this.getSelectedFiles();
        var filecount = files.length;
        if (filecount === 0) {
            return;
        }

        Geof.log("Start: " + DateUtil.currentTime());

        Gicon.setActive("btnFileUpload", true);
        Gicon.setEnabled("btnCancelFileUpload", true);

        Gicon.setEnabled("btnFileDiscard", false);
        Gicon.setEnabled("btnFileGps", false);
        Gicon.setEnabled("btnFileAdd", false);
        Gicon.setEnabled("btnFileSelectAll", false);
        Gicon.setEnabled("btnFileDeselectAll", false);

        _this.uploading_list = [];

        var keywords = [];
        if ($('#linkKeywords').is(':checked') && $('#uplKeywords').val().length) {
            keywords = _this.parseKeywords(true);
        }
        var pids = [];
        if ($('#linkProjects').is(':checked') && $('#uplProjects option:selected').length) {
            var options = $('#uplProjects option:selected');
            var count = options.length;
            for (var indx = 0; indx < count; indx++) {
                pids.push( parseInt($(options[indx]).val()));
            }
        }

        for (var indx = 0; indx < filecount; indx++) {
            var file = files[indx];
            file.keywords = keywords;
            file.projectids = pids;
            var id = file.index === undefined ? file.id : file.index;
            var uf = new Uploadfile( file, id );
            uf.endCallback = _this.uploadCallback;
            _this.uploading_list.push(uf);
        }
        _this.uploadPendingFiles();
    },

    uploadPendingFiles: function () {
        var _this = Geof.cntrl.upload;
        if ( _this.cancelled) {
            var err = "Upload cancelled";
            var gcn = Geof.cntrl.notification;
            Geof.notifier.addLocal(err,gcn.levels.Medium,gcn.types.Local);
            return;
        }
        var cu = _this.cur_upload;
        if (cu != null) {

            if (cu.status === FU_ERROR) {
                //Todo: send error to screen somehow
            } else if (cu.status == FU_SERVER_ACTIVATE){
                _this.activate_requery(cu)
            } else if (cu.status != FU_ACTIVE){
                cu.upload();
                return;
            }
        }

        if (_this.uploading_list.length === 0) {
            _this.cancelupload_callback();
            return;
        } else {
            cu = _this.uploading_list.shift();
            _this.cur_upload = cu;
            Gicon.setActive("upl" + cu.index, true);
            cu.upload();
        }
    },

    activate_requery:function( cu ) {
        var _this = Geof.cntrl.upload;
        if (_this.server_requery == null) {
            var stateCB = function(isRunning) {
                if (isRunning) {
                    Gicon.setActive('btnUploadRequery', true);
                } else {
                    Gicon.setEnabled('btnUploadRequery', false);
                }
            }
            _this.server_requery = new Requery(_this.requeryCB, stateCB, _this.REQUERY_SLEEP);
        }
        _this.server_requery.add(cu);
        _this.server_requery.start(true);

    },

    requeryCB:function(req) {
        var _this = Geof.cntrl.upload
        var requery = this;
        var data = req.data;

        var requests = [];
        for ( var item in data) {
            item = data[item];
            if (item.status == FU_ACTIVE || item.status == FU_ERROR) {
                var sendname = item.filename;
                var upload = requery.remove(sendname);
                if (upload === undefined) {
                    continue;
                }
                var index = upload.index;
                if (item.status == FU_ERROR) {
                    $("#pbar" + index).prop('title', item.error);
                    $("#pbar" + index).tooltip();
                }
                Gicon.setEnabled("upl" + index, false);
                _this.uploadCallback(index, item.status, null, upload.total_steps, null);
                var del = GRequest.build('upload','delete', null, {'where':{'sendname':upload.sendname}});
                requests.push(del);
            }
        }
        if (requests.length > 0) {
            var trans = new Transaction(Geof.session);
            for (var indx in requests) {
                trans.addRequest(requests[indx]);
            }
            trans.send();
        }
        if (requery.count() == 0) {
            requery.stop();
            this.server_requery = null;
        }
    },

    uploadCallback:function(index, status, pending, sent, error) {
        var _this = Geof.cntrl.upload;
        if ( error != null && error.length > 0) {
            //TODO: work this into the error handling system.
            alert(error);
        } else {
            if (status === FU_ERROR) {
                _this.errorProgressBar(index)
            } else if ( status === FU_REGISTERED ) {
                _this.initProgressBar(index, pending);
            } else {
                _this.updateProgressBar(index, sent);
            }
        }
        _this.uploadPendingFiles();
    },

    updateProgressBar: function (index, count, callback) {
        $('#pbar' + index).progressbar( "option", "value", count);
        if (callback) {
            setTimeout(callback, 250);
        }
    },

    initProgressBar:function(index, count, callback) {
//        Geof.log("updateProgressBar, " + index + ": " + count);
        var $pbar = $('#pbar' + index);
        $pbar.progressbar( "option", "max", count );
        $pbar.progressbar( "option", "value", 0);
        $pbar.progressbar({complete:function() {
            $('#pbar' + index + ' > div').css({ 'background': 'green' });
        }});
        if (callback) {
            setTimeout(callback, 250);
        }
    },

    errorProgressBar:function(index) {
        var $pbar = $('#pbar' + index);
        $pbar.progressbar({complete:function() {
            $('#pbar' + index + ' > div').css({ 'background': 'red' });
        }});
        $pbar.progressbar( "option", "value", $pbar.progressbar( "option", "max" ));
    },
    resetProgressBars:function() {
        $("div[id^='pbar']").each(function() {
            $(this).progressbar( "option", "min", 0 );
            $(this).progressbar( "option", "max", 1 );
            $(this).progressbar( "option", "value", 0);
            $(this).find('div').css({ 'background': 'lightgrey' });
        });
    },

    setupload_callback: function() {
        var _this = Geof.cntrl.upload;
        if (_this.upload_callback == null) {
            _this.upload_callback = setTimeout(
                function() {
                    _this.upload_callback = null;
                    _this.uploadPendingFiles();
                }
                , _this.UPLOAD_SLEEP_TIME);
        }
    },

    cancelupload_callback:function() {
        var _this = Geof.cntrl.upload;
        if (_this.upload_callback != null) {
            clearTimeout(_this.upload_callback);
            _this.upload_callback = null;
        }
        _this.uploading_list.length= 0;
        Gicon.setEnabled("btnFileUpload", true);
        Gicon.setEnabled("btnFileDiscard", true);
        Gicon.setEnabled("btnFileGps", true);
        Gicon.setEnabled("btnFileAdd", true);
        Gicon.setEnabled("btnCancelFileUpload", false);
        Gicon.setEnabled("btnFileSelectAll", true);
        Gicon.setEnabled("btnFileDeselectAll", true);

        _this.upload_running = false;
        _this.cancelled = true;
    },

    removeUploadByIndex: function(index) {
        var _this = Geof.cntrl.upload;
        var count = _this.uploading_list.length;

        for (var indx = 0; indx < count; indx++ ) {
            var fupload = _this.uploading_list[indx];
            if (fupload || false) {
                if (fupload.index === index) {
                    _this.uploading_list.splice(indx,1);
                    return fupload;
                }
            }
        }
        return null;
    },

//    uploadPendingFiles: function () {
//        var _this = Geof.cntrl.upload;
//        Geof.log("uploadPendingFiles - running: " + _this.upload_running);
//        if (_this.upload_running) {
//            _this.setupload_callback();
//            return;
//        }
//        _this.upload_running = true;
//
//        var purgeList = [];
//        var nothingProcessed = true;
//        var running_count = 0;
//
//        var filecount = _this.uploading_list.length;
//        if (filecount === 0) {
//            Geof.log("!!!! Ending upload normally");
//            _this.cancelupload_callback();
//        }
//        for (var indx = 0; indx < filecount && running_count < 1; indx++) {
//            var fupload = _this.uploading_list[indx];
////        Geof.log("uploadPendingFiles index: " + fupload.index);
//            if (! (fupload.blocked || fupload.paused)) {
//                if (fupload.status === FU_ERROR || fupload.status === FU_ACTIVE) {
//                    purgeList.push(fupload.index);
//                } else {
//                    running_count++;
//                    fupload.upload();
//                    nothingProcessed = false;
//                }
//            }
//        }
//
//        var purgecount = purgeList.length;
////    Geof.log("purgeList.length: " + purgeList.length);
//        for (var indx = 0; indx < purgecount; indx++ ) {
//            _this.removeUploadByIndex(purgeList[indx]);
//        }
//
//        if ( _this.uploading_list.length === 0 ) {
//            _this.cancelupload_callback();
//            return;
//
//        } else if (nothingProcessed) {
//            _this.upload_timeout = setTimeout(
//                function() {
//                    _this.upload_timeout = null;
//                    _this.showStallDialog();
//                }, _this.STALL_TIMEOUT
//            );
//        }
//        _this.setupload_callback();
//        _this.upload_running = false;
//    },
//
// -----------------------------------------------------
//  Dialog functions   -----------------------------

    showStallDialog: function() {
        var _this = Geof.cntrl.upload;
        var $body = $('#mainbody');
        $body.append(_this.stall_msg_tmpl);
        var $stalldlg = $( "#stall-message" );
        if ($stalldlg || false) {
            $stalldlg.dialog({
                modal: true,
                buttons: {
                    Yes: function() {
                        _this.removeStallDialog();
                        this.cancelAllUploads();
                    },
                    No: function() {
                        _this.removeStallDialog();
                    }
                }
            });
            $stalldlg.dialog("open");
        }
    },

    removeStallDialog: function() {
        var $stalldlg = $( "#stall-message" );
        if ($stalldlg || false) {
            $stalldlg.dialog( "close" );
            $stalldlg.remove();
        }
    },

// -----------------------------------------------------
//  File Exif / GPS functions  -----------------------------

    checkFileGps : function() {
        Gicon.setActive("btnFileGps", true);
        Geof.cntrl.upload.parseFilesForGps(function() {
            Gicon.setEnabled("btnFileGps", true);
        });
    },

    parseFilesForGps : function(callback) {
        var _this = Geof.cntrl.upload;
        var point_files = [];
        var track_files = [];
        var video_files = [];
        var tracks = [];
        for(var indx in _this.filelist) {
            var file = _this.filelist[indx];
            file.id = indx;
            var ext = FileUtil.getExtension(file.name).toLowerCase();
            if (file.filetype == Filetypes.PHOTO) {
                if (GpsUtil.isValidGps(file.gpsPoint)) {
                    _this.setGpsPoint(file, file.gpsPoint);
                } else {
                    point_files.push(file);
                }
            } else if (file.filetype == Filetypes.TRACK) {
                if (file.gpsTracks || false) {
                    _this.setGpsTracks(file, file.gpsTracks);
                } else {
                    track_files.push(file);
                }
            } else if (file.filetype == Filetypes.VIDEO) {
                if (file.gpsTrack === undefined && file.gpsPoint === undefined) {
                    video_files.push(file);
                }
            }
        }

        var nextCB = function() {
            if (point_files.length > 0) {
                var f = point_files.pop();
//                Geof.log('parseFilesForGps: ' + file.name);
                var scanCB = function(binaryFile) {
                    _this.scanEXIF(binaryFile, f, nextCB);
                }
                var bfReader = new BinaryFile();
                bfReader.readFile(f, f.id, scanCB);

            }
            else if (track_files.length > 0) {
                var f = track_files.pop();
                var cb = function() {
                    _this.setGpsTracks(f, f.gpsTracks);
                    if (video_files.length > 0) {
                        for (var indx in f.gpsTracks){
                            tracks.push(f.gpsTracks[indx]);
                        }
                    }
                    nextCB();
                }
                GpsUtil.readTrackFile(f, cb);

            }
            else if (video_files.length > 0) {
                var f = video_files.pop();
                var date = DateUtil.dateFromFilename(f.name);
                if (date != null) {
                    f.createdate = date;
                }
                if (f.createdate !== undefined) {

                    var cb = function() {
                        for (var indx in tracks) {
                            var track = GpsUtil.getVideoSubTrack(tracks[indx], f);
                            if (track != null) {
                                f.gpsTracks = [track];
                                _this.setGpsTracks(f,f.gpsTracks);
                                break;
                            }
                        }
                        nextCB();
                    }
                    if (f.duration === undefined) {
                        var cbDuration = function(duration) {
                            f.duration = duration;
                            cb();
                        }
                        FileUtil.getVideoDuration(f,cbDuration);
                    } else {
                        cb();
                    }
                }
            }
            else if (callback || false) {
                callback();
            }
        }
        nextCB();
    },

    scanEXIF: function(binaryFile, file, callback) {
        if (binaryFile || false) {
            var _this = Geof.cntrl.upload;
            file.gpsPoint = null;

            var tags = EXIF.findEXIFinJPEG(binaryFile);
            var gps = GpsUtil.hasGpsTags(tags) ? GpsUtil.getGpsDecimal(tags) : null;
            _this.setGpsPoint(file, gps);
    //        Geof.log(fupload.gpsPoint);
            if (callback) { callback(); }
        }
    },

    setGpsPoint:function(file, gps) {
        if (file || false) {
            file.gpsPoint = gps;
            var item = $("#gps_" + file.id);
            if ( item || false ) {
                if (gps || false) {
                    $(item).switchClass('no_gps','has_gps');
                } else {
                    $(item).switchClass('has_gps','no_gps');
                }
            }
        }
    },

    setGpsTracks:function(file, gps) {
        if (file || false) {
            file.gpsTracks = gps;
            var item = $("#gps_" + file.id);
            if ( item || false ) {
                if (gps || false) {
                    $(item).switchClass('no_gps','has_gps');
                } else {
                    $(item).switchClass('has_gps','no_gps');
                }
            }
        }
    },

    setUploadIconsEnabled: function() {
        var count = $('#olPendinguploadList .ui-selected').length;
        Gicon.setEnabled("btnUploadDiscard", (count > 0));
    },

    resetProjects: function() {
        Gicon.setActive('btnUplReloadProjects',true);
        var $select = $('#uplProjects');
        $select.empty();
        Geof.model.read(null, Geof.cntrl.project, function (req) {
            var data = req.data;
            for (var indx in data) {
                $select.append(Templatetor.mergeDftTemplate(data[indx], Geof.cntrl.project.option_tmpl));
            }
            Gicon.setEnabled('btnUplReloadProjects',true);
        });
    },
    
    saveProject : function() {
        Gicon.setActive('btnUplProjectSave',true);
        var req = GRequest.buildDataFields("project","create",null);
        req.data.fields = {"name":$('#newUplProjectName').val()};
    
        var cb = function() {
            Gicon.setEnabled('btnUplProjectSave',true);
            Geof.cntrl.upload.resetProjects();
        }
        TransMgr.sendNow( req, cb);
    },

    setupKeywords:function () {
        var $Keywords = $("#uplKeywords");

        $Keywords.blur(function () {
            var $this = $(this);
            var keywords = Geof.cntrl.upload.parseKeywords();
            $this.val('');
            $this.val(PhraseParser.format(keywords));
        });

        $("#btnUplResetKeywords").click(function () {
            $("#uplKeywords").val('');
        });
    },

    parseKeywords:function(encode) {
        encode = encode || false;
        var text = $("#uplKeywords").val();
        if (text.length > 0) {
            return PhraseParser.parse(text, encode);
        }
        return [];
    }
}


