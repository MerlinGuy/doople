
Geof.cntrl.datagrid = {

    name:'datagrid',
    title : null,
    columns : ['id','originalname','filesize','status','storagelocid'],
    grid : null,
    filtered : false,
    filterData : null,
    toggle_view : null,
    colModel : null,

    initialize: function() {
        var _this = Geof.cntrl.datagrid;

        Gicon.click("btnDatagridFilter",_this.filterResults);

        $('#dgFilterText').keyup( function() {
            var hasPattern = $(this).val().length > 0
            Gicon.setEnabled("btnDatagridFilter", hasPattern);
            if (_this.filtered) {
                _this.filtered = false;
                _this.setGridData(_this.data);
            }
        });

        _this.toggle_view = new Geof_toggle_icon(['btnGdgShowPhoto','btnGdgShowGMap'], null);

        $( '.buttonBar' ).tooltip();

        _this.colModel = [
            {'name':"id",'label':"ID",'sortable':false,'width':20, align:"right"},
            {'name':"originalname",'label':"Original Name",'sortable':false,'width':90, align:"left"},
            {'name':"createdate",'label':"Create Date",'sortable':false,'width':90, align:"right"},
            {'name':"filesize",'label':"File Size",'sortable':false,'width':40, align:"right"},
            {'name':"status",'label':"Status",'sortable':false,'width':30, align:"right"},
            {'name':"storagelocid",'label':"Storage Location",'sortable':false,'width':40, align:"right"}
        ];

        _this.loadList();

    },

    resize:function() {
        var _this = Geof.cntrl.datagrid;
        if (_this.data || false) {
            _this.setGridData(_this.data)
        }
    },

    filterResults:function() {
        var _this = Geof.cntrl.datagrid;
        var pattern = $('#dgFilterText').val();
       _this.filterData = Geof_data.filter(_this.data, pattern, _this.columns);
        _this.filtered = true;
        _this.setGridData(_this.filterData);
    },

    selectRow: function(id) {
        var _this = Geof.cntrl.datagrid;
        var icon_id = _this.toggle_view.getActive();
        var jsonData = _this.filtered ? _this.filterData: _this.data;
        if (icon_id ==='btnGdgShowPhoto') {
            var where = {'id':parseInt(id)};
            var records = Geof_data.constrain(jsonData, where, true);
            if (records.length > 0) {
                var rec = records[0];
                Filetypes.showPopup(Geof.cntrl.search.getResultsFile(rec.id));
            }
        } else if (icon_id ==='btnGdgShowGMap') {
            var where = {'id':parseInt(id),'filetype':[Filetypes.PHOTO, Filetypes.TRACK]};
            var records = Geof_data.constrain(jsonData, where, true);
            if (records.length > 0) {
                var options = {
                    files:records,
                    modal:false
                }
                Geof.map_popup.showDialog(options);
                Geof.map_popup.findMapData(id);

            }
        }
    },

    loadList:function(results, refreshAction){
        var _this = Geof.cntrl.datagrid;
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

        if ((! _this.data) || _this.data.length == 0) {
            return;
        }
        _this.setGridData(_this.data);
    },

    setGridData: function(jsonData) {

        $("#geofdatagrid").jqGrid('clearGridData',true).trigger('reloadGrid');

        var _this = Geof.cntrl.datagrid;
        _this.data = jsonData;
        var count = jsonData.length;
        var hdr_ftr = 75;
        var row_height = 21;

        _this.grid = $("#geofdatagrid");
        var hAvail = $(document).height() - (_this.grid.offset().top + hdr_ftr + 10) ;
        var pageSize = Math.min(Math.round(hAvail / row_height), count);
        var gridHeight = (pageSize * row_height) + 14;

        _this.grid.jqGrid({
            caption: "Search Results",
            datatype:'local',
            colModel:_this.colModel,
            sortable:true,
            gridview:true,
            height:gridHeight,
            altRows:true,
            ignoreCase:true,
            onSelectRow:_this.selectRow,
            multiselect:true,
            rowNum:pageSize,
            pager:'#dv_pager'
        });

        _this.grid.setGridParam({ data: jsonData, rowNum: pageSize }).trigger('reloadGrid');
        _this.grid.jqGrid('setGridHeight',gridHeight);
        var gridWidth = $('#datagrid_container').parent().width() -10;
        Geof.log(gridWidth);
        _this.grid.setGridWidth(gridWidth,true);

        $("#geofdatagrid").attr('width', gridWidth-25);
    }
}
