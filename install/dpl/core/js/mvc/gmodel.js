/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 4/9/13
 * Time: 3:34 PM
 */
    
var Geof = Geof || {};

Geof.model = {
    create : function (data, cntrl, callback) {
        var trans = new Transaction(Geof.session);
        var jsonCreate = GRequest.build(cntrl.entity, "create", null, data);
        trans.addRequest(jsonCreate, callback);
        trans.send();
    },

    read : function (where, cntrl, callback, actionAs) {
        var data = {};
        if (where || false) {
            if (Geof.cntrl.getObjectClass(where) == 'Array') {
                data.complexwhere = where;
            } else {
                data.where = where;
            }
        }
        actionAs = (actionAs || false) ? actionAs: null;
        data.orderby = cntrl.order_by;
        var columns = cntrl['list_columns']
        if (columns || false) {
            data.columns = columns;
        }
        var trans = new Transaction(Geof.session);
        trans.addRequest(GRequest.build(cntrl.entity, 'read', actionAs, data), callback);
        trans.send();
    },

    readOptions : function (options) {
        var data = {};
        //handle options first / cntrl object settings second
        var entity = options.entity || false;
        var columns = options.columns || false;
        var orderby = options.orderby || false;

        // If there is an options.cntrl use that to fill in missing elements if available
        var cntrl = options.cntrl || false;
        if (cntrl) {
            if (! entity ) {
                entity = cntrl.entity;
            }
            if ((!columns)&&((cntrl.list_columns || false))) {
                columns = cntrl.list_columns;
            }
            if ((!orderby)&&((cntrl.order_by || false))) {
                orderby = cntrl.order_by;
            }
        }

        if (columns) {
            data.columns = columns;
        }
        if (orderby) {
            data.orderby = orderby;
        }
        if (options.join || false) {
            data.join = options.join;
        }

        var where = options.where;
        if ( where || false) {
            if (Geof.cntrl.getObjectClass(where) == 'Array') {
                data.complexwhere = where;
            } else {
                data.where = where;
            }
        }

        var trans = new Transaction(Geof.session);
        trans.addRequest(GRequest.build(entity, 'read', options.actionAs, data), options.callback);
        trans.send();
    },

    readAs : function (where, actionas, cntrl, callback) {
        Geof.model.read(where, cntrl, callback, actionas);
    },

    readSelected : function ($item, cntrl, callback) {
        Geof.model.readRecord($item.data(cntrl.id), cntrl, callback);
    },

    readRecord : function (id, cntrl, callback) {
        var where = {};
        where[cntrl.id] = id;

        var data = {};
        data.where = where;
        var columns = cntrl.fields;
        if ( columns === undefined){
            columns = cntrl.list_columns;
        } else {
            columns = columns.join();
        }
        if (columns || false) {
            data.columns = columns;
        }
        var trans = new Transaction(Geof.session);
        trans.addRequest(GRequest.build(cntrl.entity, 'read', null, data), callback);
        trans.send();
    },

    readColumns : function (where, cntrl, columns, callback) {
        var data = {'where':where,'columns':columns};
        var trans = new Transaction(Geof.session);
        trans.addRequest(GRequest.build(cntrl.entity, 'read', null, data), callback);
        trans.send();
    },

    update : function (data, cntrl, callback) {
        var trans = new Transaction(Geof.session);
        var jsonUpd = GRequest.build(cntrl.entity, 'update', null, data);
        jsonUpd.data.where = {};
        jsonUpd.data.where[cntrl.id] = data.fields[cntrl.id];
        trans.addRequest(jsonUpd, callback);
        trans.send();
    },

    create : function (data, cntrl, callback) {
        var trans = new Transaction(Geof.session);
        var jReq = GRequest.build(cntrl.entity, 'create', null, data);
        trans.addRequest(jReq, callback);
        trans.send();
    },

    delete : function (where, cntrl, callback) {
        var trans = new Transaction(Geof.session);
        var jsonDel = GRequest.buildDataWhere(cntrl.entity, 'delete', null);
        if (Geof.cntrl.getObjectClass(where) == 'Array') {
            jsonDel.data.complexwhere = where;
        } else {
            jsonDel.data.where = where;
        }
        trans.addRequest(jsonDel, callback);
        trans.send();
    },

    deleteList : function (ids, cntrl, callback) {
        var order = 0;
        var trans = new Transaction(Geof.session);

        for (var indx=0; indx< ids.length;indx++){
            var jsonDel = GRequest.buildDataWhere(cntrl.entity, 'delete', null);
            jsonDel.data.where[cntrl.id] = ids[indx];
            jsonDel.order = order++;
            trans.addRequest(jsonDel, null);
        }
        trans.setLastCallback(callback);
        trans.send();
    },

    deleteList2 : function (cntrl, callback, msg) {
        var eName = JsUtil.capitalize(cntrl.entity);
        var ids = Geof.model.selectedIds($("#ol" + eName + "s .ui-selected"), cntrl);
        if (ids.length > 0){
            Gicon.setActive('btnDiscard' + eName,true);
            var cb = function(doDelete) {
                if (doDelete) {
                    Geof.model.deleteList(ids, cntrl, callback);
                }
                Gicon.setEnabled('btnDiscard' + eName,true);
            };
            PanelMgr.showDeleteConfirm("Delete Record", msg, cb);
        }
    },

    execute : function (id, cntrl, callback) {
        var trans = new Transaction(Geof.session);
        var jsonExec = GRequest.buildDataWhere(cntrl.entity, 'execute', null);
        jsonExec.data.where['id'] = id;

        trans.addRequest(jsonExec,callback);
        trans.send();
    },

    selectedIds:function(list,cntrl) {
        var ids = [];
        $(list).each(function(item){
            ids.push($(this).data(cntrl.id));
        })
        return ids;
    },

    getFields:function(cntrl) {
        var fields = {};
        for (var indx in cntrl.fields) {
            fields[cntrl.fields[indx]] = cntrl.defaults[indx];
        }
        return fields;
    },

    copyFields:function(cntrl, source) {
        var fields = {};
        var name;
        var value
        for (var indx in cntrl.fields) {
            name = cntrl.fields[indx];
            value = source[name]
            if ( name in source && value != null) {
                fields[name] = value;
            }
        }
        return fields;
    }
};

