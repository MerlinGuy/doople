package org.geof.service;

import java.io.OutputStream;
import java.security.Security;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import org.geof.service.GSession;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.bouncycastle.crypto.AsymmetricBlockCipher;
import org.bouncycastle.util.encoders.Hex;
import org.geof.db.DBConnMgr;
import org.geof.db.DBConnection;
import org.geof.db.DBInteract;
import org.geof.encrypt.CipherMgr;
import org.geof.encrypt.EncryptUtil;
import org.geof.encrypt.EncryptableOutputStream;
import org.geof.log.Logger;
import org.geof.prop.GlobalProp;
import org.geof.request.Request;
import org.geof.request.SessionRequest;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.apache.commons.codec.binary.Base64;

/**
 * Transaction Class is the management object for each client communication with the server.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class Transaction {
	// Static values
	public static final String ENTITYNAME = "entity";
	public static final String TRANSACTION = "tid";
	public static final String TCALLBACK = "tcallback";
	public static final String SESSION = "sid";
	public static final String REQUESTS = "requests";
	public static final String ENCRYPTION = "encryption";
	public static final String ENCRYPTID = "encryptid";
	public static final String SERVER_TIME = "server_time";
	public static final String PROCTIME = "proctime";
	
	public static final String RSA = "rsa";
	public static final String AES = "aes";
	public static final String IV = "iv";
	
	public static final String NO_SESSION_ERROR = "User not logged in";

	protected static String _sqlAuditRequest = "INSERT INTO requestaudit (requestname,actionname,actionas,usrid,sessionid,result,rundate,completedate) VALUES (?,?,?,?,?,?,?,?)";

	protected static int _count = 0;

	// life cycling objects
	protected GSession _session = null;
	protected DBConnection _conn = null;
	protected DBInteract _dbi = null;
	protected JsonWriter _tWriter = null;
	protected EncryptableOutputStream _outStream = null;
	protected ArrayList<JSONObject> _requests = null;
	protected String _iv = null;
	protected String _encryption = null;
	protected HashMap<String, JSONObject> _returning = null;
	protected HashMap<String, Object> _reference = null;
	protected JSONObject _sendback_rko = null;
	
	// header parameters
	protected long _usr_id = -1;
	private int _id = 0;
	protected String _errMsg = null;

	protected JSONObject _curRequest = null;
	
	private String _debugFile = "/var/log/geof/eoutput.log";
	private boolean _debugOutput = false;
	
	private static List<String> auditIgnores = Arrays.asList(GlobalProp.getProperty("do_not_audit").split(","));
	/**
	 * Class constructor
	 */
	public Transaction() {
	}


	/**
	 * Method processes all of the Request objects sent in the current transaction.
	 * 
	 * @return True if method succeeds otherwise false if an error occurs
	 */
	public boolean process(String jsonAsString, OutputStream outStream) {
		// TODO: Make sure the process always completes
		// and writes out valid json to the stream
		long curTime = (new Date()).getTime();
		boolean requests_open = false;
		try {
			
			_outStream = new EncryptableOutputStream(outStream);

			if (_debugOutput) {
				_outStream.setDebugFile(_debugFile);
			}
			
			_tWriter = new JsonWriter(_outStream);
			_tWriter.startWrite();
			_tWriter.writePair(SERVER_TIME, curTime);

			JSONObject root = null;
			try {
				root = new JSONObject(jsonAsString);				
			} catch (Exception e) {
				setError("malformed json");
				return false;
			}
			_id = root.optInt(TRANSACTION, _count++);
			_tWriter.writePair(TRANSACTION, getID());
			_tWriter.writePair(SESSION, getSessionID());
			
			_conn = DBConnMgr.getConnection();
			_dbi = new DBInteract(this);
			
			if (root.has(SESSION)) {
				String sessionkey = root.getString(SESSION);
				setSession(SessionMgr.getSession(sessionkey));
				_conn.setSession(_session);
			} else {
				_session = null;
			}

			JSONArray requests = null;
			if ( ! root.has(REQUESTS) ) {
				setError("Missing requests");
				return false;
			}
			
			if (root.has(ENCRYPTION)) {
				requests = decryptRequests(root);
				if (_errMsg != null) {
					if (_sendback_rko != null) {
						_tWriter.writePair("rsa", _sendback_rko);
					}
					return false;
				}
				if (_encryption != null) {
					_tWriter.writePair(ENCRYPTION, _encryption);
					_tWriter.writePair(IV, _iv);
				}
			} else {
				requests = root.getJSONArray(REQUESTS);
			}			
			
			sortRequests(requests);
			
			_tWriter.openRequests(_outStream.canEncrypt());
			requests_open = true;
			
			int reqCount = _requests.size();

			// If _session is null then we need to peek at the first request to make sure it's a Session.create
			if (_session == null) {
				boolean canLogin = reqCount > 0;
				if (canLogin) {
					JSONObject peek = _requests.get(0);
					canLogin = JsonUtil.equal(peek, "entity", "session") && JsonUtil.equal(peek, "action", "create");
				}
				if (! canLogin) { // add session.create error to transaction and leave
					this.setError(NO_SESSION_ERROR);
					Request.writeRequestHeader(_tWriter, SessionRequest.ENTITYNAME, Request.EXECUTE, 
														null, -1, null);
					_tWriter.writePair("error", NO_SESSION_ERROR);
					_tWriter.closeObject();
					return false;
				}
			}
			
			_returning = new HashMap<String, JSONObject>();

			Request objRequest = null;
			for (int indx = 0; indx < reqCount && (_errMsg == null); indx++) {
				_curRequest = _requests.get(indx);
				_tWriter.writeComma();
				_tWriter.pushComma();
				
				objRequest = Request.getInstance(_curRequest, this);
				if (objRequest != null) {
					Timestamp rundate = new Timestamp((new Date()).getTime());
					boolean rtn = objRequest.executeRequest();
					auditRequest(objRequest, rtn, rundate);
				}
			}
			return true;
		} catch (Exception e) {
			setError("Transaction.process ERROR - " + e.getMessage());
			Logger.error(e);
			return false;
			
		} finally {
			if (requests_open) {
				_tWriter.closeRequests();
			}
			if (hasError()) {
				_tWriter.writePair(JsonWriter.ERROR, getError());
			}
			_tWriter.writePair(PROCTIME, (new Date()).getTime() - curTime);
			_tWriter.completeWrite();
			DBConnMgr.release(_conn);
			setSession(null);
		}
	}
		
	private JSONArray decryptRequests(JSONObject root) {
		Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
		JSONArray rtn = null;
		try {
			String encType = root.getString(ENCRYPTION);
			String encReqs = root.getString(REQUESTS); 
			
			if (encType.equalsIgnoreCase(RSA)) {
//				Logger.debug("requests rsa encrypted");
				int encryptid = root.getInt(ENCRYPTID);
				AsymmetricBlockCipher cipher = CipherMgr.getRsa(encryptid, _dbi);
				
				if (cipher != null) {
					if (root.has(REQUESTS)) {
						String[] eBlocks = encReqs.split(",");
						String str = "";
						byte[] hReqs;
						for ( String block : eBlocks) {
						    hReqs = Hex.decode(block);
						    str += new String(cipher.processBlock(hReqs, 0, hReqs.length));
						}
					    rtn = new JSONArray( str );
					}
				} else {
					//Todo: add code to check passed in values to see if user wishes a new key to be created
					setError("Invalid Encryptid : " + encryptid + " (rsa)");
					
					//Todo: check to see if user wishes a new key created
					this._sendback_rko = CipherMgr.createRsaKeyObject(_dbi).toJsonPublic(); 
					return null;
				}
				
			} else if (encType.equalsIgnoreCase(AES)) {
				if (_session == null) {
					setError(NO_SESSION_ERROR);
					return null;
				}
//				Logger.debug("requests aes encrypted");
				SecretKeySpec sks = _session.getAesKeySpec();
				if (sks != null) {
					String str_iv = root.getString(IV);
					byte[] iv = Hex.decode(str_iv);
					
			        Cipher cipher = Cipher.getInstance(EncryptUtil.AES_CIPHER_TYPE, "BC"); 
			        cipher.init(Cipher.DECRYPT_MODE, sks, new IvParameterSpec(iv));
			        byte[] encbytes = (new Base64()).decode(encReqs);
			        byte[] byteRequests = cipher.doFinal(encbytes);
			        rtn = new JSONArray( new String(byteRequests));
			        _iv = _outStream.setupAesCipher(sks);
			        _encryption = AES;
//			        Logger.debug("Transaction.decryptRequests iv: " + _iv);
				} else {
					setError("No AES key set for session");
				}
			}
		} catch (Exception e) {
			setError(e.getMessage());
		}
		return rtn;
	}
		
	public JSONObject getReturning(String key) {
		return _returning.get(key);
	}
	
	public Object getReturning(String key, String element, Object dftValue) {
		if (_returning.containsKey(key)) {
			JSONObject returning = _returning.get(key);
			if (returning.has(element)) {
				try {
					return returning.get(element);
				} catch (JSONException e) {
					return dftValue;
				}
			} else {
				return dftValue;
			}
		} else {
			return dftValue;
		}
	}
	
	public Object getReturning(String code, Object dftValue) {
		String[] keys = code.split(","); 
		if (_returning.containsKey(keys[0])) {
			JSONObject returning = _returning.get(keys[0]);
			if (returning.has(keys[1])) {
				try {
					return returning.get(keys[1]);
				} catch (JSONException e) {
					return dftValue;
				}
			} else {
				return dftValue;
			}
		} else {
			return dftValue;
		}
	}
	
	public void setReturning(String key, JSONObject returning) {
		_returning.put(key, returning);
	}
	
	/**
	 * Writes the current request information into the database audit table
	 */
	private void auditRequest(Request req, boolean result, Timestamp rundate) {
		try {
			String entity = req.getEntity();
			String action = req.getAction();
			String actionAs = req.getActionAs();
			if (auditIgnores.contains(entity + "." + action)) {
				return;
			}
			
			PreparedStatement ps = _conn.getPreparedStatement(_sqlAuditRequest);
			String sessionid = "unknown";
			long usrid = req.getUsrId();
			if (_session != null) {
				usrid = _session.getUsrID();
				sessionid = _session.getSessionID();
			}
			ps.setString(1, entity);
			ps.setString(2, action);
			ps.setString(3, actionAs);
			ps.setLong(4, usrid);
			ps.setString(5, sessionid);
			ps.setInt(6, result ? 1 : 0);
			ps.setTimestamp(7, rundate);
			ps.setTimestamp(8, new Timestamp((new Date()).getTime()));
			ps.execute();
			ps.close();
		} catch (SQLException e) {
			Logger.error(e);
		}
	}

	/**
	 * Method resets the _session timeoff timer if a previous session was found. 
	 * @param session New session to use
	 */
	public void setSession(GSession session) {
		if ((_session != null) && _session.isValid()) {
			_session.touch();
			_session.setActive(false);
			
		}
		_session = session;
		if (_session != null) {
			_session.setActive(true);
			_conn.setSession(_session);
		}
	}

	/**
	 * 
	 * @return  Returns the current session variable
	 */
	public GSession getSession() {
		return _session;
	}

	/**
	 * 
	 * @return Return the current session id if session variable is set otherwise returns null
	 */
	public String getSessionID() {
		return _session != null ? _session.getKey() : "";
	}

	/**
	 * 
	 * @return Returns the RequestObject currently being processed.
	 */
	public JSONObject getRequest() {
		return _curRequest;
	}

	/**
	 * 
	 * @return Returns the DBConnection object
	 */
	public DBConnection getConnection() {
		return _conn;
	}

	/**
	 * 
	 * @return  Returns DBInteract object used for accessing the database
	 */
	public DBInteract getDBInteract() {
		return _dbi;
	}

	/**
	 * 
	 * @return Returns the JsonWriter for writing data back to the response stream
	 */
	public JsonWriter getStream() {
		return _tWriter;
	}

	/**
	 * 
	 * @return Returns the current Transaction id.
	 */
	public int getID() {
		return _id;
	}

	/**
	 * 
	 * @return  Returns the usr id associated with the current session
	 */
	public long getUsrID() {
		return _usr_id;
	}

	/**
	 * Sets the current usr_id
	 * @param usr_id New long value to use for the usr_id
	 */
	public void setUsrID(long usr_id) {
		_usr_id = usr_id;
	}

	/**
	 * 
	 * @return Returns true if transaction has an error otherwise false
	 */
	public boolean hasError() {
		return _errMsg != null;
	}

	/**
	 * 
	 * @return  Returns the current error message
	 */
	public String getError() {
		return _errMsg;
	}

	/**
	 * Sets the current error message
	 * @param error New error message to use.
	 */
	public void setError(String error) {
		_errMsg = error;
	}
	
	/**
	 * Builds a sorted list of JSONObject requests in sorted order of execution according to
	 * the 'order' field of the request object. If no order field is supplied the request is
	 * assigned the order zero.
	 * 
	 * @param requests JSONArray of requests to sort
	 */
	private void sortRequests(JSONArray requests) {
		_requests = new ArrayList<JSONObject>();
		try {
			int cnt = requests.length();
			JSONObject request;
			int order;
			int sortedcnt;
			for (int indx = 0; indx < cnt; indx++) {
				request = requests.getJSONObject(indx);
				if (request.has("order")) {
					order = request.getInt("order");
				} else {
					order = 0;
					request.put("order", order);
				}
				sortedcnt = _requests.size();
				for (int loc = 0; loc < sortedcnt && request != null; loc++) {
					if (order < _requests.get(loc).getInt("order")) {
						_requests.add(loc, request);
						request = null;
					}
				}
				if (request != null) {
					_requests.add(request);
				}
			} // end for
		} catch (JSONException e) {
			Logger.error(e);
		}
	}

}
