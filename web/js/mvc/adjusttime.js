/**
 * User: jeff boehmer
 * Date: 5/8/13
 * Time: 8:30 AM
 */



var Geof = Geof || {};
Geof.media = Geof.media || {};

Geof.cntrl.adjusttime = {
    closeCB:null,
    updateCB:null,
    filelist :{},
    diffmill:0,
    file_tmpl : '<li class="ui-widget-content" data-index="%index" >'
        + '<input type="radio" name="rb_at_file" value="%index" >'
        +'<label class="stdlabel">File:</label><label class="readOnlyFont7em">%name</label><br>' +
        '<label class="stdlabel">Date: </label><label id="at_file_createdate%index" class="readOnlyFont7em">%localdate</label></li>',

    image_tmpl : '<img class="previewthumb" src="%result" title="%filename"/>',

    getSelectedFiles: function() {
        var _this = Geof.cntrl.adjusttime;
        var files = [];
        var selected = _this.selectedFiles();
        var len = selected.length;
        for ( var indx = 0; indx < len; indx++) {
            var index = $(selected[indx]).data('index');
            var file = _this.filelist[index];
            if (file || false) {
                files.push(file);
            }
        }
        return files;
    },

    selectedFiles:function() {
        return $('#olAdjusttimeItems li.ui-selected');
    },

    unselectFiles:function() {
        $('#olAdjusttimeItems li.ui-selected').removeClass("ui-selected");
        Geof.cntrl.adjusttime.setIconState();
    },

    setIconState:function() {
        var _this = Geof.cntrl.adjusttime;
        var selected = _this.getSelectedFiles();
        var len = selected.length;
        Gicon.setEnabled('adjusttimeBtnDiscard',len > 0);
        Gicon.setEnabled('btnAdjustDeselectAll',len > 0);
        Gicon.setEnabled('btnAdjustSelectAll',$('#olAdjusttimeItems li').length > 0);
        Gicon.setEnabled('btnAdjusttimeFix', len > 0 && (_this.diffmill != 0));
        Gicon.setEnabled('btnAdjusttimeUndo', false);
        for (var indx in selected) {
            if (selected[indx].orig_createdate || false ) {
                Gicon.setEnabled('btnAdjusttimeUndo', true);
                break;
            }
        }
    },

    calcTimeOffset:function() {
        var _this = Geof.cntrl.adjusttime;
        if (! (_this.viewFile || false)) {
            return;
        }

        var diffdate = DateUtil.parseDate($('#adjustedDate').val());
        if (! (diffdate || false)) {
            return;
        }

        var createdate= _this.viewFile.createdate;
        _this.diffmill = diffdate.getTime() - createdate.getTime();
        $("#adjustedDiff").text(Math.round(_this.diffmill / 1000));
        _this.setIconState();
    },

    adjustFiles:function() {
        var _this = Geof.cntrl.adjusttime;
        if (_this.diffmill == 0) {
            return;
        }

        Gicon.setActive('btnAdjusttimeFix',true);
        var files = _this.getSelectedFiles();
        for (var indx in files) {
            var file = files[indx];
            if ( ! (file.orig_createdate || false)) {
                file.orig_createdate = file.createdate;
            }
            file.createdate = new Date(file.createdate.getTime() + _this.diffmill);
            file.localdate = file.createdate.toLocaleString();
            $('#at_file_createdate' + file.index).text(file.localdate);
        }

        var file = _this.viewFile;
        $('#adjustedDate').val(DateUtil.toPickerDate(file.createdate, true));
        $("#adjustedDiff").text('');
        _this.diffmill = 0;
        _this.unselectFiles();
        Gicon.setEnabled('btnAdjusttimeFix',true);
        Gicon.setEnabled('btnAdjusttimeUndo',true);
    },

    undoAdjustFiles:function() {
        Gicon.setActive('btnAdjusttimeUndo',true);
        var _this = Geof.cntrl.adjusttime;
        var files = _this.getSelectedFiles();
        for (var indx in files) {
            var file = files[indx];
            if ( file.orig_createdate || false) {
                file.createdate = file.orig_createdate;
                file.orig_createdate = null;
            }
            file.localdate = file.createdate.toLocaleString();
            $('#at_file_createdate' + file.index).text(file.localdate);
        }

        $('#adjustedDate').val('');
        $("#adjustedDiff").text('');
        _this.diffmill = 0;
        _this.unselectFiles();
        Gicon.setEnabled('btnAdjusttimeUndo',true);
    },

    setViewFile: function(index) {
        var _this = Geof.cntrl.adjusttime;
        var file = _this.filelist[index];
        _this.viewFile = file;

        // Only process image files.
        if(!file.type.match('image.*')) {
            return;
        }

        if (!( file.createdate || false)) {
            file.createdate = DateUtil.getFileDate(file);
        }

        $('#at_filename').val(file.name);
        $('#at_filedate').text(file.createdate);
        $('#at_index').val(file.index);

        $('#adjustedDate').val(DateUtil.toPickerDate(file.createdate, true));
        $("#adjustedDiff").text('');
        _this.setIconState();

        var reader = new FileReader();

        reader.onload = ( function(e) {
                var img = _this.image_tmpl.replace(new RegExp('%filename',"g"), escape(file.name));
                img = img.replace(new RegExp('%result',"g"), e.target.result);
                $('#at_imagePreview').html(img);
        });
        reader.readAsDataURL(file);
    },

    createDialog: function (files, modal, updateCB, closeCB) {
        var _this = Geof.cntrl.adjusttime;
        var _modal = (modal == null) ? true : modal;
        _this.updateCB = updateCB;

        var cb = function(html) {
            $('#mainBody').append(html);
            $("#a_123").focus();
            $('#adjustedDate').datetimepicker({
                changeMonth: true,
                changeYear: true,
                timeFormat: 'HH:mm:ss',
                showSecond:true
            });

            var $dlg = $('#adjusttime_dialog');
            if (updateCB || false) {
            }

            $dlg.dialog({ autoOpen: false,
                close: function(ev, ui) {
                    $("#adjusttime_dialog").remove();
                    if (closeCB || false) {
                        closeCB();
                    }
                },
                modal:_modal, resizable:true, draggable:true,
                width:'800', height:'640', position:'top',
                title:'Adjust Date/Time of Files'
            });

            for(var i = 0, f; f = files[i]; i++) {
                if (f.createdate || false) {
                    f.localdate = f.createdate.toLocaleString();
                }
                _this.filelist[f.index] = f;
                var li = Templatetor.mergeDftTemplate(f,_this.file_tmpl);
                $("#olAdjusttimeItems").append( li );
            }

            $('#olAdjusttimeItems').selectable({
                stop: function() {
                    _this.setIconState();
                }
            });

            $("input:radio[name=rb_at_file]").on('click', function() {
                _this.setViewFile($(this).val());
            });

            $('#adjustedDate').blur(_this.calcTimeOffset);
            $('#adjustedDate').change(_this.calcTimeOffset);

            Gicon.click('btnAdjusttimeFix',_this. adjustFiles);

            Gicon.click('btnAdjustSelectAll',function() {
                $('#olAdjusttimeItems li').each(function() {
                    $(this).addClass('ui-selected');
                });
                Geof.cntrl.adjusttime.setIconState();
            });

            Gicon.click('btnAdjustDeselectAll',function() {
                $('#olAdjusttimeItems li').removeClass('ui-selected');
                Geof.cntrl.adjusttime.setIconState();
            });

            Gicon.click('adjusttimeBtnDiscard',function() {
                $('#olAdjusttimeItems li.ui-selected').remove();
                Geof.cntrl.adjusttime.setIconState();
            });

            Gicon.click('btnAdjusttimeUndo', _this.undoAdjustFiles);

            $dlg.dialog( "open" );
        };
        $.get("view/adjusttime.html", cb);
    }
}