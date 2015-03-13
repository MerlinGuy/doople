/*
* Created By: Jeff Boehmer
* Company: Ft. Collins Research
* Website: www.ftcollinsresearch.org
*          www.geofixated.org
*/

var TransMgr = (function () {
    return {
        preCall:[],
        postCall:[],
        loginRequest:null,
        sent:[],
        paused:false,
        id:0,
        NO_SESSION:'User not logged in',


        transmit_func:undefined,

        sendNow:function (request, callback) {
            var trans = new Transaction(Geof.session);
            trans.addRequest(request, null);
            TransMgr.send(trans, callback, false);
        },

        send:function (t, cb, override_pause) {
            try {
                if (t.requests == 0) {
                    return;
                }

                t.callback = cb;
                if (TransMgr.paused && !override_pause) {
                    TransMgr.sent.push(t);
                    return;
                }

                var reqs = t.requests;

                var cipher = null;
                var sendData = {
                    tid:t.tid
                };

                var sendCopy = {};

                var cur_session = t.session;

                if (cur_session !== null) {
                    sendData.sid = cur_session.sessionId;
                    if (cur_session.cipher != null) {
                        cipher = cur_session.cipher;

                        if (cipher === cur_session.rsa) {
                            //                    Geof.log("Transaction encrypting rsa");
                            reqs = cur_session.encryptRsa(JSON.stringify(reqs));
                            sendData['encryptid'] = cur_session.rsa_key.id;
                            sendData['encryption'] = 'rsa';

                        } else if (cipher === cur_session.aes) {
                            //                    Geof.log("Transaction encrypting aes");
                            reqs = cur_session.encryptAes(JSON.stringify(reqs));
                            sendData['iv'] = cur_session.aes.getIvAsHex();
                            sendData['encryption'] = 'aes';
                        }
                    }
                    Object.keys(sendData).forEach(function (key) {
                        sendCopy[key] = sendData[key];
                    });
                    sendCopy['requests'] = t.requests;

                } else {
                    sendCopy = sendData;
                }

                sendData['requests'] = reqs;

                TransMgr.firePreCall(sendCopy);

                if (!TransMgr.paused) {
                    TransMgr.sent.push(t);
                }

                sendData = JSON.stringify(sendData);
                var postTime = Date.now();
                if (TransMgr.transmit_func) {
                    TransMgr.transmit_func(true);
                }

                $.post(t.url, sendData, function (json, textStatus, jqXHR) {
                    if (TransMgr.transmit_func) {
                        TransMgr.transmit_func(false);
                    }
                    Geof.stats['looptime'] = Date.now() - postTime;
                    Geof.stats['proctime'] = json['proctime'];
                    Geof.stats['server_time'] = json['server_time'];

                    if (textStatus == 'success') {
                        if (json.error) {
                            TransMgr.handleTransactionError(t, json);
                            return;
                        }

                        TransMgr.remove(t);

                        if (cipher != null && ("encryption" in json)) {
                            json.requests = TransMgr.decryptRequests(cur_session, json);
                        }

                        var requests = json.requests;

                        for (var indx=0;indx < requests.length;indx++) {
                            var req = requests[indx];
                            if (req.error) {
                                TransMgr.showRequestError(req);
                            }
                            CallbackList.call(req);
                            CallbackList.alert(req, textStatus, jqXHR);
                        }

                        // call all follow up listeners
                        TransMgr.firePostCall(json);
                        if (t.callback || false) {
                            t.callback(requests);
                        }

                        if (TransMgr.paused) {
                            TransMgr.processNextPaused();
                        }

                    } else {
                        Geof.log("ERROR IN POST: " + json);
                    }
                })
            } catch (e) {
                alert("Error occured in TransMgr.prototype.send : " + e);
            }
        },

        handleTransactionError:function (t, json) {
            var gcn = Geof.cntrl.notification;
            Geof.notifier.addLocal(json.error, gcn.levels.Alert, gcn.types.System);
            var err_msg = json.error;
            if (json.error === TransMgr.NO_SESSION) {
                if (TransMgr.paused) {
                    err_msg = "Invalid login";
                } else {
                    TransMgr.setPaused(true);
                    var session = Geof.session;
                    if (session.cipher || false && session.rsa || false) {
                        session.cipher = session.rsa;
                        if (session.canAutoLogin()) {
                            session.addLoginCallback(this.restartQueue);
                            session.tryAutologin();
                            return;
                        }
                    }
                }
            } else if (json.error.indexOf('Invalid Encryptid') > -1) {
                if ('rsa' in json) {
                    Geof.session.setRsaKey(json.rsa);
                    return;
                }
            }
            session.sendLoginCallbacks(false, err_msg);
//            Geof.login.show(err_msg);
        },

        restartQueue:function (success) {
            Geof.session.removeLoginCallback(TransMgr.restartQueue);
            if (success) {
                TransMgr.processNextPaused();
            }
        },

        processNextPaused:function () {
            var trans = TransMgr.sent.shift();
            if (trans || false) {
                TransMgr.send(trans, trans.callback, true);
            } else {
                TransMgr.setPaused(false);
            }
        },

        remove:function (trans) {
            var len = TransMgr.sent.length;
            for (var indx = 0; indx < len; indx++) {
                if (TransMgr.sent[indx] === trans) {
                    TransMgr.sent.splice(indx, 1);
                    return true;
                }
            }
            return false
        },

        showRequestError:function (req) {
            CallbackList.error(req);
            var err = 'Entity: ' + req.entity + ', action: ' + req.action + ', error: ' + req.error;
            var gcn = Geof.cntrl.notification;
            Geof.notifier.addLocal(err, gcn.levels.Alert, gcn.types.System);
            PanelMgr.showRequestErrorDialog(req);
        },

        decryptRequests:function (session, json) {
            var requests = json.requests;

            if (JsUtil.isString(requests)) {
                var decrypted = null;
                var encryption = json.encryption;
                var gcn = Geof.cntrl.notification;
                var err;
                if (encryption === 'aes') {
                    var iv = json.iv || null;
                    decrypted = session.aes.decryptStringArray(requests, iv, null);

                    if (decrypted != null) {
                        requests = JSON.parse("[" + decrypted + "]");
                    } else {
                        err = "Not able to decrypt Requests string";
                        Geof.notifier.addLocal(err, gcn.levels.Alert, gcn.types.System);
                    }
                } else {
                    err = "Unknow Encryption: " + encryption;
                    Geof.notifier.addLocal(err, gcn.levels.Alert, gcn.types.System);
                    requests = null;
                }
            }
            return requests;
        },

        addPreCall:function (callback) {
            this.preCall.push(callback);
        },

        firePreCall:function (json) {
            for (var i = 0; i < this.preCall.length; i++) {
                this.preCall[i](json);
            }
        },

        addPostCall:function (callback) {
            this.postCall.push(callback);
        },

        firePostCall:function (json) {
            for (var i = 0; i < this.postCall.length; i++) {
                this.postCall[i](json);
            }
        },

        removePreCall:function (callback) {
            var indx = $.inArray(callback, this.postCall);
            if (indx != -1) {
                this.postCall.splice(indx, 1);
            }
        },

        removePostCall:function (callback) {
            var indx = $.inArray(callback, this.postCall);
            if (indx != -1) {
                this.postCall.splice(indx, 1);
            }
        },

        setPaused:function (isPaused) {
            TransMgr.paused = isPaused;
            if (TransMgr.transmit_func) {
                TransMgr.transmit_func(!isPaused);
            }
        }
    };
})();

