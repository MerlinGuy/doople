package org.geof.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;

import javax.crypto.spec.SecretKeySpec;

import org.geof.log.Logger;
import org.geof.util.DateUtil;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * WSSession wrappers all the information and methods used by a user who is logged into the
 * system.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class GSession implements Comparable<GSession> {

	public static String LOGIN = "login";
	public static String USERID = "userid";
	public static String EMAIL = "email";
	public static String SESSION = "session";
	public static String ACTIVE = "active";
	public static String CREATED = "created";

	private String _key = null;
	private long _createTimestamp = 0;
	private long _lastAccessed = 0;
	private long _maxTimeout = 1200000;
	
	private HashMap<String, String> _data = new HashMap<String, String>();
	private ArrayList<Integer> _ugroups = new ArrayList<Integer>();
	private SecretKeySpec _aesKeySpec = null;
	/**
	 * Class constructor
	 * 
	 * @param key Unique id for this session.
	 * @param usrid Logged in user's id
	 * @param roles List of roles which hold the user's permissions
	 */
	public GSession(String key, long usrid, ArrayList<Integer> ugroups) {
		this._key = key;
		setData(USERID, String.valueOf(usrid));
		_createTimestamp = (new Date()).getTime();
		_data.put(CREATED, DateUtil.DateFormat.format(new Date(_createTimestamp)));
		_data.put(ACTIVE, "true");
		_ugroups = ugroups;
		touch();
	}

	/**
	 * Class constructor
	 * 
	 * @param key Unique id for this session.
	 * @param usrid Logged in user's id
	 * @param roles List of roles which hold the user's permissions
	 * @param timeout Time in milliseconds which the session can remain inactive before the
	 * user is automatically logged out.
	 */
	public GSession(String key, long usrid, ArrayList<Integer> ugroups, long timeout) {
		this(key, usrid, ugroups);
		_maxTimeout = timeout;
	}

	/**
	 * Sets the sessions's login name
	 * 
	 * @param loginame User login name to use
	 */
	public void setLoginname(String loginame) {
		setData(LOGIN, loginame);
	}

	/**
	 * 
	 * @return Returns the current user login if available otherwise returns an empty string
	 */
	public String getLoginname() {
		return _data.containsKey(LOGIN) ? _data.get(LOGIN) : "";
	}
	
	@Override
	public int compareTo(GSession gsession) {
		return this.getLoginname().compareTo(gsession.getLoginname());
	}

	/**
	 * Sets the current user id
	 * 
	 * @param usrid User Id to use
	 */
	public void setUsrID(long usrid) {
		setData(USERID, String.valueOf(usrid));
	}

	/**
	 * 
	 * @return Returns the current user id if available otherwise returns -1;
	 */
	public long getUsrID() {
		if (_data == null)
			return -1;
		return _data.containsKey(USERID) ? Long.parseLong(_data.get(USERID)) : -1;
	}

	/**
	 * 
	 * @return Returns the current session id
	 */
	public String getSessionID() {
		return (_key == null) ? "unknown" : _key;
	}
	
//	public HashMap<String, int[]> getPermissions() {
//		return _permissions;
//	}
	
	public ArrayList<Integer> getUGroups() {
		return _ugroups;
	}
	
	public SecretKeySpec getAesKeySpec() {
		return this._aesKeySpec;
	}
	
	public void setAesKeySpec(byte[] keyBytes) {
		SecretKeySpec aesKeySpec = new SecretKeySpec(keyBytes, "AES");    		
		this._aesKeySpec = aesKeySpec;
	}
	
	/**
	 * 
	 * @param isActive Sets the active flag of the current Session
	 */
	public void setActive(boolean isActive) {
		// check to see if session has been disposed
		if (_data != null) {
			if (isActive) {
				touch();
			}
			_data.put(ACTIVE, isActive ? "true" : "false");
		}
	}

	/**
	 * 
	 * @return Returns true if the application is currently processing a transaction for the
	 * session.
	 */
	public boolean isActive() {
		if (_data != null) {
			return "true".equalsIgnoreCase(_data.get(ACTIVE));
		} else {
			return false;
		}
	}

	/**
	 * A session is considered Valid if its _data object is not null
	 * 
	 * @return Returns true if the current session is Valid otherwise false
	 */
	public boolean isValid() {
		return _data != null;
	}

	/**
	 * Returns the value of a mapped _data object
	 * 
	 * @param key Value's name in the _data map
	 * @return Retuns the value stored in the map object for the provided key
	 */
	public String getData(String key) {
		try {
			if (_data != null) {
				touch();
				return ((_data.containsKey(key)) ? _data.get(key) : null);
			}
		} catch (Exception e) {
			Logger.error(e);
		}
		return null;
	}

	/**
	 * Sets or adds the Name/Value pair to the _data object
	 * 
	 * @param key Name of the value to add.
	 * @param data Value of the Name/Value pair to add or to change
	 */
	public void setData(String key, String data) {
		touch();
		_data.put(key, data);
	}

	/**
	 * Removes the specified Name/Value pair from the _data map object
	 * 
	 * @param key Name of the pair to remove
	 */
	public void deleteData(String key) {
		touch();
		if (_data.containsKey(key)) {
			_data.remove(key);
		}
	}

	/**
	 * Resets the current timeout variable
	 */
	public void touch() {
		if (_data != null) {
			_lastAccessed = (new Date()).getTime();
			_data.put("lastaccessed", DateUtil.DateFormat.format(new Date(_lastAccessed)));
		}
	}

	/**
	 * 
	 * @return Returns the time in milliseconds of when the session was created
	 */
	public long getCreateTimestamp() {
		return _createTimestamp;
	}

	/**
	 * 
	 * @return Returns the time in milliseconds of when the session was last accessed
	 */
	public long getLastAccessed() {
		return _lastAccessed;
	}

	/**
	 * 
	 * @return Returns true if the session isActive, false if the _data or _key objects are
	 * null, otherwise true if the session has not timed out.
	 */
	public boolean isAlive() {
		if (isActive()) {
			return true;
		}
		if ((_data == null) || (_key == null)) {
			return false;
		}
		return ((new Date()).getTime() - _lastAccessed) < _maxTimeout;
	}

	/**
	 * 
	 * @return Returns the session's key if set otherwise return null
	 */
	public String getKey() {
		return (_key == null) ? null : _key.toString();
	}

	/**
	 * checks if the current usrID is set in the _data object
	 * @param usrID User id to check
	 * @return True if the passed in user id in the one associated with this session otherwise false.
	 */
	public boolean checkUsrID(String usrID) {
		try {
			if ((usrID != null) && _data.containsKey(USERID) && (_data.get(USERID).compareTo(usrID) == 0)) {
				touch();
				return true;
			}
		} catch (Exception e) {
			Logger.error(e);
		}
		return false;
	}

	/**
	 * Clears the values out of the _data map object
	 */
	public void clear() {
		try {
			// String ipaddr = _data.get(IPADDR);
			_data.clear();
			// if (ipaddr != null) {
			// _data.put(IPADDR, ipaddr);
			// }
		} catch (Exception e) {
			Logger.error(e);
		}
	}

	/**
	 * 
	 * @return Returns the object serialzied as a JSON string
	 */
	public JSONObject toJSON() {
		try {
			JSONObject session = new JSONObject();
			for (String key : _data.keySet()) {
				session.put(key, _data.get(key));
			}
			session.put("sessionid", _key);
			session.put("la_seconds", (int) ((new Date()).getTime() - _lastAccessed) / 1000);
			return session;
		} catch (JSONException e) {
			Logger.error(e);
			return null;
		}
	}

	/**
	 * Clears the object out for garbage collection
	 * 
	 */
	public void dispose() {
		clear();
		_data = null;
		_key = null;
	}

	/**
	 * Prints the _data keys and values to the debug log file.
	 */
	public void printValues() {
		for (String key : _data.keySet()) {
			Logger.debug("--- key " + key + ", value " + _data.get(key));
		}
		// Logger.debug("Permissions: " + Arrays.toString(Permissions));
	}

}
