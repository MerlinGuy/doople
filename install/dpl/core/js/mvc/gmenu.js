
var Geof = Geof || {};

Geof.cntrl = {};
Geof.src = {};
Geof.menuctrl = {
    stage:null,
    dftStrWidth:2,
    callbacks:[],
    history:[],
    history_loc:null,
    add_history:true,
    home_menu:{type:'menu',name:'main'},
    cur_menu: undefined,
    last_menu:null,
    initialized:false,
    active_quick:undefined,
    quicklist:[],
    quicktmpl : '<span class="pointer floatLeft quick_icon" id="quickicon_%menuname"></span>',
    hardcode_quick:[
        {name:'search',img:'search.png'},
        {name:'upload',img:'Gnome-Go-Up-64.png'}
    ],
    $quick_div:undefined,

    setStage: function(div) {
        var _this = Geof.menuctrl;
        if (_this.initialized) {
            return;
        }
        _this.initialized = true;
        var menus = Geof.menus;
        var menu;
        Object.keys(menus).forEach(function(key) {
            menu = menus[key];
            var len = menu.length;
            for (var indx=0; indx<len;indx++) {
                menu[indx].parent = key;
            }
        });

        var $container = $("#" + div)[0];
        _this.stage = new Kinetic.Stage({
                container: div,
                width: $container.clientWidth *.98,
                height: $container.clientHeight*.98
            });
        var ls_home_menu = localStorage.getItem('home_menu') ;
        if (ls_home_menu != null && ls_home_menu != 'null') {
            try {
                _this.home_menu = $.parseJSON(ls_home_menu);
            } catch(e) { }
        }
        _this.change( _this.home_menu );
        Geof.menuctrl.getQuickList();
    },

    initUI:function(callback, quick_div) {
        if (callback || false) {
            Geof.menuctrl.addCallback(callback);
        }
        Geof.menuctrl.$quick_div = $("#" + quick_div);
    },

    hideAll:function() {
        $("#divMenu").hide();
        $("#divPanel").hide();
        $("#divView").hide();
    },

    addCallback:function(callback) {
        this.callbacks.push(callback);
    },

    removeCallback:function(callback) {
        JsUtil.splice(this.callbacks, callback);
    },

    fireCallbacks:function() {
        var callbacks = this.callbacks;
        var menu = this.cur_menu;
        Object.keys(callbacks).forEach(function(key) {
            callbacks[key](menu);
        });
    },

    change:function(evt) {
        var _this = Geof.menuctrl;

        if (_this.unload || false) {
            _this.unload();
            _this.unload = null;
        }

        if (!(evt || false)) {
            evt = {type:'menu',name:'main'};
        }

        if (evt.type == 'menu') {
            _this.setMenu(evt.name);
        } else if (evt.type == 'panel') {
           _this.setPanel(evt.name);
        } else if (evt.type == 'view') {
           _this.setView(evt);
        }  else if (evt.type == 'map') {
            _this.setMap(evt);
        } else {
            return;
        }
        if ( _this.add_history) {
            _this.addHistory(evt);
        }
        _this.cur_menu = evt;
        _this.hiliteActiveQuick();
        _this.fireCallbacks();
    },

    hasHistory:function() {
        return Geof.menuctrl.history.length > 1;
    },

    inHistory:function() {
        var mctrl = Geof.menuctrl;
        var hloc = mctrl.history_loc;
        return (hloc > -1 && hloc < (mctrl.history.length -1));
    },

    addHistory:function(evt) {
        var _this = Geof.menuctrl;
        _this.history.push(evt);
        _this.history_loc = _this.history.length -1;
    },

    setMenu: function(menu_name) {
        var _this = Geof.menuctrl;
        try {
            _this.showMenu();
            _this.stage.removeChildren();
            _this.stage.clear();

            if (menu_name == 'main') {
                _this.history.length = 0;
            }

            var layer = new Kinetic.Layer();
            var connectorLayer = new Kinetic.Layer();
            _this.stage.add(connectorLayer);
            _this.stage.add(layer);

            var menus = Geof.menus[menu_name];
            Object.keys(menus).forEach(function(key) {
                new Geof.UiIcon(menus[key], layer);
            });

        } catch(e){
            _this.setMenu('main');
        }
    },

    showMenu:function() {
        $("#divPanel").hide();
        $("#divView").hide();
        $("#divMenu").show();
        if (Geof.menuctrl.last_menu == null){
            Geof.menuctrl.last_menu = {type:'menu',name:'main'};
            Geof.menuctrl.change(Geof.menuctrl.last_menu);
        }
    },

    gotoMenu:function(indx) {
        var _this = Geof.menuctrl;
        _this.add_history = false;
        var newIndex = -1;
        if (indx !== undefined) {
            newIndex = _this.history_loc + indx;
        }
        if (newIndex > -1 && newIndex <= _this.history.length) {
            _this.history_loc = newIndex;
            var evt = _this.history[_this.history_loc];
            Geof.menuctrl.change(evt);
        } else if (Geof.menuctrl.cur_menu !== undefined){
            _this.change({name:_this.cur_menu.parent,type:'menu'});
        } else {
            Geof.menuctrl.change({type:'menu',name:'main'});
        }
        _this.add_history = true;
    },

    setCurrentMenu:function(menu) {
        Geof.menuctrl.cur_menu = menu;
    },

    getMenu:function(menuName) {
        var menu, submenu;
        var menus = Geof.menus;
        var rtn = undefined;
        Object.keys(menus).forEach(function(key) {
            menu = menus[key];
            for (var indx=0; (indx<menu.length) && (rtn === undefined); indx++) {
                submenu = menu[indx];
                if (submenu.name == menuName) {
                    rtn = submenu;
                    break;
                }
            }
        });
        return rtn;
    },

    setHomeMenu:function(menu) {
        localStorage.setItem('home_menu',JSON.stringify(menu));
        Geof.menuctrl.home_menu = menu;
    },

    setMap: function(menu) {
        var _this = Geof.menuctrl;
        var baseX = 300;
        var incX = 150;
        var baseY = 0;
        var incY = 100;
        try {
            _this.stage.removeChildren();
            _this.stage.clear();
            var menu_name = menu.name;
            _this.showMap();

            var layer = new Kinetic.Layer();
            var connectorLayer = new Kinetic.Layer();
            _this.stage.add(connectorLayer);
            _this.stage.add(layer);

            menu = Geof.menus[menu_name];
            var icons = menu.icons;
            var icon;
            var iconMap = {};
            Object.keys(icons).forEach(function(key) {
                icon = icons[key];
                icon.isMap = true;
                icon.x = baseX + (icon.col * incX);
                icon.y = baseY + (icon.row * incY);
                iconMap[icon.name] = new Geof.UiIcon(icon, layer, connectorLayer);
            });
            connectorLayer.draw();
            layer.draw();
            if (menu.initialize || false) {
                menu.initialize(iconMap);
            }
            if (menu.unload !== undefined) {
                _this.unload = menu.unload;
            }
        } catch(e){
            _this.setMenu('main');
        }
    },

    showMap:function() {
        $("#divPanel").hide();
        $("#divView").hide();
        $("#divMenu").show();
    },

    setPanel:function(entity_name) {
        if (Geof.src[entity_name] || false) {
            PanelMgr.loadListPage(entity_name, 'divPanel', Geof.menuctrl.showPanel);
        } else {
            var cb = function() {
                PanelMgr.loadListPage(entity_name, 'divPanel', Geof.menuctrl.showPanel);
            };
            Geof.Retrieve.getEntity(entity_name, cb, ["list","edit"]);
        }
        $("#divPanel").show();
    },

    showPanel:function(entity_name) {
        $( '#divPanel' ).tooltip();

        Geof.cntrl[entity_name].initialize();
        $("#divMenu").hide();
        $("#divView").hide();
        $("#divPanel").show();
        PanelMgr.showPanel(entity_name);
    },

    setView:function(menuObj) {
        var view = menuObj.name;
        var viewfile = menuObj.viewfile || view;
        var _this = Geof.menuctrl;

        var cb = function() {
            PanelMgr.loadView(viewfile);
            _this.showView(viewfile);
            _this.unload = menuObj.unload;
            if (view != viewfile) {
                Geof.cntrl[viewfile].setView(menuObj);
            }
        };
        Geof.Retrieve.getView(viewfile, cb);
        $("#divView").show();
    },

    showView:function(entity_name) {
        $( '#divView' ).tooltip();
        Geof.cntrl[entity_name].initialize();
        $("#divMenu").hide();
        $("#divPanel").hide();
        $("#divView").show();
        PanelMgr.setViewSize($("#" + entity_name + '_view'));
    },

    saveQuickIcon:function() {
        var GMenu = Geof.menuctrl;
        var cur_menu = GMenu.cur_menu;
        if (cur_menu !== undefined) {
            var qlist = GMenu.quicklist;
            for (var indx=0;indx<qlist.length; indx++) {
                if(qlist[indx].name === cur_menu.name) {
                    return;
                }
            }
            var icon = {name:cur_menu.name,img:cur_menu.imageSrc};
            qlist.push(icon);
            GMenu.quicklist = qlist;
            GMenu._addQuickIcon(icon);
            GLocal.setJson("QUICKLIST",qlist);
        }

    },

    removeQuickIcon:function() {
        var GMenu = Geof.menuctrl;
        var cur_menu = GMenu.cur_menu;
        if (cur_menu !== undefined) {
            var qlist = GMenu.quicklist;
            var newlist = [];
            for (var indx=0;indx<qlist.length; indx++) {
                if(qlist[indx].name !== cur_menu.name) {
                    newlist.push(qlist[indx]);
                }else {
                    $("#quickicon_" + cur_menu.name).remove();
                }
            }
            GMenu.quicklist = newlist;
            GLocal.setJson("QUICKLIST",newlist);
        }
    },

    getQuickList:function() {
//        GLocal.setJson("QUICKLIST",[]);
        var GMenu = Geof.menuctrl;
        var qlist = GMenu.hardcode_quick;
        var indx;
        for (indx=0;indx<qlist.length; indx++) {
            GMenu._addQuickIcon(qlist[indx]);
        }
        qlist = GLocal.getJson("QUICKLIST") || [];
        for (indx=0;indx<qlist.length; indx++) {
            GMenu._addQuickIcon(qlist[indx]);
        }
        GMenu.quicklist = qlist;
    },

    _addQuickIcon:function(icon) {
        var GMenu = Geof.menuctrl;
        if (GMenu.$quick_div !== undefined){
            var tmpl = GMenu.quicktmpl;
            GMenu.$quick_div.append(
                Templater.mergeTemplate({menuname:icon.name},tmpl)
            );
            var $icon =$("#quickicon_" + icon.name);
            $icon.css("background-image","url(" + Geof.img_gray_dir + icon.img + ")");
            $icon.click(function() {
                GMenu.callQuickIcon($icon, icon.name);
            });
        }
    },

    callQuickIcon:function($icon, menuname) {
        var menu = Geof.menuctrl.getMenu(menuname);
        Geof.menuctrl.change(menu);
    },

    hiliteActiveQuick:function() {
        var GMenu = Geof.menuctrl;
        var cur_menu = GMenu.cur_menu;
        if (cur_menu !== undefined) {
            if (GMenu.active_quick !==  undefined) {
                var url = GMenu.active_quick.css('background-image');
                url = url.replace(new RegExp('/symbol/', "g"), "/symbolgray/");
                GMenu.active_quick.css('background-image',url);
                GMenu.active_quick = undefined;
            }
            var id = "quickicon_" + cur_menu.name;
            $("#div_quick_icon").find("span").each(function() {
                var $this = $(this);
                if ($this.attr('id') == id) {
                    GMenu.active_quick = $this;
                    var url = GMenu.active_quick.css('background-image');
                    url = url.replace(new RegExp('/symbolgray/', "g"), "/symbol/");
                    GMenu.active_quick.css('background-image',url);
                }
            });
        }
    }
};

