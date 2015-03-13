/**
 * User: jeff boehmer
 * Date: 5/31/13
 * Time: 9:09 AM
 */

var Geof = Geof || {};

Geof.cntrl.full = {
    ol:'sltFullSearches',
    ol_selected:'#sltFullSearches option:selected',
    btnRefresh:'btnFullRefreshSearch',
    btnClearMedia: 'btnClearFullSearchMedia',
    btnRunSearch:'btnRunFullSearch',
    lblMediaList:'fullMediaList',
    lblResultsView:'fullResultsCount',
    divResultsView: 'fullResultsView',

    initialize:function () {
        var _this = Geof.cntrl.full;
        _this.$ol = $("#sltFullSearches");
        _this.$lblMediaList = $('#' + _this.lblMediaList);
        _this.$lblResultsView = $('#' + _this.lblResultsView);
        _this.$divResultsView = $('#' + _this.divResultsView);
        _this.$fullMediaTypes = $('#fullMediaTypes');
        _this.$btnClearMedia =  $('#btnClearFullSearchMedia');

        Gicon.click(_this.btnRefresh,_this.populateSelect);
        Gicon.click(_this.btnRunSearch, _this.execute);
        _this.$btnClearMedia.click(_this.clearMediaTypes);

        _this.$ol.click(function() {
            Gicon.setEnabled(_this.btnRunSearch, true);
        });

        var mtypes = localStorage.getItem('search_media_types') || "";
        _this.$lblMediaList.text(mtypes);

        mtypes = mtypes.split(",");
        for (var indx in mtypes) {
            for (var i in Filetypes.media_names) {
                if (Filetypes.media_names[i] == mtypes[indx]){
                    $("input:checkbox[name=fullMediaTypesCB][value='" + i + "']").attr('checked', 'checked');
                }
            }
        }

        var $list = _this.$lblMediaList;
        $list.click(function () {
            var offset = $list.position();
            var ddtop = offset.top + $list.height() + 9;
            var dropdown = _this.$fullMediaTypes;
            dropdown.css({top:ddtop, left:offset.left, position:'absolute'});
            dropdown.show();

            $(document).on('mouseup', function (e) {
                if (dropdown.has(e.target).length === 0) {
                    $(document).unbind('mouseup');
                    dropdown.hide();
                    var list = _this.getMediaTypes(false);
                    var text = [];
                    for (var indx in list) {
                        text.push(Filetypes.media_names[parseInt(list[indx])]);
                    }
                    text = text.join();
                    $list.text(text);
                    localStorage.setItem('search_media_types',text);
                }
            });
        });

        _this.populateSelect();
    },

    setView: function(evt) {
//        Geof.log('full_view.setView: ' + evt);
        var _this = Geof.cntrl.full;
        var viewName = evt.subview;
        _this.view = Geof.cntrl[viewName];
        var cb = function() {
            var container = Geof.cntrl.full.$divResultsView;
            container.empty();
            container.append( Geof.src[viewName].view );
            _this.view.initialize();
            _this.view.resize(container);
            if (evt.onload || false) {
                evt.onload();
            }
        };
        Geof.Retrieve.getView(viewName, cb);
    },

    executeCB:function(req) {
        var _this = Geof.cntrl.full;
        var results = req[0].data;
        Geof.cntrl.search.results = results;

        var row;
        for (var indx in results) {
            row = results[indx];
            if (row.geomtype == 0) {
                row.gpsPoint = {
                    latitude:row.latitude,
                    longitude:row.longitude,
                    utcdate:row.utcdate
                };

            } else if (row.geomtype == 1) {
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
        _this.view.loadList(results, _this.execute);
        _this.$lblResultsView.text("Files - " + results.length);
        Gicon.setEnabled(_this.btnRunSearch, true);
        if (_this.refreshCallback || false) {
            _this.refreshCallback(results);
            _this.refreshCallback = null;
        }
    },

    execute: function(callback) {
        var _this = Geof.cntrl.full;
        _this.refreshCallback = callback;
        Gicon.setActive(_this.btnRunSearch,true);
        _this.$lblResultsView.text("");

        var searchid = parseInt($(_this.ol_selected).val());
        var data = {
            "where":{"id":searchid},
            filetypes: _this.getMediaTypes(true)
        };
        TransMgr.sendNow(GRequest.build("search","execute",null,data),_this.executeCB);
    },

    getMediaTypes:function(join) {
        var list = $("input[name=fullMediaTypesCB]:checked").map(
            function () {
                return this.value;
            }).get();

        if (join || false) {
            list = list.join();
        }
        return list
    },

    clearMediaTypes:function () {
        var _this = Geof.cntrl.full;
        _this.$lblMediaList.text('');

        $("input[name=fullMediaTypesCB]").each(
            function () {
                $(this).prop('checked', false);
            }
        );
    },

    populateSelect:function() {
        var _this = Geof.cntrl.full;

        Gicon.setActive(_this.btnRefresh, true);
        _this.$ol.empty();
        var tmpl = Geof.cntrl.search.option_tmpl
        var cb = function (req) {
            var data = req.data;
            for (var indx in data) {
                _this.$ol.append(Templatetor.mergeDftTemplate( data[indx], tmpl));
            }
            Gicon.setEnabled(_this.btnRefresh, true);
        }
        Geof.model.read(null, Geof.cntrl.search, cb);
    }

}

