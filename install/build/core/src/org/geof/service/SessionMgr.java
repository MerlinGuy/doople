package org.geof.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.geof.log.Logger;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The Session Manager class holds and manages the current WSSessions of users currently
 * logged into the application. It implements Runnable so that it can constantly monitor the
 * status of logged in users and time them out when they have not interacted with the server
 * in the alloted time.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class SessionMgr implements Runnable {

	private static SessionMgr _instance = null;
	
	private int _checkTimeout = 12000; // Check each 12 seconds.
	private long _sessionTimeout = 1200000;
	private Thread _thread = null;
	private boolean _alive = false;

	private HashMap<String, GSession> _sessions = new HashMap<String, GSession>();

	/**
	 * Class constructor which is private to keep anyone from instantiating a instance.
	 */
	private SessionMgr() {
	}

	/**
	 * This function creates a Singleton SessionManager and starts a thread to age time'd out
	 * session information out of the list.
	 * 
	 * @param timeone The amount of inactive time in milliseconds that the user can have
	 * before they are automatically logged off the system.
	 */
	public static void initialize(Long timeout) {
		try {
			if (_instance == null) {
				_instance = new SessionMgr();
				_instance._sessionTimeout = (timeout == null ? _instance._sessionTimeout : timeout);
				_instance = new SessionMgr();
				_instance._thread = new Thread(_instance);
				_instance._thread.start();
				Logger.writeInit("*** SessionManager.initialized");
			}
		} catch (Exception e) {
			Logger.error(e);
		}
	}

	public static Set<String> getActiveSessionKeys() {
		return _instance._sessions.keySet();		
	}
	
	/**
	 * Quick check for existance of session by key
	 * 
	 * @param key Session key to check for.
	 * @return Returns true if the session key exists in _sessions HashMap, otherwise false.
	 */
	public static boolean hasSession(String key) {
		return _instance._sessions.containsKey(key);
	}

	/**
	 * Creates a new session object and stores it in the _sessons HashMap
	 * 
	 * @param usrid User id to associate with the new session
	 * @param roles User's roles for Authentication ans Security
	 * @return Returns the newly created session.
	 */
	public static GSession createSession(long usrid,ArrayList<Integer> ugroups) {
		String key = null;
		do {
			key = java.util.UUID.randomUUID().toString();			
		} while (hasSession(key));

		GSession session = new GSession(key, usrid, ugroups, _instance._sessionTimeout);
		_instance._sessions.put(key, session);
		return session;
	}

	/**
	 * @return The current number of active sessions.
	 */
	public int getCount() {
		return _instance._sessions.size();
	}

	/**
	 * Main Thread run loop for checking the last use of a session. If the session's last use
	 * was too long ago the session is removed from the list which effectively logs off the
	 * user.
	 * 
	 */
	public void run() {
		HashSet<String> deadKeys = new HashSet<String>();
		Logger.writeInit("*** Started (SessionManager)");

		try {
			_alive = true;
			while (_alive) {
				if (_sessions == null) {
					return;
				}

				for (String key : _sessions.keySet()) {
					try {
						GSession session = _sessions.get(key);
						// Logger.verbose(session.toJSON().toString());
						if (session == null) {
							deadKeys.add(key);
						} else if (!session.isAlive()) {
							deadKeys.add(key);
						}
					} catch (Exception e1) {
						Logger.error(e1);
					}
				}
				for (String sessionKey : deadKeys) {
					// Logger.verbose("Removing missing session: " + sessionKey);
					removeSession(sessionKey);
				}
				deadKeys.clear();
				try {
					Thread.sleep(_checkTimeout);
				} catch (InterruptedException e) {}
			}
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			removeAllSessions();
			_sessions = null;
		}
	}

	/**
	 * Removes a session from the _session's Hashmap and disposes of it. Basically logs the
	 * session off the system.
	 * 
	 * @param sessionKey Session id to remove
	 * @return True if the session existed otherwise false.
	 */
	public static synchronized boolean removeSession(String sessionKey) {
		if (sessionKey == null)
			return false;
		if (_instance._sessions.containsKey(sessionKey)) {
			// Logger.verbose("Session removing: " + sessionKey);
			GSession session = _instance._sessions.remove(sessionKey);
			session.dispose();
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Clears all the session from the application - Logs everyone off the system and/or
	 * clears sessions prior to system shutdown/restart.
	 * 
	 * @return True if no error occurred otherwise false.
	 */
	public static synchronized boolean removeAllSessions() {
		try {
			Logger.verbose("SessionManager.removeAllSessions");

			int count = _instance._sessions.size();
			String[] keys = (String[]) _instance._sessions.keySet().toArray(new String[count]);
			for (int I = 0; I < count; I++) {
				GSession session = _instance._sessions.remove(keys[I]);
				session.dispose();
			}
			return true;
		} catch (Exception e) {
			Logger.error(e);
			return false;
		}
	}

		
	/**
	 * Dumps as all the sessions in the list. Also ends the session check thread.
	 * 
	 */
	public static void dispose() {
		removeAllSessions();
		_instance._alive = false;
		_instance._thread.interrupt();
	}

	/**
	 * Return the WSSession objects associated with a session id
	 * @param key  Session id to return
	 * @return Returns the WSSession if it exists in the _sessions HashMap otherwise return null;
	 */
	public static GSession getSession(String key) {
		if (_instance == null) {
			Logger.error("Error - Session Manager's _instance variable has not been set!");
			return null;
		} else {
			return (_instance._sessions.containsKey(key)) ? _instance._sessions.get(key) : null;
		}
	}

	/**
	 * Serializes the list of sessions as a JSONArray Object.
	 * @return  Returns a JSONArray object of all active sessions
	 */
	public static JSONArray getSessionsAsJSON() {
		List<GSession> list = new ArrayList<GSession>();
		JSONArray array = new JSONArray();
		for (String key : _instance._sessions.keySet()) {
			GSession session = _instance._sessions.get(key);
			if (session != null) {
				list.add(session);
			}
		}
		Collections.sort(list);
		for (GSession session : list) {
			array.put(session.toJSON());
		}
		return array;
	}

	/**
	 * @return Returns a JSONObject of the entire SessionManager.
	 */
	public static JSONObject toJSON() {
		try {
			JSONObject info = new JSONObject();
			info.put("alive", _instance._alive);
			info.put("checkTimeout", _instance._checkTimeout);
			info.put("sessionTimeout", _instance._sessionTimeout);
			info.put("hasThread", null != null);
			info.put("sessions", getSessionsAsJSON());
			return info;
		} catch (Exception e1) {
			Logger.error(e1);
			return null;
		}
	}

	/**
	 * 
	 * @return  Returns the current Session Timeout value
	 */
	public static long getTimeout() {
		return _instance._sessionTimeout;
	}

}