//////////////////////////////////////////////////////////////////////.

function Transaction(session) {
	this.tid = TransMgr.id++;
	this.session = session;
	this.url = session.url;
	this.requests = [];
    this.callback = null;
}

Transaction.prototype.send = function (callback) {
    TransMgr.send(this, callback, true);
};

Transaction.prototype.addRequest = function (request, callback) {
    if (request) {
        if (request instanceof GRequest) {
            this.requests.push(request);
            CallbackList.add(request.requestid, callback);

        } else if (request instanceof GRequestPair) {
            this.requests.push(request.request);
            CallbackList.add(request.request.requestid, request.callback);

        } else if (request instanceof Array) {
            for (var indx=0; indx <  request.length; indx++) {
                var pair = request[indx];
                this.addRequest(pair.request, pair.callback);
            }
        }
    }
    return this;
};

Transaction.prototype.addAndSend = function (request, callback) {
    this.addRequest(request, callback);
    this.send();
};

Transaction.prototype.removeRequest = function (request) {
    if ((request) && ($.inArray(request, this.requests))) {
        this.requests.splice($.inArray(request, this.requests), 1);
        CallbackList.remove[request.requestid];
    }
};

Transaction.prototype.setEncryption = function (encryptionType) {
    if (encryptionType || false) {
        this.encryption = encryptionType;
    }
};

