/**
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 4/24/13
 * Time: 9:10 AM
 */

var Geof = Geof ||{};

Geof.cntrl.thumbnail = {

    name:'thumbnail',
    tbn_filler : null,
    selectedFileIds: [],
    lookup : {
        'filetype':FileInfo.getFiletype,
        'status':FileInfo.getStatus,
        'viewid':FileInfo.getView,
        'registeredby':FileInfo.getRegistered,
        'storagelocid':FileInfo.getStorageName
    },
    last_click : -1,
    last_id : -1,
    dbl_clk : 500,
    file:null,
    data: null,

    initialize:function() {
        var _this = Geof.cntrl.thumbnail;
        _this.tbn_filler = new FormFiller('tbn_', _this.lookup);

//        Gicon.click("btnThumbnailDiscard",_this.loadList);
        Gicon.click("btnThumbnailDeselect",_this.deselectAllThumbnails);
        Gicon.click("btnThumbnailRefresh",_this.loadList);
        Gicon.click("btnScrollThmbnlUp", function() {
            _this.scrollImages(1);
        });
        Gicon.click("btnScrollThmbnlDown", function() {
            _this.scrollImages(-1);
        });

        _this.initSlider();
        $('div.sliderBar').tooltip();

        $("#thmbnlKeywords").blur(function() {
            var text = $(this).val();
            if (text.length >  0) {
                $(this).val(PhraseParser.format(PhraseParser.parse(text, false)));
            }
            Geof.cntrl.thumbnail.checkUpdateable();
        })

        Gicon.click("btnThmbnlResetKeywords",function(){
            $("#thmbnlKeywords").val('');
            Geof.cntrl.thumbnail.checkUpdateable();
        })

        $("#thmbnlProjects").change( function() {
            var enabled = $("#thmbnlProjects option:selected").length > 0;
            Gicon.setEnabled("btnThmblResetProjects",enabled);
            Geof.cntrl.thumbnail.checkUpdateable();
        });

        Gicon.click("btnThmblResetProjects",function() {
            $('#thmbnlProjects').find('option').prop('selected', false);
            Gicon.setEnabled("btnThmblResetProjects",false);
        });
        Gicon.click("btnThmbnlProjectSave", _this.linkProjects);

        Gicon.click("btnThmbnlKeywordsSave", _this.linkKeywords);

        Gicon.click("btnThmbnlDeselect", function() {
            $('.thmbnlCB').attr('checked',false);
            Geof.cntrl.thumbnail.checkUpdateable();
        })

        Gicon.click("btnThmbnlDiscard", _this.delete);
        Gicon.click("btnThmbnlSelectAll", _this.selectAll);

        Gicon.click("btnThmblProjectSave", _this.saveProject);
        Gicon.click("btnThmbnlReloadProjects", _this.loadProjects);

        $("#newThmblProjectName").change(function() {
           Gicon.setEnabled('btnThmblProjectSave',$(this).val().length > 0);
        });

        $('#thmbmltd_images').mousewheel(function(e,delta){
            _this.scrollImages(delta);
        });

        $('#thmbnlSlider').mousewheel(function(e,delta){
            _this.scrollImages(delta);
        });

        _this.loadProjects(function() {
            _this.loadList();
        });
    },

    resize:function() {
        //Todo:finish this to resize the thumbnail layout other than 4 across
    },

    loadProjects:function (completeCallback) {
        Gicon.setActive('btnThmbnlReloadProjects',true);

        var cb = function(req) {
            var data = req.data;
            var $select = $('#thmbnlProjects');
            var tmpl = Geof.cntrl.search.option_tmpl;
            $select.empty();
            for (var indx in data) {
                $select.append(Templatetor.mergeDftTemplate(data[indx], tmpl));
            }
            Gicon.setEnabled('btnThmbnlReloadProjects',true);
            if (completeCallback || false) {
                completeCallback();
            }
        }
        Geof.model.read(null, Geof.cntrl.project, cb);
    },

    linkKeywords:function () {

        var fileids = Geof.cntrl.thumbnail.selectedFileIds;
        if (fileids.length == 0) {
            return;
        }
        Gicon.setActive("btnThmbnlKeywordsSave",true)
        var encode = true;
        var trans = new Transaction(Geof.session);
        var order = 0;
        for (var findx in fileids) {
            var fileid = fileids[findx];
            var data = {"where":{"fileid":fileid}};
            var req = GRequest.build("file_keyword", "delete", null, data);
            req.order = order++;
            trans.addRequest(req, null);

            var text = $("#thmbnlKeywords").val();
            var keywords = [];
            if (text.length > 0) {
                keywords = PhraseParser.parse(text, encode);
            }

            for (var indx in keywords) {
                data = {fields:{'keyword':keywords[indx]}, link:{'entity':'file', 'id':fileid}};
                req = GRequest.build("keyword", "create", null, data);
                req.order = order++;
                trans.addRequest(req, null);
            }
        }
        trans.setLastCallback(function() {
            Gicon.setEnabled("btnThmbnlKeywordsSave",true);
        });
        trans.send();
    },

    linkProjects:function () {

        var fileids = Geof.cntrl.thumbnail.selectedFileIds;
        if (fileids.length == 0) {
            return;
        }
        Gicon.setActive("btnThmbnlProjectSave",true)
        var projectids = []
        $("#thmbnlProjects option:selected").each(function() {
            projectids.push($(this).val());
        });
        var trans = new Transaction(Geof.session);
        var order = 0;
        for (var findx in fileids) {
            var fileid = fileids[findx];
            var data = {"where":{"fileid":fileid}};
            var req = GRequest.build("file_project", "delete", null, data);
            req.order = order++;
            trans.addRequest(req, null);

            for (var indx in projectids) {
                var data = {
                    entitya:'file',
                    entityb:'project',
                    fileid:fileid,
                    projectid:parseInt(projectids[indx])
                };
                var req = GRequest.build("link", "create", null, data);
                req.order = order++;
                trans.addRequest(req, null);
            }
        }
        trans.setLastCallback(function() {
            Gicon.setEnabled("btnThmbnlProjectSave",true);
        });
        trans.send();
    },

    saveProject : function() {
        Gicon.setActive('btnThmblProjectSave',true);
        var pname = $('#newThmblProjectName').val()
        var data = {fields:{"name":pname}};
        var req = GRequest.build("project","create",null,data);

        var cb = function() {
            Gicon.setEnabled('btnThmblProjectSave',true);
            Geof.cntrl.thumbnail.loadProjects();
        }
        TransMgr.sendNow(req, cb);
    },

    scrollImages:function (moveRows) {
        var _this = Geof.cntrl.thumbnail;
        var $slider = $( "#thmbnlSlider" );
        var newPosition = $slider.slider("option", "value") + moveRows;
        newPosition = Math.max(_this.visibleRows,newPosition);
        newPosition = Math.min(newPosition, $slider.slider("option", "max"));
        $slider.slider("option", "value", newPosition);
    },

    setScrollEnabled:function () {
        var _this = Geof.cntrl.thumbnail;
        var $slider = $( "#thmbnlSlider" );
        var position = $slider.slider("option", "value");
        var maxRow = _this.thumbnails.rowCount()-1;
        Gicon.setEnabled("btnScrollThmbnlUp", (position <= maxRow));
        Gicon.setEnabled("btnScrollThmbnlDown", (position > _this.thumbnails.visibleRows));
        _this.thumbnails.setPosition(position);
    },

    initSlider: function () {
        $( "#thmbnlSlider" ).slider({
            orientation: "vertical",
            range: "min",
            min: 0,
            max: 100,
            value: 100
        });
    },

    loadList: function (results, refreshAction) {
        var _this = Geof.cntrl.thumbnail;
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

        var $ol = $('#ol_thmbnl');
        $ol.empty();

        if ((! _this.data) || _this.data.length == 0) {
            return;
        }

        var cb = function() {
            _this.visibleRows = 5;
            _this.thumbnails = new ThumbnailData($ol,_this.visibleRows);
            _this.thumbnails.buildRows(_this.data);
            var rowCount =  _this.thumbnails.max;
            var $slider = $( "#thmbnlSlider" );
            $slider.slider({change : _this.setScrollEnabled });
            $slider.slider("option", "min",  _this.thumbnails.visibleRows);
            $slider.slider("option", "max", rowCount);
            $slider.slider("option", "value", rowCount);
            Gicon.setEnabled("btnThmbnlDiscard", false);
            Gicon.setEnabled("btnThmbnlSelectAll",true);
        }

        //check for storagelocids in storage.storagelocs
        var data = Geof.cntrl.thumbnail.data;
        var slocs = Geof.cntrl.storage.storagelocs;
        var missing = false;
        for (var indx in data) {
            if (! (data[indx].id in slocs)) {
                missing = true;
                break;
            }
        }
        if (missing) {
            Geof.cntrl.storage.getStoragelocs(cb, -1);
        } else {
            cb();
        }
    },

    delete: function () {
        PanelMgr.showDeleteConfirm(
            "Delete Files",
            "Permanently delete selected files?",
            function(doDelete) {
                if (doDelete) {Geof.cntrl.thumbnail.deleteFiles()}
            }
        );
    },

    deleteFiles:function() {
        var _this = Geof.cntrl.thumbnail;
        var fileids = _this.selectedFileIds;
        var length = fileids.length;
        if (length == 0) {
            return;
        }

        var cb = function() {
            Gicon.setEnabled("btnThmbnlDeselect",false);
            Gicon.setEnabled("btnThmbnlDiscard",false);
            Gicon.setEnabled("btnThmbnlSelectAll",false);
            if (_this.refresh || false) {
                _this.refresh(_this.loadList);
            }
        }

        Gicon.setActive("btnThmbnlDiscard", true);
        var trans = new Transaction(Geof.session);

        for (var indx = 0; indx < length; indx++) {
            var data = {'where':{'id':fileids[indx]}};
            var req = GRequest.build('file','delete', null,data);
            trans.addRequest(req, null);
        }
        trans.setLastCallback(cb);
        trans.send();
    },

    select: function ( id, selectOnly ) {

        var _this = Geof.cntrl.thumbnail;
        var curtime = (new Date()).getTime();
        if ( selectOnly) {
//        var cntl = event.ctrlKey;
            var enabled = $("input.thmbnlCB:checked").length > 0;
            _this.selectedFileIds = [];
            $("input.thmbnlCB:checked").each( function() {
                _this.selectedFileIds.push($(this).data('id'));
            })
            Gicon.setEnabled("btnThmbnlDiscard", enabled);
            Gicon.setEnabled("btnThmbnlDeselect", enabled);

            _this.checkUpdateable();
        } else {
            if (( curtime - _this.last_click) < _this.dbl_clk) {
                Filetypes.showPopupById(id);
            }
            _this.loadDetail(id);
        }
        _this.last_click = curtime;
        _this.last_id = id;
    },

    selectAll: function () {

        var _this = Geof.cntrl.thumbnail;
        $("#ol_thmbnl input").each(function() {
            $(this).prop('checked',true);
        });
        Geof.cntrl.thumbnail.checkUpdateable();
    },

    checkUpdateable:function(enableProject, enableKeyword) {
        var _this = Geof.cntrl.thumbnail;
        _this.selectedFileIds.length = 0;
        $("#ol_thmbnl input:checked").each(function() {
            _this.selectedFileIds.push($(this).data('id'));
        });
        var enabled = _this.selectedFileIds.length > 0;
        Gicon.setEnabled("btnThmbnlKeywordsSave",enabled);
        Gicon.setEnabled("btnThmbnlProjectSave",enabled);
        Gicon.setEnabled('btnThmbnlDeselect',enabled);
        Gicon.setEnabled("btnThmbnlDiscard", enabled);

    },

    deselectAllThumbnails: function () {
        var _this = Geof.cntrl.thumbnail;
        _this.selectedFileIds.length = 0;
        $(".icon_geof_selector_active.selector").each(function () {
            $(this).switchClass("selector","selectorHidden")
        })
        $("#tbn_originalname").text("");
        $("#tbn_id").text("");
        $("#tbn_filesize").text("");
        $("#tbn_filetype").text("");
        $("#tbn_createdate" ).text("");
        $("#tbn_geomtype").text("");
        $("#tbn_filename").text("");
        $("#tbn_status").text("");
        $("#tbn_storagelocid").text("");
        $("#tbn_registeredby").text("");
        $("#tbn_registerdate").text("");
        $("#tbn_viewid").text("");
        $("#tbn_notes").text("");
        $("#tbn_checksumval").text("");

        Gicon.setEnabled("btnThmbnlDiscard", false);
        Gicon.setEnabled("btnThumbnailDeselect", false);
        Gicon.setEnabled("btn_this.updateThumbnail", false);
        _this.checkUpdateable();
    },

    loadDetail: function (id) {
        var _this = Geof.cntrl.thumbnail;
        var data = _this.thumbnails.data[id];
        _this.tbn_filler.setCB(data);
    
        var trans = new Transaction(Geof.session);
        var cbKW = function(req) {
            var data = req.data;
            var keywords = "";
            var keywords = [];
            for (var indx in data) {
                keywords.push('"' + base64.decode(data[indx].keyword) + '"');
            }
            $('#thmbnlKeywords').val(keywords.join());
        }

        var obj;
        obj = {
            "entity":"keyword","action":"read",
            "data":{
                "columns":"id,keyword",
                "join":[
                    {
                        "entity":"file_keyword",
                        "join":"child",
                        "where":{"fileid":id}
                    }
                ],
                "orderby":"keyword"}
        };
        trans.addRequest( GRequest.fromJson(obj), cbKW);
    
        var cbP = function(req) {
            var data = req.data;
            $('#thmbnlProjects').find('option').prop('selected', false);
            for (var indx in data) {
                var id = data[indx].projectid;
                $('#thmbnlProjects option[value="' + id + '"]').attr("selected", "selected");
            }

        }
        var obj = {"entity":"file","action":"read",
            "data":{
                "join":[{"entity":"file_project","join":"outer","columns":"projectid"}]
                ,"where":{"id":id}
            }
        };
        trans.addRequest( GRequest.fromJson(obj), cbP);
        trans.send();
    },

    updateFile: function() {
        var order = 0;
        var trans = new Transaction(Geof.session);
    
        var photoCount = _this.selectedFileIds.length;
        var photoId;
        var req;
        for (var indx = 0; indx < photoCount; indx++) {
            photoId = _this.selectedFileIds[indx];
            var keywords = _cntlKeyword.getKeywords(true);
            if (_cntlKeyword.isLinkChecked() && keywords.length > 0) {
                if (_cntlKeyword.isDeleteChecked() ) {
                    req = GRequest.buildDataWhere("file_keyword","delete",null);
                    req.data.where = {"fileid":photoId};
                    req.order = order++;
                    trans.addRequest(req, null);
                }
    
                for (var kIndex = 0; kIndex < keywords.length; kIndex++) {
                    req = GRequest.buildDataFields("keyword","create",null);
                    req.data.fields = {"keyword":keywords[kIndex]};
                    req.data.links = [{"entity":"file","data":{"fields":{"id":photoId}}}]
                    req.order = order++;
                    trans.addRequest(req, null);
                }
            }
    
            var pids = _cntlProject.getProjectIds();
            if (_cntlProject.isLinkChecked() && pids.length > 0 ) {
                if (_cntlProject.isDeleteChecked() ) {
                    req = GRequest.buildDataWhere("file_project","delete",null);
                    req.data.where = {"fileid":photoId};
                    req.order = order++;
                    trans.addRequest(req, null);
                }
                var pids = _cntlProject.getProjectIds();
                for (var pIndex = 0; pIndex < pids.length; pIndex++) {
                    req = GRequest.buildDataFields("file_project","create",null);
                    req.data.fields = {"fileid":photoId,"projectid":pids[pIndex]};
                    req.order = order++;
                    trans.addRequest(req, null);
                }
            }
        }
        if (order > 0) {
            trans.send(_this.loadList);
        }
    }

}
//---------------------------------------------------
//---------------------------------------------------
function ThumbnailData (control, visibleRows) {
    this.control = control;
    this.rows = [];
    this.vidrows = [];
    this.data = null;
    this.min = 0;
    this.max = 0;
    this.visibleRows = visibleRows;
    this.vLow = 0;
    this.vHigh = 0;
    this.path = window.location.origin + "/geof/geof?size=2&id=%id&sessionid=%sid";
    this.liPhotoTmpl = '<li class="ui-widget-content ui-state-default photo_list">'
        + '<input type=checkbox data-id="%id" class="thmbnlCB"/>'
        + '<img class="photo_list" data-id="%id" src="' + this.path + '">'
        + '<div class="photo_list">%id</div>';
    this.liVideoTmpl = '<li class="ui-widget-content ui-state-default photo_list">'
        + '<input type=checkbox data-id="%id" class="thmbnlCB"/>'
        + '<video class="photo_list" data-id="%id" src="%origin/%storageloc/%filename" id="tnVideo%inc"></video>'
        + '<div class="photo_list">%id</div>';
    this.liCanvasTmpl = '<li class="ui-widget-content ui-state-default photo_list">'
        + '<input type=checkbox data-id="%id" class="thmbnlCB"/>'
        + '<canvas class="photo_list" data-id="%id" id="tnVideo%inc" width="140" height="100"></canvas>'
        + '<div class="photo_list">%id</div>';
}

