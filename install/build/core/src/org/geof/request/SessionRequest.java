package org.geof.request;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;

import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.geof.db.QueryBuilder;
import org.geof.encrypt.EncryptUtil;
import org.geof.service.AuthorityMgr;
import org.geof.service.SessionMgr;
import org.geof.service.Transaction;
import org.geof.store.StorageMgr;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Derived DBRequest class used to manage the active user Sessions. Sessions are not stored in
 * the database instead are an in memory list of Sessions.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */

public class SessionRequest extends Request {

	public final static String ENTITYNAME = "session";

	public final static String USRID = "usrid";
	public final static String USR = "usr";
	
	public final static String SESSIONID = "sessionid";
	public final static String LOGIN = "login";
	public final static String LIST = "list";
	public final static String ALL = "all";

	public final static int LOGINFAILED = -1;
	public final static int NORMAL = 1;
	public final static int ADJUSTED = 2;
	public final static int DISABLED = 3;
	public final static int LOCKEDOUT = 4;

	public final static long WAITTIME = 300000;
	public final static int MAXTRIES = 3;
	public final static String FIELDLIST = "id,loginname,digest,salt,statusid,attempts,lastattempt,firstname,lastname,email";

	/**
	 * Class constructor
	 */
	public SessionRequest() {
		_entityname = ENTITYNAME;
	}