Transaction.prototype.setLastCallback = function (callback) {
    var rlen = this.requests.length;
    if (rlen > 0) {
        CallbackList.add(this.requests[rlen - 1].requestid, callback);
    }
};

Transaction.prototype.nextRequestOrder = function () {
    var maxOrder = 0;
    var reqs = this.requests;
    var order;
    for (var indx=0;indx< reqs.length;indx++) {
        order = reqs[indx].order || 0;
        if (order > maxOrder) {
            maxOrder = order;
        }
    }
    return maxOrder + 1;
};


var CallbackList = (function () {

    var listeners = [];
    var errorListeners = [];
    var list = [];

    return {
        addListener:function (requestor, signature, callback) {
            if (!(signature in listeners)) {
                listeners[signature] = [];
            }
            var ar = listeners[signature];
            ar[requestor] = callback;
        },

        removeListener:function (requestor, signature) {
            if (signature in listeners) {
                delete listeners[signature][requestor];
            }
        },

        addErrorListener:function (requestor, signature, callback) {
            if (!(signature in errorListeners)) {
                errorListeners[signature] = [];
            }
            var ar = errorListeners[signature];
            ar[requestor] = callback;
        },

        removeErrorListener:function (requestor, signature) {
            if (signature in errorListeners) {
                delete errorListeners[signature][requestor];
            }
        },

        alert:function (request, textStatus, jqXHR) {

            var action = request.actionas ? request.actionas : request.action;
            var signature = request.entity + ":" + action;

            if (signature in listeners) {
                var list = listeners[signature];

                for (var indx=0;indx< list.length;indx++) {
                    var callback = list[indx];

                    if ((callback) && (callback instanceof Function)) {
                        callback(request.data, textStatus, jqXHR);
                    }
                }
            }
        },

        error:function (request) {
            // check for generic listener
            var callback;
            var indx,list;
            if ('*' in errorListeners) {
                list = errorListeners['*'];
                for (indx=0; indx < list.length;indx++) {
                    callback = list[indx];
                    if (callback && (callback instanceof Function)) {
                        callback(request);
                    }
                }
            }

            var action = request.actionas ? request.actionas : request.action;
            var signature = request.entity + ":" + action;

            if (signature in errorListeners) {
                list = errorListeners[signature];

                for (indx=0; indx < list.length;indx++) {
                    callback = list[indx];

                    if ((callback) && (callback instanceof Function)) {
                        if (request.data || false) {
                            callback(request.data);
                        } else {
                            callback(request.error);
                        }
                    }
                }
            }
        },

        add:function (key, callback) {
            list[key] = callback;
        },

        remove:function (key) {
            var rtn = list[key];
            delete list[key];
            return rtn;
        },

        call:function (request) {
            var key = request.requestid;
            var cb = list[key];
            if (cb) {
                delete list[key];
                cb(request);
            }
        }
    };

})();



