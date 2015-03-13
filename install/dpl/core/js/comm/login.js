/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 8/13/13
 * Time: 8:28 AM
 */
var Geof = Geof || {};
Geof.can_clear_text_login = true;
Geof.logged_in = false;

Geof.login = {

    dialog:null,
    cfg: {
        file:'login_dialog',
        directory:'core/panel/',
        divName:'login_dialog',
        dragbar:'buttonBarLogin'
    },

    setControl : function( ){
        var _this = Geof.login;
        var cfg = _this.cfg;

        cfg.complete_callback = function() {
            _this.dialog = $('#' + Geof.login.cfg.divName);

            $('#btnLogin').click(function() {
                Geof.session.login($('#loginname').val(),$('#password').val());
            });

            Gcontrol.checkbox('cbAutoLogin', null, "auto_login");

            $('#btnCancelLogin').click( _this.hide );

            $('#login_dialog').keydown(function(event){
                if(event.keyCode==13){
                    $('#btnLogin').trigger('click');
                }
            });

            Gicon.click('closeLoginDialog',_this.hide);
            _this.initializeSession();
            if (_this.cfg.button) {
                Gicon.click(_this.cfg.button, _this.show, true);
            }
        };
        PanelMgr.loadDialogY( cfg );

    },

    show:function(error) {
        $("#lblLoginError").text((error || false) ? error : '');
        $("#cbAutoLogin").prop('checked', GLocal.getBoolean("auto_login"));
        $("#loginname").val( GLocal.get("login","") );
        $("#password").val( GLocal.get("pwd", "") );

        $('#login_dialog').keydown(function(event){
            if(event.keyCode==13){
                $('#btnLogin').trigger('click');
            }
        });

        var dialog = Geof.login.dialog;
        dialog.show();
        Geof.center_in_body(dialog);
    },

    hide:function() {
        Geof.login.dialog.hide();
    },

    initializeSession: function() {
        var state = Geof.session.canAutoLogin();
        if (state.can_login) {
            Geof.session.tryAutologin();
        } else if ((! Geof.can_clear_text_login) && (!state.has_cipher) ) {
            Geof.cntrl.profile.edit();
        } else {
            Geof.login.show();
        }
    }

};