	/**
	 * Overrides the base class process() to provide Session specific action handlers.
	 * 
	 * @return True if action was processed
	 */
	@Override
	public boolean process() {
		// TODO: check all permissions here
		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();
		} else if (_actionKey.equalsIgnoreCase(CREATE)) {
			return create();
		} else if (_actionKey.equalsIgnoreCase(DELETE)) {
			return delete();
		} else if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return update();
		}
		return true;
	}

	/**
	 * This method keeps the Session alive.
	 * 
	 * @return Returns true if no error occurs
	 */
	private boolean update() {
		try {
			if (_session != null) {
				long usrid = _session.getUsrID();
				JSONObject result = new JSONObject();
				result.put("usrid", usrid);
				addData(result);
				return true;
			}
		} catch (Exception e) {
			setError(e);
		}
		setError(Transaction.NO_SESSION_ERROR);
		return false;
	}

	/**
	 * Deletes the Session from the SessionManager's session list which effectively logs the
	 * user out of the system.
	 * 
	 * @return Returns true if no error occurs
	 */
	private boolean delete() {
		boolean rtn = false;
		try {
			if ( _where != null ) {
				if (_where.has(SESSIONID)) {
					String id = _where.getString(SESSIONID);
					if (id.equalsIgnoreCase(ALL)) {
						rtn = SessionMgr.removeAllSessions();
					} else {
						rtn = SessionMgr.removeSession(id);
					}
				}
			} else if (_session != null) {
				SessionMgr.removeSession(_session.getKey());
				_session = null;
				_dbi.clearSession();
			}
			rtn = true;
		} catch (Exception e) {
			setError(e);
		} finally {
			if (_transaction != null) {
				_transaction.setSession(_session);
			}
		}
		return rtn;
	}

	/**
	 * Method checks the user login, password, and access status. If the user is valid with an
	 * active status and a correct pair of login and password then a session is created for
	 * the user and added to the SessionManager.
	 * 
	 * @return Returns true if no error occurs
	 */
	private boolean create() {
		boolean rtn = false;
		try {
			if (_session != null) {
				SessionMgr.removeSession(_session.getKey());
				_session = null;
				_transaction.setSession(_session);
			}

			String sentpwd = _where.optString( UsrRequest.PASSWORD, null);
			if ((sentpwd == null) || (sentpwd.length() == 0)) {
				setError("Password missing from login");
				return false;
			}
			
			String loginname = _where.optString( UsrRequest.LOGINNAME, null);
			if ((sentpwd == null) || (sentpwd.length() == 0)) {
				setError("Loginname missing from login");
				return false;
			}			

			EntityMap emap = EntityMapMgr.getEMap(USR);
			_data.put(COLUMNS, FIELDLIST);
			ResultSet rs = _dbi.readRecords(emap, _data);
			if (rs == null) {
				setError("User login failed... Invalid usr id ????");
				return false;
			}

			if (rs.next()) {
				this._usrid = rs.getLong(ID);
				String firstname = rs.getString(UsrRequest.FIRSTNAME);
				String lastname = rs.getString(UsrRequest.LASTNAME);
				String str_salt = rs.getString(UsrRequest.SALT);
				String email = rs.getString(UsrRequest.EMAIL);

				int code = validate(
						this._usrid, 
						rs.getString(UsrRequest.DIGEST), 
						EncryptUtil.getPasswordDigest(sentpwd, str_salt), 
						rs.getInt("statusid"), 
						rs.getInt("attempts"), 
						rs.getTimestamp("lastattempt"));
				rs.close();
				if (code != NORMAL) {
					return false;
				}
								
				ArrayList<Integer> ugroups = AuthorityMgr.getUGroups(_dbi, this._usrid);
				if (_session == null) {
					_session = SessionMgr.createSession(this._usrid, ugroups);
				}
				_session.setLoginname(loginname);
				_session.setData(UsrRequest.EMAIL, email);
				_transaction.setSession(_session);

				_jwriter.openObject(DATA);
				_jwriter.writePair(LOGIN, true);
				_jwriter.writePair("usrid", this._usrid);
				_jwriter.writePair("firstname", firstname);
				_jwriter.writePair("lastname", lastname);
				_jwriter.writePair("sessionid", _session.getSessionID());
				_jwriter.writePair("permissions", AuthorityMgr.convertPermissions(ugroups));
				
				_jwriter.writePair("storageloc", StorageMgr.instance().usableAsJson());
//				_jwriter.writePair("serverconfig", ServerconfigRequest.info(_conn));
				_dbi.read("usrconfig", EntityMapMgr.getEMap("usrconfig"), JsonUtil.getDataWhere(this._usrid));

				_jwriter.closeObject();
				rtn = true;
			} else {
				// user does not exists
				setErrorNoLog("Login failed");
			}
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}
	
	/**
	 * Logical helper method that validates whether or not a user is allowed to created a
	 * session and if their login information is correct.
	 * 
	 * @param usrid Login name
	 * @param pwd Correct login passord
	 * @param sentpwd The password the user used to attempt a login
	 * @param statusid The user accounts current status
	 * @param tries The number of failed tries the user has attempted since the last
	 * successful login
	 * @param last The timestamp of the last login attempt.
	 * @return Returns the new user status;
	 */
	private int validate(long usrid, String digest1, String digest2, long statusid, int tries, Timestamp last) {
		int rtn = -1;
		try {
			if (statusid == DISABLED) {
				setError("Login is disabled");
				return DISABLED;
			}

			long now = new Date().getTime();
			long waituntil = (last == null) ? 0 : last.getTime() + WAITTIME;

			if (waituntil < now) {
				// clear out attempts since the timeout period is over
				tries = 0;

			} else if (tries == MAXTRIES) {
				// too many tries
				int seconds = (int) ((waituntil - now) / 1000);
				int minutes = (int) (seconds / 60);
				seconds = seconds % 60;
				String timeout = "0" + seconds;
				timeout = timeout.substring(timeout.length() - 2);
				setError("User Timedout for - " + minutes + ":" + timeout);
				return LOCKEDOUT;
			}

			if (digest1.equals(digest2)) {
				tries = 0;
				rtn = NORMAL;
				_transaction.setUsrID(usrid);
			} else {
				tries++;
				setError("Login failed ");
				rtn = (tries == MAXTRIES) ? LOCKEDOUT : rtn;
			}

		} catch (Exception e) {
			setError(e.getMessage());
		}
		return rtn;

	}

	/**
	 * Reads all the session data and writes it to the response stream.
	 * 
	 * @return True if the method succeeds otherwise false if an error occurs.
	 */
	private boolean read() {
		boolean rtn = false;
		try {
			if (_data.has(QueryBuilder.DATA_ORDERBY)) {
				
			}
			JSONArray sessionlist = SessionMgr.getSessionsAsJSON();
			_jwriter.writePair("data", sessionlist);
			rtn = true;
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}

}