ThumbnailData.prototype.setPosition = function(position) {
    var newBottom = this.max - position;

    var start = Math.max(this.min, newBottom);
    var end = Math.min(start + this.visibleRows, this.max);
//    Geof.log ('position: ' + position + ', start: ' + start + ", end: " + end);
    var reload = (this.vHigh === this.vLow) || (end < this.vLow) || (start > this.vHigh);
    if ( reload ) {
//        Geof.log ('reloading');
        this.control.empty();
        for ( var indx = start; indx < end; indx ++) {
            this.control.append(this.rows[indx]);
            this.drawVideoImages(indx);
        }
    } else {
        var rowNum;
        var $row;
        var popCount;
        if (start > this.vLow) {
            popCount = start - this.vLow;
            for (var indx = 0; indx < popCount; indx++) {
                rowNum = this.vLow + indx;
                $row = $("#imgrowid" + rowNum);
                this.rows[rowNum] = $row;
                $row.remove();
                this.control.append(this.rows[this.vHigh + indx]);
                this.drawVideoImages(this.vHigh + indx);
            }
        } else {
            popCount = this.vHigh - end;
            for (var indx = 1; indx <= popCount; indx++) {
                rowNum = this.vHigh - indx;
                $row = $("#imgrowid" + rowNum);
                this.rows[rowNum] = $row;
                $row.remove();
                this.control.prepend(this.rows[this.vLow - indx]);
                this.drawVideoImages(this.vLow - indx);
            }
        }
    }
    this.vLow = start;
    this.vHigh = end;

    $("img.photo_list").unbind();
    $("canvas.photo_list").unbind();
    $("input.thmbnlCB").unbind();
    $("img.photo_list").on('click', function() {
        Geof.cntrl.thumbnail.select( $(this).data('id'), false )
    });
    $("canvas.photo_list").on('click', function() {
        Geof.cntrl.thumbnail.select( $(this).data('id'), false )
    });
    $("input.thmbnlCB").on('click', function() {
        Geof.cntrl.thumbnail.select( $(this).data('id'), true )
    });
}

