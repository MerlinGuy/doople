
var Geof = Geof || {};
Geof.stats = Geof.stats || {looptime:0,proctime:0};

////////////////////////////////////////////////////////////////////////
function GSession(rsaObject) {
	this.sessionId = null;
	this.url = "";
	this.webservice = "geof";
	this.urlroot = "";
	this.usr = null;
    this.svr_addr = "";
	this.loginRequest = null;
	this.loginCallbacks = [];
    this.autoencrypt = false;
    this.sendAesWithLogin = false;
    this.encrypting_callback = null;
    this.sendtime = -1;

    this.encrypt = null;
    this.rsa = (rsaObject || false) ? rsaObject : null;
    this.rsa_key = null; // {id, modulus, exponent}
    this.aes = null;
    this.auto_renew_rsa = false;
}

GSession.prototype.initialize = function(encrypting_callback) {
    this.encrypting_callback = encrypting_callback;
    this.setupUrl();
    if (! this.usr) {
        this.usr = new GUser();
    }
    var auto_login = GLocal.getBoolean("auto_login");
    if (auto_login) {
        this.usr.loginname = GLocal.get('login');
        this.usr.password = GLocal.get('pwd');
    }

    this.autoencrypt = auto_login && GLocal.getBoolean('autoencrypt');
    this.auto_renew_rsa = this.getRsaRenewal();

    var rsa_key = this.getRsaKeyLocal();
    if (rsa_key != null ) {
        this.setRsaKey(rsa_key);
        if (this.autoencrypt) {
            this.aes = new SjclAes();
            this.sendAesWithLogin = true;
            this.sendEncryptingCB(true);
        }
    } else if (!this.auto_renew_rsa ) {
        var err;
        if (this.autoencrypt) {
            err = "There is no RSA key available and 'Auto Renew Rsa' is deactivated, so switching 'autoencrypt to false";
            GLocal.setBoolean('autoencrypt',false);
            this.encrypting_callback(false,err);
        }
    }
};

GSession.prototype.storeAutoLoginLocal = function(autologin) {
    var _this = Geof.session;
    GLocal.setBoolean("auto_login",autologin);
    if (autologin) {
        GLocal.set('autologin', 'true');
        GLocal.set('login', _this.usr.loginname);
        GLocal.set('pwd', _this.usr.password);
    } else {
        GLocal.set('autologin', 'false');
        GLocal.set('login', "");
        GLocal.set('pwd', "");
    }
};

GSession.prototype.setAutoEncrypt = function(autoencrypt) {
    this.autoencrypt = autoencrypt;
    GLocal.setBoolean('autoencrypt', this.autoencrypt);
};

//GSession.prototype.setUser = function(usr) {
//	this.usr = usr;
//	this.rebuildLoginRequest();
//};

GSession.prototype.usrName = function() {
    var usr = Geof.session.usr;
    return usr.lastname + ", " + usr.firstname;
};

GSession.prototype.id = function() {
    return Geof.session.usr.usrid
};

GSession.prototype.login = function(loginName, password) {
    var _this = Geof.session;

    var gcn = Geof.cntrl.notification;
    if ((!Geof.can_clear_text_login) && (_this.rsa == null)) {
        var err = "No clear text login allowed and Rsa Key is not available";
        Geof.notifier.addLocal(err,gcn.levels.Alert,gcn.types.System);
        return;
    }

	if (loginName && password) {
		if (! this.usr) {
			this.usr = new GUser();
		}
		this.usr.loginname = loginName;
		this.usr.password = password;
		this.rebuildLoginRequest();
	}
	if (!this.usr) {
        Geof.notifier.addLocal(
            "ERROR: GSession.prototype.login - no user",
            gcn.levels.Alert,gcn.types.System);
        return;
	}

    var trans = new Transaction(this);
    this.loginRequest.order = 0;
    trans.addRequest(this.loginRequest, this.loginComplete);

//    TransMgr.sendNow(this, this.loginRequest, this.loginComplete);
    if (this.sendAesWithLogin && this.aes != null) {
        var aeskey = this.aes.getKeyAsHex();
//        Geof.log("hex aeskey:" + aeskey);
//        Geof.log("iv:" + aes.getIvAsHex());
        var request = GRequest.build('rsaencryption','create', "aeskey", {"aeskey":aeskey});
        request.order = 1;
        var cb = function(req) {
            var record = req.data[0];
            var success = record.success;
            if (success) {
                _this.cipher = _this.aes;
                _this.sendEncryptingCB(true);
            }
        };
        trans.setEncryption("rsa");
        trans.addRequest(request, cb);
    }
    trans.send();
};

GSession.prototype.logout = function() {
    var _this = Geof.session;
    TransMgr.sendNow( _this.getLogoutRequest(), _this.logoutComplete);
};

