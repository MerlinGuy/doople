package org.geof.request;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;

import org.geof.db.DBInteract;
import org.geof.db.ParameterList;
import org.geof.encrypt.EncryptUtil;
import org.geof.service.AuthorityMgr;
import org.geof.util.JsonUtil;

public class UsrRequest extends DBRequest {
	public final static String ENTITYNAME = "usr";

	public final static String DIGEST = "digest";
	public final static String SALT = "salt";
	public final static String CLEARCODE = "clearcode";
	public final static String PASSWORD = "password";
	public final static String EMAIL = "email";
	public final static String NEWPASSWORD = "newpassword";
	public final static String LOGINNAME = "loginname";
	public final static String FIRSTNAME = "firstname";
	public final static String LASTNAME = "lastname";
	public final static String ATTEMPTS = "attempts";
	public final static String LASTATTEMPT = "lastattempt";
	public final static String ADMIN_BANNED = "lastattempt,digest,";
	public final static String USR_BANNED = "statusid,attempts,lastattempt,digest,clearcode,salt";
	public final static String RTN_BANNED = "statusid,attempts,lastattempt,digest,clearcode,salt";

	public final static int IS_USR = 1;
	public final static int IS_ADMIN = 2;
	public final static int ID_MISSING = 3;
	public final static int NO_PERMISSION = 4;
	
