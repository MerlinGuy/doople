/**
/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 4/17/13
 * Time: 1:03 PM
 */


var Geof = Geof || {};

Geof.cntrl.search = {
    map_popup : null,
    keywords:null,
    searchid:null,
    results:null,
    data:null,
    id:'id',
    entity:'search',
    prefix:'srch_',
    link:{  },
    fields:["id", 'name'],
    defaults:['-1', ''],
    exclude:[],
    list_columns:"id,name",
    edit_columns:"id,name,minlat,minlon,maxlat,maxlon,mindatetime,maxdatetime,distance,"
            +"unitofmeasure,status,description,spatialtype,usespatial,usetemporal,"
            +"usekeywords,keywordtype,useprojects",
    execute_columns:"duration,geomtype,filetype,viewid,storagelocid,notes,registeredby,registerdate,createdate,checksumval,status,originalname,filesize,fileext,filename,id",
    order_by:"name",
    title:'Search',
    option_tmpl:'<option value="%id">%name</option>',
    editConfig:{},
    views:['map','datagrid','timeline','thumbnail'],
    cur_view:null,

    initialize:function () {
        var _this = Geof.cntrl.search;
        _this.populateList(false);
        _this.setupCalendars();
        _this.setupKeywords();
        _this.setupSpatial();
        _this.setupEvents();

        _this.map_popup = new GMapPopup('SearchViewer');

        var mtypes = localStorage.getItem('search_media_types') || "";
        $("#searchMediaList").text(mtypes);

        mtypes = mtypes.split(",");
        for (var indx in mtypes) {
            for (var i in Filetypes.media_names) {
                if (Filetypes.media_names[i] == mtypes[indx]){
                    var value = parseInt(i);
                    $("input:checkbox[name=searchMediaTypesCB][value='" + value + "']").attr('checked', 'checked');
                }
            }
        }

        $(" .view").tooltip();
        $(" .searchTargets").tooltip();
    },

    setupEvents:function () {
        var _this = Geof.cntrl.search;
        $("#sltSearches").change(_this.queryForSearchDetail);

        $("#btnClearSearchMedia").click(_this.clearMediaTypes);

        $("#searchMediaList").click(function () {
            var $list = $("#searchMediaList");
            var offset = $list.position();
            var ddtop = offset.top + $list.height() + 9;

            var dropdown = $("#searchMediaTypes");
            dropdown.css({top:ddtop, left:offset.left, position:'absolute'});
            dropdown.show();
            $(document).on('mouseup', function (e) {
                var container = $("#searchMediaTypes");
                if (container.has(e.target).length === 0) {
                    $(document).unbind('mouseup');
                    container.hide();
                    var list = _this.getMediaTypes(false);
                    var text = [];
                    for (var indx in list) {
                        text.push(Filetypes.media_names[parseInt(list[indx])]);
                    }
                    text = text.join();
                    $("#searchMediaList").text(text);
                    localStorage.setItem('search_media_types',text);

                    _this.validate();
                }
            });
        });

        $("#useSpatial").click(function () {
            _this.toggleSection($("#spatialSubSection"));
        });
        $("#useTemporal").click(function () {
            _this.toggleSection($("#temporalSubSection"));
        });
        $("#useKeywords").click(function () {
            _this.toggleSection($("#keywordsSubSection"));
            $("#searchKeywords").blur();

        });
        $("#useProjects").click(function () {
            _this.toggleSection($("#projectSubSection"));
        });

        $("#btnRefreshSearch").click(function() {
            _this.refreshSearchList(-1);
        });

        $("#toggleSearchDetail").click(function() {
            _this.toggleSearchDetail(false);
        });

        Gicon.click("btnSaveSearch",_this.saveSearch);
        Gicon.click("btnNewSearch",_this.clear);
        Gicon.click("btnCopySearch",_this.setAsCopy);
        Gicon.click("btnDiscardSearch",_this.deleteSearch);
        Gicon.click("btnRunSearch", _this.execute);
        Gicon.click("btnSearchProjectSave",_this.saveProject);

        // Set the current results view
        Gicon.click("btnSearch_map",function() {_this.setView('map')});
        Gicon.click("btnSearch_datagrid",function() {_this.setView('datagrid')});
        Gicon.click("btnSearch_timeline",function() {_this.setView('timeline')});
        Gicon.click("btnSearch_thumbnail",function() {_this.setView('thumbnail')});

        // set up validation Events
        $("#spatialLowerLeft").on('blur', function () {
            var sw = $("#spatialLowerLeft").val();
            if (!GoogleMap.isValidLatLng(sw)) {
                $("#spatialLowerLeft").val('');
                _this.setError($("#lblSpatialError"), "Invalid Latitude,Longitude");
            }
            _this.validate();
        })

        $("#spatialUpperRight").on('blur', function () {
            var sw = $("#spatialUpperRight").val();
            if (!GoogleMap.isValidLatLng(sw)) {
                $("#spatialUpperRight").val('');
                _this.setError($("#lblSpatialError"), "Invalid Latitude,Longitude");
            }
            _this.validate();
        })

        $("#spatialDistance").on('blur', function () {
            var dist = parseFloat($("#spatialDistance").val());
            if (isNaN(dist) || dist <= 0) {
                $("#spatialDistance").val('');
                _this.setError($("#lblSpatialError"), "Invalid distance");
            }
            _this.validate();
        })

        // setup validation event
        $("#searchName").on('blur', _this.validate);
        $('#useSpatial').on('change', _this.validate);
        $('input[name=spatialType]').on('change',_this.validate);
        $("#spatialUpperRight").on('change', _this.validate);
        $("#spatialDistance").on('change', _this.validate);
        $("#spatialLowerLeft").on('change', _this.validate);
        $('#useTemporal').on('change', _this.validate);
        $('input[name=temporalType]').on('change',_this.validate);
        $("#searchAfterDate").on('change', _this.validate);
        $("#searchBeforeDate").on('change', _this.validate);

        $('#sltProjects').on('change', _this.validate);

        $("#rbAfterOnly").click(function() {
            $('#searchBeforeDate').val('');
            _this.validate();
        })
        $("#rbBeforeOnly").click(function() {
            $('#searchAfterDate').val('');
            _this.validate();
        })

    },

    setView: function(view_name) {
        var cb = function() {
            Geof.cntrl[view_name].initialize();
            Geof.cntrl.search.cur_view = Geof.cntrl[view_name];
            Geof.cntrl.search.cur_view_name = view_name;
            Geof.cntrl.search.toggleSearchDetail(true);
        }
        Geof.Retrieve.getView(view_name, function() {
            PanelMgr.loadSearchView(view_name,cb);
        });
    },

    enableViewButtons: function(enabled) {
        var views = Geof.cntrl.search.views;
        for (var indx in views) {
            Gicon.setEnabled("btnSearch_" + views[indx],enabled);
        }
    },

    toggleSearchDetail:function(hideOnly) {

        var $panel = $("#searchDetailPanel");
        var visible = $panel.is(":visible");
        var left = visible ? 0 : $panel.width();
        var remainder = $("#search_view").width() - left - $("#searchTargets").width() - 20;
       $("#searchResultsView").width(remainder);

        if ( visible) {
            $("#toggleSearchDetail").switchClass("icon_geof_arrowLeft_enable","icon_geof_arrowright_enable");
            $panel.hide();
        } else {
            $("#toggleSearchDetail").switchClass("icon_geof_arrowright_enable","icon_geof_arrowleft_enable");
            $panel.show();
        }
        if (Geof.cntrl.search.cur_view || false) {
            Geof.cntrl.search.cur_view.resize();
        }

    },

    queryForSearchDetail:function () {
        var _this = Geof.cntrl.search;
        _this.searchid = $("#sltSearches option:selected").val();
        if (_this.searchid > -1) {
            localStorage.setItem("saved_searchid", _this.searchid);
            var trans = new Transaction(Geof.session);
            var data = {"columns":_this.edit_columns,"where":{"id":_this.searchid}};
            var req = GRequest.build("search", "read", null, data);
            trans.addRequest(req, _this.setSearchFields);
            trans.send();
        }
    },

    setSearchFields:function (req) {
        var _this = Geof.cntrl.search;
        var data = req.data[0];
        _this.data = data;
        _this.clear();

        Gicon.setEnabled("btnDiscardSearch", true);
        Gicon.setEnabled("btnCopySearch", true);

        _this.searchid = data.id;
        $("#searchId").val(data.id);

        $("#searchName").val(data.name);
        $("#searchNotes").val(data.description);

        $('#useSpatial').prop('checked', data.usespatial);
        _this.setSection("spatialSubSection", data.usespatial);
        var spatialtypes = ["rbBoundingBox", "rbCenterPoint"];
        $("#" + spatialtypes[data.spatialtype]).prop('checked', true);
        $("#spatialUpperRight").val(data.maxlat + ", " + data.maxlon);
        $("#spatialLowerLeft").val(data.minlat + ", " + data.minlon);
        $("#spatialDistance").val(data.distance);

        $('#useTemporal').prop('checked', data.usetemporal);
        _this.setSection("temporalSubSection", data.usetemporal);

        var tindx = 0;
        var tindx = ((data.mindatetime.length > 0) ? 1 : 0)
            + ((data.maxdatetime.length > 0) ? 2 : 0);
        var ttype = ["rbUseBoth","rbAfterOnly","rbBeforeOnly","rbUseBoth"][tindx];
        $("#" + ttype).prop('checked', true);
        $("#searchAfterDate").val(DateUtil.parseToPickerDate(data.mindatetime));
        $("#searchBeforeDate").val(DateUtil.parseToPickerDate(data.maxdatetime));

        $('#useKeywords').prop('checked', data.usekeywords);
        _this.setSection("keywordsSubSection", data.usekeywords);
        var keywordtypes = ["rbAnyWord", "rbExactMatch"];
        $("#" + keywordtypes[data.keywordtype]).prop('checked', true);
        $("#searchKeywords").val('');

        $('#useProjects').prop('checked', data.useprojects);
        _this.setSection("projectSubSection", data.useprojects);
        $('#sltProjects').find('option').prop('selected', false);

        _this.setSearchProjects();
        _this.setSearchKeywords();
        _this.execute();
    },

    execute: function(callback) {

        var _this = Geof.cntrl.search;
        var rtn = _this.getSearchCriteria( false, true );
        var data = {};
        data.where = rtn.json;
        if ("projects"  in rtn) {
            data.projects = rtn.projects;
        }
        if ("keywords"  in rtn) {
            data.keywords = rtn.keywords;
        }
        data.columns = _this.execute_columns;
        data.filetypes = _this.getMediaTypes(true);

        var cb = function(req) {
            _this.results = req[0].data;
            var cnt = _this.results.length;
            var hasData = cnt || false;

            var row;
            for (var indx in _this.results) {
                row = _this.results[indx];
                if (row.geomtype == GpsUtil.POINT) {
                    row.gpsPoint = {
                        latitude:row.latitude,
                        longitude:row.longitude,
                        utcdate:row.utcdate
                    };

                } else if (row.geomtype == GpsUtil.TRACK) {
                    row.gpsTrack = {
                        points:[],
                        bounds:{
                            minlat:row.minlat,
                            minlon:row.minlon,
                            maxlat:row.maxlat,
                            maxlon:row.maxlon
                        },
                        times:[],
                        start:row.startdate,
                        end:row.enddate,
                        complete:false
                    };
                }
            }

            _this.enableViewButtons(hasData);
            $("#searchResults").text("Files - " + cnt);
            Gicon.setEnabled("btnRunSearch", true);
            if (callback) {
                callback();
            }
        };
        Gicon.setActive("btnRunSearch",true);
        $("#searchResults").text("");
        var req = GRequest.build("search", "execute", null, data);
        TransMgr.sendNow(req, cb);
    },

    getResultsFile:function(id) {
        var results = Geof.cntrl.search.results;
        if (results || false) {

            for (var indx in results) {
                if (results[indx].id === id) {
                    return results[indx]
                }
            }
        }
        return null;
    },

    getMediaTypes:function(join) {
        var list = $("input[name=searchMediaTypesCB]:checked").map(
            function () {
                return this.value;
            }).get();

        if (join || false) {
            list = list.join();
        }
        return list
    },

    saveSearch:function () {

        if (!Geof.cntrl.search.validate()) {
            return;
        }

        Gicon.setActive('btnSaveSearch', true);
        var _this = Geof.cntrl.search;
        var rtn = _this.getSearchCriteria( false, true );
        var data = {};
        data.fields = rtn.json;
        if ("projects"  in rtn) {
            data.projects = rtn.projects;
        }
        if ("keywords"  in rtn) {
            data.keywords = rtn.keywords;
        }
        var json = rtn.json;

        var searchid = $("#searchId").val();
        var action = 'create';
        if ((searchid || false) && (searchid.length > 0)) {
            _this.searchid = searchid;
            data.where = {'id':searchid};
            action = 'update'
        }

        var cb = function (req) {
            if (('error' in req) && (req.error.length > 0)) {
                //TODO: write error to screen
            } else {
                req = req[0];
                var action = req.action;
                if (action === 'create') {
                    if ((req.pkey || false) && (req.pkey.length > 0)) {
                        searchid = req.pkey[0].searchid;
                    }
                }
            }
            Gicon.setEnabled('btnSaveSearch', true);
            Geof.cntrl.search.refreshSearchList();
        }

        var req = GRequest.build("search", action, null, data);
        TransMgr.sendNow(req, cb);
    },

    getSearchCriteria:function( addId, encode) {

        var _this = Geof.cntrl.search;
        var json = _this.buildSearchJson( addId || false);
        var data = {'json':json};
        json.name = $("#searchName").val();
        json.description = $("#searchNotes").val();
        json.usespatial = $('#useSpatial').is(':checked');
        if (json.usespatial) {
            if ($("#rbBoundingBox:checked")) {
                json.spatialtype = 0;
                json.distance = 0;
                var sw = $("#spatialLowerLeft").val().split(",");
                json.minlat = sw[0];
                json.minlon = sw[1];
                var ne = $("#spatialUpperRight").val().split(",");
                json.maxlat = ne[0];
                json.maxlon = ne[1];
            } else {
                json.spatialtype = 1;
                var ne = $("#spatialUpperRight").val().split(",");
                json.minlat = ne[0];
                json.minlon = ne[1];
                json.distance = $("#spatialDistance").val();
                json.unitofmeasure = 1;
            }
        }

        json.usetemporal = $('#useTemporal').is(':checked');
        if (json.usetemporal) {
            json.temporaltype = $('input:radio[name=temporalType]:checked').val();
            var after = DateUtil.getSvrDate($("#searchAfterDate").val(), '/', ':');
            var before = DateUtil.getSvrDate($("#searchBeforeDate").val(), '/', ':');

            if (json.temporaltype == 0) {
                if (after != null) {
                    json.mindatetime = after;
                }
                if (before != null) {
                    json.maxdatetime = before;
                }
            } else if (json.temporaltype == 1) {
                if (after != null) {
                    json.mindatetime = after;
                }
            } else {
                if (before != null) {
                    json.maxdatetime = before;
                }
            }
        }

        var keywords = Geof.cntrl.search.parseKeywords(encode);
        json.usekeywords = $('#useKeywords').is(':checked') && keywords.length > 0;
        if (json.usekeywords ) {
            data.keywords = keywords;
            json.keywordtype = $('input:radio[name=keywordMatch]:checked').val();
        }

        json.useprojects = $('#useProjects').is(':checked');
        var projects = [];
        if (json.useprojects) {
            $("#sltProjects option:selected").each(function () {
                projects.push(parseInt($(this).val()));
            });
            json.useprojects = projects.length > 0;
            if (json.useprojects) {
                data.projects = projects;
            }
        }
        return data;
    },

    deleteSearch:function () {

        var searchid = $("#sltSearches option:selected").val();
        if (searchid > -1) {
            var cb = function (do_delete) {
                if (do_delete) {
                    Geof.cntrl.search.searchid = -1;
                    var req = GRequest.build("search", "delete", null, {'where':{'id':searchid}});
                    TransMgr.sendNow( Geof.cntrl.search.refreshSearchList);
                }
            }

            PanelMgr.showDeleteConfirm('Delete selected search?', 'Permanently delete the selected search?', cb);
        }
    },

    linkProjects:function (projects, callback) {
        var searchid = $("#sltSearches option:selected").val();

        if (searchid != null) {
            var trans = new Transaction(Geof.session);
            var order = 0;
            var data = {"where":{"searchid":searchid}};
            var req = GRequest.build("search_project", "delete", null, data);
            req.order = order++;
            trans.addRequest(req, null);

            for (var indx in projects) {
                var data = {
                    entitya:'search',
                    entityb:'project',
                    searchid:searchid,
                    projectid:parseInt(projects[indx])
                };
                var req = GRequest.build("link", "create", null, data);
                req.order = order++;
                trans.addRequest(req, null);
            }
            trans.setLastCallback(callback);
            trans.send();
        } else {
            callback();
        }
    },

    createKeywords:function (keywords, callback) {
        var searchid = $("#sltSearches option:selected").val();
        if (searchid != null) {
            var trans = new Transaction(Geof.session);
            var order = 0;
            var data = {"where":{"searchid":searchid}};
            var req = GRequest.build("search_keyword", "delete", null, data);
            req.order = order++;
            trans.addRequest(req, null);

            for (var indx in keywords) {
                var encoded = base64.encode(keywords[indx]);
                data = {fields:{'keyword':encoded}, link:{'entity':'search', 'id':searchid}};
                req = GRequest.build("keyword", "create", null, data);
                req.order = order++;
                trans.addRequest(req, null);
            }
            trans.setLastCallback(callback);
            trans.send();
        } else {
            callback();
        }
    },

    validate:function () {
        Gicon.setEnabled("btnSaveSearch", false);
        var name = $("#searchName").val()
        if (name == null || name.length === 0) {
            return false;
        }

        if ($('#useSpatial').is(':checked')) {
            var spatialType = $('input:radio[name=spatialType]:checked').val();
            if (spatialType == 0) {
                if ($("#spatialLowerLeft").val().length == 0) {
                    return false;
                }
                if ($("#spatialUpperRight").val().length == 0) {
                    return false;
                }
            } else {
                if ($("#spatialUpperRight").val().length == 0) {
                    return false;
                }
                if ($("#spatialDistance").val().length == 0) {
                    return false;
                }
            }
        }

        if ($('#useTemporal').is(':checked')) {
            var temporalType = $('input:radio[name=temporalType]:checked').val();
            var afterDateLen = $("#searchAfterDate").val().length;
            var beforeDateLen = $("#searchBeforeDate").val().length;
            if (temporalType == 0) {
                if (afterDateLen == 0 || beforeDateLen == 0) {
                    return false;
                }
            } else if (temporalType == 1) {
                if (afterDateLen == 0) {
                    return false;
                }
            } else {
                if (beforeDateLen == 0) {
                    return false;
                }
            }
        }
        Gicon.setEnabled("btnSaveSearch", true);

        var mediaTypes = Geof.cntrl.search.getMediaTypes(true);
        Gicon.setEnabled("btnRunSearch", mediaTypes.length > 0);

        return true;
    },

    toggleSection:function (section) {
        if (section.is(":visible")) {
            section.hide();
        } else {
            section.show();
        }
    },

    setSection:function (section, visible) {
        section = $("#" + section);
        if (visible) {
            section.show();
        } else {
            section.hide();
        }
    },

    setupCalendars:function () {
        var $after = $("#searchAfterDate");
        $after.datetimepicker();

        var $before = $("#searchBeforeDate");
        $before.datetimepicker();

        var cb = function () {
            var hasAfter = $after.val().length > 0;
            var hasBefore = $before.val().length > 0;
            if (hasAfter && hasBefore) {
                $("#rbUseBoth").prop('checked', true);
            } else if (hasAfter) {
                $("#rbAfterOnly").prop('checked', true);
            } else if (hasBefore) {
                $("#rbBeforeOnly").prop('checked', true);
            }
        }

        $after.on('change', cb);
        $before.on('change', cb);

        $("#btnResetTemporal").on("click", function () {
            $after.val('');
            $before.val('');
        });
    },

    setupSpatial:function () {
        var _this = Geof.cntrl.search;
        $("#rbBoundingBox").on("click", function () {
            _this.setSpatialMode(false);
        });
        $("#rbCenterPoint").on("click", function () {
            _this.setSpatialMode(true);
        });

        $('#btnSearchSpatialMap').click(function () {
            Geof.event.addMapListener(_this.setExtentPoint);
            var options = {
                modal:true,
                bounds : _this.getSpatialBounds(),
                closeCallback: function() {
                    Geof.event.removeMapListener(_this.setExtentPoint);
                }
            }
            _this.map_popup.showDialog(options);
        })
    },

    setupKeywords:function () {
        var $searchKeywords = $("#searchKeywords");

        $searchKeywords.blur(function () {
            var $this = $(this);
            var keywords = Geof.cntrl.search.parseKeywords();
            $this.val('');
            $this.val(PhraseParser.format(keywords));
        });

        $("#btnSearchResetKeywords").click(function () {
            $("#searchKeywords").val('');
        });
    },

    parseKeywords:function(encode) {
        var text = $("#searchKeywords").val();
        if (text.length > 0) {
            return PhraseParser.parse(text, encode);
        }
        return [];
    },

    setExtentPoint:function (mapObject) {
        var _dec = 5;

        if (mapObject.extent || false) {
            var extent = mapObject.extent;
            var ne = extent.getNorthEast();
            var sw = extent.getSouthWest();
            ne = parseFloat(ne.lat()).toFixed(_dec) + ", " + parseFloat(ne.lng()).toFixed(_dec);
            sw = parseFloat(sw.lat()).toFixed(_dec) + ", " + parseFloat(sw.lng()).toFixed(_dec);
            $("#spatialUpperRight").val(ne);
            $("#spatialLowerLeft").val(sw);

        } else if (mapObject.point || false) {
            var point = mapObject.point;
            point = parseFloat(point.lat()).toFixed(_dec) + ", " + parseFloat(point.lng()).toFixed(_dec);
            $("#spatialUpperRight").val(point);
        }
        Geof.cntrl.search.validate();
    },

    setSpatialMode:function (isCentered) {
        $("#spatialLowerLeft").attr("disabled", isCentered);
        $("#spatialDistance").attr("disabled", !isCentered);
        if (isCentered) {
            $("#lblSearchSpatial").text("Center Point:");
            $("#lblSearchDistance").switchClass("search_top_disabled", "search_top");
            $("#lblSearchLowerLeft").switchClass("search_top", "search_top_disabled");
        } else {
            $("#lblSearchSpatial").text("Upper Right:");
            $("#lblSearchDistance").switchClass("search_top", "search_top_disabled");
            $("#lblSearchLowerLeft").switchClass("search_top_disabled", "search_top");
        }
    },

    populateList:function (clear_form) {

        var _this = Geof.cntrl.search;
        var cb = function(req) {
            _this.loadProjects(req)
            var searchid = localStorage.getItem("saved_searchid");
            _this.refreshSearchList(searchid, clear_form);
        }
        Geof.model.read(null, Geof.cntrl.project, cb);
    },

    populateSelect:function(selectName, btnRefresh) {
        Gicon.setEnabled(btnRefresh, true);
        var _this = Geof.cntrl.search;
        var $select = $('#' + selectName);
        $select.empty();

        var cb = function (req) {
            var data = req.data;
            for (var indx in data) {
                $select.append(Templatetor.mergeDftTemplate( data[indx], _this.option_tmpl));
            }
            Gicon.setEnabled(btnRefresh, true);
        }
        Geof.model.read(null, _this, cb);
    },

    refreshSearchList:function (searchid, clear_form) {
        if (clear_form === undefined) {
            clear_form = true
        }

        var _this = Geof.cntrl.search;
        _this.searchid = searchid || _this.searchid;

        Gicon.setActive("btnRefreshSearch", true);
        Gicon.setEnabled("btnDiscardSearch", false);

        $('#sltProjects').find('option').prop('selected', false);
        $("#searchKeywords").val('');

        var $select = $('#sltSearches');
        $select.empty();
        if (clear_form) {
            _this.clear();
        }

        if (searchid == -1) {
            Geof.cntrl.search.data = null;
        }

        var cb = function (req) {
            var data = req.data;
            var row = {'id':-1, 'name':'&lt;new search&gt;'};
            $select.append(Templatetor.mergeDftTemplate(row, _this.option_tmpl));
            for (var indx in data) {
                row = data[indx];
                $select.append(Templatetor.mergeDftTemplate(row, _this.option_tmpl));
            }
            if (_this.searchid > -1) {
                $select.val(_this.searchid);
                _this.queryForSearchDetail();
            }
            Gicon.setEnabled("btnRefreshSearch", true);
        }
        Geof.model.read(null, _this, cb);
    },

    loadProjects:function (req) {
        var _proj = Geof.cntrl.project;
        var data = req.data;
        var $select = $('#sltProjects');
        $select.empty();
        for (var indx in data) {
            $select.append(Templatetor.mergeDftTemplate(data[indx], _proj.option_tmpl));
        }

        $("#btnSearchResetProjects").on("click", function () {
            $('#sltProjects').find('option').prop('selected', false);
        });
        Gicon.setEnabled('btnSearchProjectSave',true);
        $('#searchProjectName').val('');
        Geof.cntrl.search.setSearchProjects();
    },

    setSearchProjects : function() {
        var data = Geof.cntrl.search.data;
        if ((data && data.projects) || false) {
            for (var indx in data.projects) {
                var id = data.projects[indx];
                $('#sltProjects option[value="' + id + '"]').attr("selected", "selected");
            }
        }
    },

    setSearchKeywords : function() {
        var str = "";
        var data = Geof.cntrl.search.data;
        if ((data && data.keywords) || false) {
            for (var indx in data.keywords) {
                var word = data.keywords[indx];
                if (str.length > 0) {
                    str += " ";
                }
                str += '"' + base64.decode(word) + '"';
            }
        }
        $("#searchKeywords").val(str);
    },

    resetProjects:function () {
        $("#useProjects").prop('checked', true);
        $("#projectSubSection").show();
        Geof.model.read(null, Geof.cntrl.project, Geof.cntrl.search.loadProjects);
    },

    saveProject : function() {
        Gicon.setActive('btnSearchProjectSave',true);
        var req = GRequest.buildDataFields("project","update",null);
        var proj = $("#sltProjects option:selected")[0];
        req.data.where = {'id':$(proj).val()};
        req.data.fields = {"name":$('#searchProjectName').val()};

        TransMgr.sendNow(req, Geof.cntrl.search.resetProjects);
    },

    clearMediaTypes:function () {
        $("#searchMediaList").text('');

        $("input[name=searchMediaTypesCB]").each(
            function () {
                $(this).prop('checked', false);
            }
        );
        localStorage.setItem('search_media_types','');
        Geof.cntrl.search.validate();
    },

    setError:function($label, message) {
        $label.text(message);
        setTimeout(function () { $label.text('') }, 6000);
    },

    setAsCopy:function () {
        $("#searchId").val(null);
        $("#searchName").val($("#searchName").val() + " (copy)");
    },

    resetSpatial:function () {
        $("#useSpatial").prop('checked', true);
        $("#spatialSubSection").show();
        $("#rbBoundingBox").prop('checked', true);
        Geof.cntrl.search.setSpatialMode(false);
        $("#spatialUpperRight").val('');
        $("#spatialDistance").val('');
        $("#spatialLowerLeft").val('');
    },

    resetTemporal:function () {
        $("#useTemporal").prop('checked', true);
        $("#temporalSubSection").show();
        $("#rbUseBoth").prop('checked', true);
        $("#searchAfterDate").val('');
        $("#searchBeforeDate").val('');
    },

    resetKeywords:function () {
        $("#useKeywords").prop('checked', true);
        $("#keywordsSubSection").show();
        $("#rbAnyWord").prop('checked', true);
        $("#searchKeywords").val('');
    },

    clearSearch:function() {
        Geof.cntrl.search.results = null;
        Geof.cntrl.search.data = null;
    },

    clear:function () {
        $("#searchId").val(null);
        $("#searchName").val('');
        $("#searchNotes").val('');

        Geof.cntrl.search.resetSpatial()
        Geof.cntrl.search.resetTemporal();
        Geof.cntrl.search.resetKeywords();
        Geof.cntrl.search.resetProjects();
        Geof.cntrl.search.results = null;
        Gicon.setEnabled("btnDiscardSearch", false);
        Gicon.setEnabled("btnCopySearch", false);
        Gicon.setEnabled("btnSaveSearch", false);
    },

    buildSearchJson:function ( addId ) {
        var json = {
            name:'',
            description:'',
            usespatial:false,
            spatialtype:0,
            distance:0,
            unitofmeasure:0,
            minlat:0,
            minlon:0,
            maxlat:0,
            maxlon:0,
            usetemporal:false,
            temporaltype:0,
            status:1,
            usekeywords:false,
            keywordany:false,
            keywordexact:false,
            useprojects:false
        };

        if (addId || false) {
            json.id = -1;
        }

        return json;
    },

    getSpatialBounds:function() {
        if ($("#rbBoundingBox:checked")) {
            var sw = $("#spatialLowerLeft").val().split(",")
            sw =  new google.maps.LatLng(sw[0], sw[1]);
            var ne = $("#spatialUpperRight").val().split(",");
            ne =  new google.maps.LatLng(ne[0], ne[1]);
            var bounds = new google.maps.LatLngBounds(sw,ne);
            return bounds;
        } else {
            //TODO:  need to write this code
            Geof.log("Need to write this code");
        }

    }

}