GSession.prototype.loginComplete = function(request) {
	try {
        var _this = Geof.session;
        var stats = Geof.stats;
        stats['sendtime'] = (stats.looptime - stats.proctime)/2;

        var data = request.data;
        if (data === undefined) {
            _this.sendLoginCallbacks(false);
            return;
        }
        _this.sessionId = data.sessionid;
		
		// check that login worked
		if (! data.login) {
            _this.sendLoginCallbacks(false);
			return;
		}
		if (! _this.usr) {
            _this.usr = new GUser();
		}
		var usr =_this.usr;
		usr.firstname = data.firstname;
        usr.lastname = data.lastname;
        Geof.permissions = data.permissions;
        Geof.security = true;

		usr.storageloc = data.storageloc;
		usr.serverconfig = data.serverconfig;
		usr.usrconfig = data.usrconfig;
		usr.usrid = data.usrid;
		if (GLocal.getBoolean("auto_login")){
            _this.storeAutoLoginLocal(true);
        }
        _this.sendLoginCallbacks(true);
	} catch (e) {
		alert(e);
	}
};

GSession.prototype.logoutComplete = function(request) {
    try {
        var error = request[0].error;
        if (error) {
            alert(error)
        } else {
            var session = Geof.session;
            session.sessionId = null;
            session.initialize(session.encrypting_callback);
            session.sendLoginCallbacks(false);
        }

    } catch (e) {
        alert(e);
    }
};

GSession.prototype.rebuildLoginRequest = function() {
	if (this.usr) {
		this.loginRequest = GRequest.create("session","create", null);
		var nWhere = {};
		nWhere.loginname = this.usr.loginname;
		nWhere.password = this.usr.password;
		this.loginRequest.data.where = nWhere;
		return this.loginRequest;
	}
	return null;
};

GSession.prototype.getLogoutRequest = function() {
    if (this.usr) {
        return GRequest.create("session","delete",null);
    }
    return null;
};

GSession.prototype.JSON = function() {
	return JSON.stringify(this);
};

GSession.prototype.setupUrl = function() {
    var href = location.href;
    //TODO: add code that checks for url parameters in href and exclude
    var indx = href.lastIndexOf('/');
    //Strip off web page
    if ( indx <= href.length -1) {
        href = href.substr(0, indx);
    }

    //Now strip off subdirectory
    indx = href.lastIndexOf('/');
    this.url = href + "/" + this.webservice;

    //Now the server and port are isolated just in case they are needed
    indx = href.indexOf('//') + 3;
    indx = href.indexOf('/', indx) + 1;
    this.urlroot = href.substr(0, indx);
    this.svr_addr = this.urlroot.substring(0, this.urlroot.lastIndexOf(":"));
};

GSession.prototype.canAutoLogin = function() {
    var _this = Geof.session;
    var state = {
        'usrinfo':(_this.usr
            && _this.usr.loginname
            && _this.usr.loginname.length > 0
            && _this.usr.password
            && _this.usr.password.length > 0),
        'has_cipher':(_this.cipher || false),
        'auto_encrypt':GLocal.getBoolean('autoencrypt'),
        'can_login':false
    };
    if (state.usrinfo) {
        state.can_login = (Geof.can_clear_text_login) || (state.has_cipher && state.auto_encrypt);
    }
    return state;
};

GSession.prototype.tryAutologin = function() {
    if (this.canAutoLogin) {
        this.login(this.usr.loginname, this.usr.password);
    } else {
        Geof.session.sendLoginCallbacks(false);
    }
};

GSession.prototype.addLoginCallback = function(callback) {
    this.loginCallbacks.push(callback);
};

GSession.prototype.removeLoginCallback = function(callback) {
    var indx = $.inArray(callback, this.loginCallbacks);
    if (indx != -1) {
        this.loginCallbacks.splice(indx, 1);
    }
};

GSession.prototype.sendLoginCallbacks = function(success, message) {
    for (var indx=0;indx < this.loginCallbacks.length;indx++) {
        this.loginCallbacks[indx](success, message);
    }
};

GSession.prototype.sendEncryptingCB = function (encrypted, err_msg) {
    var _this = Geof.session;
    _this.setAutoEncrypt(encrypted);
    if (_this.encrypting_callback || false) {
        _this.encrypting_callback(encrypted, err_msg);
    }
};

GSession.prototype.activateEncryption = function() {

    var _this = Geof.session;
    if (_this.aes != null) {
        _this.cipher = _this.aes;
        _this.sendEncryptingCB(true);
    }

    var rsa_key = _this.getRsaKeyLocal();

    if (rsa_key != null) {
        _this.setRsaKey(rsa_key);
        _this.sendServerAesKey();

    } else if (Geof.session.auto_renew_rsa) {
        var cb = function (success) {
            if (! success) {
                _this.sendEncryptingCB(false,"Failed to get RSA key from server");
            } else {
                _this.sendServerAesKey();
            }
        };
        _this.getServerRsaKey( cb );
    } else {
        _this.sendEncryptingCB(false, "Autorenew of RSA key is deactivated");
    }
};

GSession.prototype.deactivateEncryption = function() {
    var _this = Geof.session;
    _this.cipher = null;
    _this.setAutoEncrypt(false);
    _this.sendEncryptingCB(false);
};