	private final static String _sqlExists = "SELECT count(id) as id_count FROM usr WHERE loginname = ?";
	private final static String _sqlEmail = "SELECT email FROM usr WHERE id = ?";
	private final static String _sqlEmailByLogin = "SELECT email FROM usr WHERE loginname = ?";
	private final static String _sqlDigest = "UPDATE usr set digest=?, salt=?,clearcode=? WHERE id=?";
	private final static String _sqlUpdDigest = "UPDATE usr set digest=?,salt=?,clearcode=? WHERE loginname=?";
	private final static String _sqlCreateUsr = "INSERT INTO usr (firstname,lastname,email,loginname,clearcode,digest,salt) VALUES (?,?,?,?,?,?,?)";
	private final static String _sqlUpdEmail = "UPDATE usr set email=? WHERE loginname=?";

	
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();
		}else if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return update();
		}else if (_actionKey.equalsIgnoreCase(UPDATE + ".password")) {
			return change_password();
		}else if (_actionKey.equalsIgnoreCase(CREATE)) {
			return create();
		}else if (_actionKey.equalsIgnoreCase(DELETE)) {
			return delete();
		} else {
			return super.process();
		}
	}
	
	@Override
	public boolean create() {
		boolean rtn = false;
		try {

			String loginname = _fields.getString(LOGINNAME);
			if (loginExists(loginname)) {
				setError("UsrRequest.create loginname [" + loginname + "] already exists");
				return false;
			}

			String password = _fields.getString(PASSWORD);
			String[] salt_hash = EncryptUtil.hashAndHexBC(password);
			JsonUtil.remove(_fields, null, ADMIN_BANNED);
			_fields.put(SALT, salt_hash[0]);
			_fields.put(DIGEST, salt_hash[1]);
			rtn = super.create();
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}
	
	public boolean createUsr(HashMap<String,String> values) {
		boolean rtn = false;
		try {
			String[] reqd = "firstname,lastname,loginname,password,email".split(",");
			for (String key : reqd) {
				if (! values.containsKey(key)) {
					setError("UsrRequest.createUsr missing value for " + key);
					return false;
				}
			}
			String loginname = values.get(LOGINNAME);
			if (loginExists(loginname)) {
				setError("UsrRequest.createUsr loginname [" + loginname + "] already exists");
				return false;
			}
			String email = values.get(EMAIL); 
			if (email == null || email.length() < 3) {
				setError("UsrRequest.createUsr invalid email");
				return false;
			}
			
			String password = values.get(PASSWORD);
			String[] salt_hash = EncryptUtil.hashAndHexBC(password);
			String clearcode = EncryptUtil.hash256(email);
			//firstname,lastname,loginname,password,clearcode,digest,salt
			int indx=1;
			PreparedStatement ps = _dbi.getPreparedStatement(_sqlCreateUsr);
			ps.setString(indx++, values.get(FIRSTNAME));
			ps.setString(indx++, values.get(LASTNAME));
			ps.setString(indx++, values.get(EMAIL));
			ps.setString(indx++, loginname);
			ps.setString(indx++, clearcode);
			ps.setString(indx++, salt_hash[1]);			
			ps.setString(indx++, salt_hash[0]);
			ps.execute();
			ps.close();
			return true;
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}
	
	public boolean updatePassword(HashMap<String,String> values) {
		try {		
			String[] reqd = "loginname,password".split(",");
			for (String key : reqd) {
				if (! values.containsKey(key)) {
					setError("UsrRequest.updatePassword missing value for " + key);
					return false;
				}
				String value = values.get(key);
				if (value == null || value.length() == 0) {
					setError("UsrRequest.updatePassword invalid value for " + key);
					return false;
				}
			}
			String password = values.get(PASSWORD);
			if (password == null || password.length() < 8) {
				setError("Invalid password");
				return false;
			}
			String loginname = values.get(LOGINNAME);
			if (loginname == null || (! loginExists(loginname))) {
				setError("Invalid loginname");
				return false;
			}
			String email = getEmail(_dbi, null, loginname);
			if (email == null) {
				setError("failed getEmail");
				return false;
			}
			
			String clearcode = EncryptUtil.hash256(email);
			
			//"UPDATE usr set digest=?,salt=?,clearcode=? WHERE loginname=?";
			String[] salt_hash = EncryptUtil.hashAndHexBC(password);			
			PreparedStatement ps = _dbi.getPreparedStatement(_sqlUpdDigest);
			ps.setString(1, salt_hash[1]);
			ps.setString(2, salt_hash[0]);
			ps.setString(3, clearcode);
			ps.setString(4, loginname);
			ps.execute();
			ps.close();
			return true;
		} catch (Exception e) {
			System.out.println("Error: " + e.getMessage());
			setError(e.getMessage());
			return false;
		}
	}

	public boolean changeEmail(HashMap<String,String> values) {
		try {		
			String[] reqd = "loginname,email".split(",");
			for (String key : reqd) {
				if (! values.containsKey(key)) {
					setError("UsrRequest.changeEmail missing value for " + key);
					return false;
				}
				String value = values.get(key);
				if (value == null || value.length() == 0) {
					setError("UsrRequest.changeEmail invalid value for " + key);
					return false;
				}
			}

			String email = values.get(EMAIL);
			if (email == null || email.length() < 8) {
				setError("Invalid email address");
				return false;
			}
			
			String loginname = values.get(LOGINNAME);
			if (loginname == null || (! loginExists(loginname))) {
				setError("Invalid loginname");
				return false;
			}
			PreparedStatement ps = _dbi.getPreparedStatement(_sqlUpdEmail);
			ps.setString(1, email);
			ps.setString(2, loginname);
			ps.execute();
			ps.close();
			return true;
		} catch (Exception e) {
			setError(e.getMessage());
			return false;
		}
	}
	
	public static String getEmail(DBInteract dbi, Long usrid, String loginname) throws Exception {
		ResultSet rs = null;
		String error = null;
		String email = null;
		try {
			PreparedStatement ps = null;
			if (usrid != null) {
				ps = dbi.getPreparedStatement(_sqlEmail);
				ps.setLong(1, usrid);
				
			} else if (loginname != null) {
				ps = dbi.getPreparedStatement(_sqlEmailByLogin);
				ps.setString(1, loginname);
				
			} else {
				error = "UsrRequest.getEmail: missing both usrid and loginname";
				throw new Exception(error);
			}
			rs = ps.executeQuery();
			if (rs.next()) {
				email = rs.getString(1);
			} else {
				error = "ERROR user not found";
			}
		} catch (Exception e) {
			error = "ERROR UsrRequest.getEmail: " + e.getMessage();
		} finally {
			if (rs != null) {
				try {
					rs.close();
				} catch (Exception e) {
				}
			}
		}
		if (error != null) {
			throw new Exception(error);
		}
		return email;
	}
	
	private boolean loginExists(String loginname) {
		ResultSet rs = null;
		try {
			ParameterList pl = new ParameterList(ENTITYNAME);
			pl.add("loginname", loginname);
			rs = _dbi.getResultSet(_sqlExists, pl);
			if (rs.next()) {
				return rs.getInt(1) > 0;
			} else {
				setError("UsrRequest.loginExists returned no ResultSet entries");
			}
		} catch (Exception e) {
			setError("UsrRequest.loginExists error: " + e.getMessage());
		} finally {
			if (rs != null) {
				try {
					rs.close();
				} catch (Exception e) {
				}
			}
		}
		return true;
	}

	@Override
	public boolean read() {
		int rtn = checkUsr(READ);
		if ((IS_USR == rtn) || (IS_ADMIN == rtn)) {
			JsonUtil.stripElements(_data, COLUMNS, RTN_BANNED);
			return super.read();
		} else if (ID_MISSING == rtn) {
			setError("Data.Fields missing ID");
		} else {
			setError("User doesn't have permission to read other users.");
		} 
		return false;
	}

	@Override
	public boolean update() {
		int rtn = checkUsr(UPDATE);
		if (IS_USR == rtn)  {
			JsonUtil.remove(_data, FIELDS, RTN_BANNED);
			return super.update();
		} else if (IS_ADMIN == rtn) {
			JsonUtil.remove(_data, FIELDS, ADMIN_BANNED);
			return super.update();			
		} else if (ID_MISSING == rtn) {
			setError("Data.Fields missing ID");
		} else {
			setError("User doesn't have permission to update other users.");
		} 
		return false;
	}
	
	public boolean change_password() {
		try {			
			int rtn = checkUsr(UPDATE);
			if (ID_MISSING == rtn) {
				setError("Data.Fields missing ID");
				return false;
			} else if (NO_PERMISSION == rtn){
				setError("User doesn't have permission to update other users.");
				return false;
			} 
			int id = _where.getInt(ID);
			
			String password = _fields.optString( PASSWORD, null);			
			if (password == null) {
				setError("New password missing");
				return false;
			}
			String error = UsrRequest.isValidPassword(password);
			if (error != null) {
				setErrorNoLog(error);
				return false;
			}
			
			String clearcode = _fields.optString(CLEARCODE, "");
			String[] salt_hash = EncryptUtil.hashAndHexBC(password);			
			PreparedStatement ps = _dbi.getPreparedStatement(_sqlDigest);
			ps.setString(1, salt_hash[1]);
			ps.setString(2, salt_hash[0]);
			ps.setString(3, clearcode);
			ps.setInt(4, id);
			ps.execute();
			ps.close();
			return true;
		} catch (Exception e) {
			setError(e.getMessage());
			return false;
		}
	}

	@Override
	public boolean delete() {
		return super.delete();
	}

	public static String isValidPassword(String password) {
		if ((password == null) || (password.length() == 0)) {
			return "Empty password";
		}

		if (password.length() < 8) {
			return "Short password";
		}

		int strength = 0;
		String[] checks = { 
				".*[a-z]+.*", // lower
				".*[A-Z]+.*", // upper
				".*[\\d]+.*", // digits
				".*[@#$%]+.*" // symbols
		};

		if (password.matches(checks[0])) {
			strength += 25;
		}
		if (password.matches(checks[1])) {
			strength += 25;
		}
		if (password.matches(checks[2])) {
			strength += 25;
		}
		if (password.matches(checks[3])) {
			strength += 25;
		}
		if (strength < 75) {
			return "Weak password - Must match 3 of (lowercase, uppercase, number, symbol)";
		}
		return null;
	}

	private int checkUsr(String action) {
		if ( AuthorityMgr.hasPermission(_session, ENTITYNAME, CREATE)) {
			return IS_ADMIN;
		}
		
		int id = _where.optInt( ID, -1);		
		if (id == -1) {
			return ID_MISSING;
		}
		if (id == _session.getUsrID()) {
			return IS_USR;
		}
		return NO_PERMISSION;		
	}
}