ThumbnailData.prototype.rowCount = function() {
    return this.rows.length;
}

ThumbnailData.prototype.buildRows = function(data) {
    try {

    this.rows = [];
    this.data = {}
    this.max = 0;
    this.vLow = 0;
    this.vHigh = 0;

    var row = "";
    var count = 0;
    var imgCount = 0;
    var img;
    var record;
    var vidRecords = [];

//    Geof.log("buildRows.data count " + data.length);
    for (var indx in data) {
        record = data[indx];
        record.origin = Geof.session.svr_addr;
        record.storageloc = Geof.cntrl.storage.storageDir(record.storagelocid, null);
        record.inc = Geof.increment++;
        this.data[record.id] = record;
        imgCount ++;
        if (count === 0) {
            row = '<div id="imgrowid' + this.rows.length + '">'
        }
        if (record.filetype === 1) {
            img = Templatetor.mergeSessionTemplate(record, this.liCanvasTmpl);
            vidRecords.push(record);
        } else {
            img = Templatetor.mergeSessionTemplate(record, this.liPhotoTmpl);
        }
        row += img;
        count++;

        if (count === 4) {
            row += '</div>';
            this.rows.push(row);
            this.vidrows.push(vidRecords);
            vidRecords = [];
            count = 0;
            row = '';
        }
    }

    if (row.length > 0) {
        row += '</div>';
        this.rows.push(row);
        this.vidrows.push(vidRecords);
    }
    this.max = this.rows.length;
    } catch (e) {
        Geof.log("buildRows error: " + e);
    }
};

ThumbnailData.prototype.drawVideoImages= function(rowid) {
    var vidRecords = this.vidrows[rowid];
    if (vidRecords.length > 0) {
        var vid = document.createElement("video");
        vid.autoplay = false;
        vid.loop = false;
        vid.style.display = "none";
        var $canvas = null;
        var indx = 0;

        var cb = function() {
            if (indx == vidRecords.length) {
                $canvas = null;
                vid.src = ' ';
                vid.load();
            } else {
                var rec = vidRecords[indx];
                indx++;
                $canvas = document.getElementById("tnVideo" + rec.inc);
                vid.src = rec.origin + "/" + rec.storageloc + "/" + rec.filename;
                vid.load();
            }
        }

        vid.addEventListener("loadeddata", function()
        {
            if ($canvas == null) {
                cb();
                return;
            }
            // Let's wait another 100ms just in case?
            setTimeout(function()
            {
                $canvas.getContext("2d").drawImage(vid, 0, 0, 140, 100);
                cb();
            });

        }, false);

        cb();
    }
}