GSession.prototype.setRsaKey = function(objRSA) {
    try {
        var _this = Geof.session;
        _this.rsa_key = {'id':objRSA.id,'modulus':objRSA.modulus,'exponent':objRSA.exponent};
        _this.rsa = new RSAKey();
        _this.rsa.setPublic(_this.rsa_key.modulus, _this.rsa_key.exponent);
        _this.cipher = this.rsa;
        _this.saveRsaKeyLocal();
        return true;
    } catch ( e ) {
        alert("setRsaKey: "  + e );
        return false;
    }
};

GSession.prototype.encryptRsa = function (plainText) {
    if (!(plainText || false)) {
        return null;
    }
    if (this.rsa == null) {
        return null;
    }
    if (JsUtil.isObject(plainText)) {
        plainText = JSON.stringify(plainText);
    }

    var encrypted = '';
    var offset = 0;
    var length = plainText.length;
//    Geof.log(plainText);
//    Geof.log("plainText length: " + plainText.length);
    var section;
    var sec_length;
    while (offset < length) {
        sec_length = Math.min(110, length - offset);
        section = plainText.substring(offset, sec_length + offset);
        if (encrypted.length > 0) {
            encrypted += ',';
        }
//        Geof.log("sec_length: " + sec_length);
//        Geof.log(section);
        encrypted += this.rsa.encrypt(section);
        offset += sec_length;
    }
    return encrypted;
};

GSession.prototype.encryptAes = function (plainText) {
    if (!(plainText || false)) {
        return null;
    }
    if (this.aes == null) {
        return null;
    }
    if (JsUtil.isObject(plainText)) {
        plainText = JSON.stringify(plainText);
    }

    var encrypted = this.aes.encrypt(plainText);
    while ((encrypted.length % 4) > 0) {
        encrypted += '=';
    }

    return encrypted;
};

GSession.prototype.getServerRsaKey = function(callback) {
//    Geof.log('getServerRsaKey');

    var _this = Geof.session;
    var cb = function (req) {
        var data = req[0].data;
        var rtn = false;
        if (data && (data.length > 0)) {
            var record = data[0];
            if ('id' in record && 'modulus' in record && 'exponent' in record) {
                var rsa = {'id':record.id, 'modulus':record.modulus, 'exponent':record.exponent};
                rtn = _this.setRsaKey(rsa);
            }
        }
        callback(rtn);

    };
    var obj = {"entity":"rsaencryption","action":"read","actionas":"rsaencryption","data":{}};
    TransMgr.sendNow( GRequest.fromJson(obj), cb);
};

GSession.prototype.sendServerAesKey = function() {
//    Geof.log('sendServerAesKey');
    var _this = Geof.session;

    if (_this.rsa || false ) {

        var aes = new SjclAes();

        var cb = function(req) {
            try {
                var record = req.data[0];
                var success = record.success;
                if (success) {
                    _this.aes = aes;
                    _this.cipher = aes;
                    _this.sendEncryptingCB(true);
                } else {
                    var err = "GSession.sendServerAesKey: failed to send server AES Key";
                    _this.sendEncryptingCB(false,err);
                }
            } catch(e) {
                _this.sendEncryptingCB(false,"GSession.sendServerAesKey: " + e);
            }
        };
        var trans = new Transaction(_this);

        var aeskey = aes.getKeyAsHex();
//        Geof.log("hex aeskey:" + aeskey);
//        Geof.log("iv:" + aes.getIvAsHex());
        var request = GRequest.build('rsaencryption','create', "aeskey", {"aeskey":aeskey});

        trans.setEncryption("rsa");
        trans.addRequest(request, cb);
        trans.send();

    } else {
        _this.sendEncryptingCB(false,'RSA key not set');
    }
};

GSession.prototype.saveRsaKeyLocal = function(rsa_key) {
    if (rsa_key === undefined) {
        rsa_key = this.rsa_key;
    }
    GLocal.setJson('rsa_key', rsa_key);
};

GSession.prototype.getRsaKeyLocal = function() {
    var value = GLocal.get('rsa_key');
    if (value && value.length > 0) {
        try {
            return JSON.parse(value);
        } catch (e) {
            return null;
        }
    } else {
        return null;
    }
};

GSession.prototype.saveRsaRenewal = function(auto_renew) {
    if (Geof.session !== undefined) {
        Geof.session.auto_renew_rsa = auto_renew;
    }
    GLocal.setBoolean('rsa_auto_renew', auto_renew);
};

GSession.prototype.getRsaRenewal = function() {
    return GLocal.getBoolean('rsa_auto_renew');
};

GSession.prototype.clearLocalRsaKey = function() {
    GLocal.set('rsa_key','');
};

GSession.prototype.getClearcode = function(email) {
    if (email || false ) {
        return SjclAes.hashSHA256 (email);
    } else if (Geof.session.usr && Geof.session.usr.email) {
        return SjclAes.hashSHA256 (Geof.session.usr.email);
    } else {
        return null;
    }
};


////////////////////////////////////////////////////////////////////////

function GUser() {
    this.loginname = null;
    this.password = null;
    this.usrid = -1;
    this.sessionid = -1;
    this.permissions = null;
    this.firstname = "";
    this.lastname = "";
    this.storageloc = [];
    this.serverconfig = [];
    this.usrconfig = [];
    this.email = null;
}
