package org.geof.service;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;

import org.geof.db.DBInteract;
import org.geof.log.Logger;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The Authority Manager is a resident, static class which handles the authorization of user
 * interaction with RequestObjects. When initialized the all the roles and permissions for
 * those roles into memory. Before a user can complete an Action on a RequestObject the
 * AuthorityManager is queried to determine if the user has the necessary role and permission
 * assigned.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class AuthorityMgr {

	public static final String CREATE = "create";
	public static final String READ = "read";
	public static final String UPDATE = "update";
	public static final String DELETE = "delete";
	public static final String EXECUTE = "execute";

	final static String _sqlUE = "SELECT ugroupid, entity.name, createable, readable, updateable, deleteable, executable"
						+ " FROM ugroup_entity, entity WHERE entity.id = ugroup_entity.entityid"
						+ " ORDER BY entity.name";

	final static String _sqlUsrUgroups = "SELECT ugroupid FROM usr_ugroup WHERE usrid = ?";

	private static HashMap<String, ArrayList<String>> _roles = null;
	private static HashMap<Integer, HashMap<String, boolean[]>> _ugroups = null;
	
	@SuppressWarnings("rawtypes")
	private static Comparator keyComparator = new Comparator(){
			public int compare(Object obj1, Object obj2){
				return ((String)obj1).compareTo((String)obj2);
			}
	};
			
	public final static HashMap<String,Integer> ACTIONS = new HashMap<String,Integer>();
	static
	{
		ACTIONS.put(CREATE, 0);
		ACTIONS.put(READ, 1);
		ACTIONS.put(UPDATE, 2);
		ACTIONS.put(DELETE, 3);
		ACTIONS.put(EXECUTE, 4);
	}
	 
	/**
	 * Class constructor which is private since there is no instatication of this class.
	 */
	private AuthorityMgr() {}

	/**
	 * This method loads all the roles and their permissions into memory.
	 * 
	 * @param dbConn DBConnection used to load the roles and permissions.
	 * @param allowAll If set to true the AuthorityManager allows any action to any users.
	 * This is used only for test purposes
	 * 
	 * @return Returns true if Roles were loaded without any problems.
	 */
	public static boolean initialize(DBInteract dbi, boolean allowAll, boolean readOnly) {
		Logger.writeInit("*** AuthorityManager.initialize started");
		if (dbi == null) {
			Logger.error("PermissionManager.initialize : dbConn = null");
			return false;
		}
		return loadUgroups(dbi);
	}

	public static boolean reloadUgroups(DBInteract dbi) {
		return loadUgroups(dbi);
	}
	
	/**
	 * This method does the actual database queries to load the roles into the roles hashmap
	 * 
	 * @param dbConn DBConnection used to load the roles and permissions.
	 * @return Returns true if there were no errors, otherwise false.
	 */
	private static boolean loadUgroups(DBInteract dbi) {
		try {
			Logger.writeInit(" --- AuthorityMgr.loadUgroups called");
			ResultSet rs = dbi.getResultSet(_sqlUE, null);
			HashMap<Integer, HashMap<String, boolean[]>> ugroups = new HashMap<Integer, HashMap<String, boolean[]>>();
			HashMap<String, boolean[]> map;
			while (rs.next()) {
				Integer ugroupid = rs.getInt("ugroupid");
				if ( ! ugroups.containsKey(ugroupid) ) {
					ugroups.put(ugroupid, new HashMap<String, boolean[]>());
				}
				map = ugroups.get(ugroupid);
				String ename = rs.getString("name");
				boolean[] bray = new boolean [] {
						rs.getBoolean("createable"),
						rs.getBoolean("readable"),
						rs.getBoolean("updateable"),
						rs.getBoolean("deleteable"),
						rs.getBoolean("executable")
					};
				
				map.put(ename, bray);
			}
			rs.close();
			_ugroups = ugroups;
//			printUgroups();
			return true;
		} catch (Exception e) {
			Logger.error(e);
			return false;
		}

	}

	public static boolean hasPermission(GSession session, String requestname, String strAction) {
		try {
			if (! ACTIONS.containsKey(strAction)) {
				Logger.error("AuthorityMgr ERROR: unknown action attempted: " + session.getUsrID() + " - " + requestname + " : " + strAction);
				return false;
			}
			
			int action = ACTIONS.get(strAction);
			ArrayList<Integer> ugroups = session.getUGroups();
			for (Integer ugroupid : ugroups) {
				HashMap<String, boolean[]> map = _ugroups.get(ugroupid);
		        if (map.containsKey(requestname) && map.get(requestname)[action]) {
		        	return true;
		        }
			}
			
		} catch (Exception e) {
			Logger.error(e);
		}
		Logger.error("AuthorityMgr ERROR: usrid: " + session.getUsrID() + " - " + requestname + " : " + strAction);
		return false;
	}
	
	public static ArrayList<Integer> getUGroups(DBInteract dbi, long usrid) {
		String entityname = "", actionname = "";
		PreparedStatement ps = null;
		try {
			ps = dbi.getPreparedStatement(_sqlUsrUgroups);
			ps.setLong(1, usrid);
			ResultSet rs = ps.executeQuery();
			
			ArrayList<Integer> ugroups = new ArrayList<Integer>();
			while (rs.next()) {
				Integer ugroupid = rs.getInt(1);
				if (_ugroups.containsKey(ugroupid)) {
					ugroups.add(ugroupid);
				}
			}
			rs.close();
			ps.close();
//			printUserPermissions(ugroups);
			return ugroups;
		} catch (Exception e) {
			Logger.error("requestname: %s, actionname: %s", entityname, actionname);
			Logger.error(e);
		} finally {
			if (ps != null) {
				try {ps.close();} catch(Exception dbe) {}
			}
		}
		return null;
	}
	
	public static int[] convertBoolArray(boolean[] bray) {
		int[] aray = new int[bray.length];
		for (int i = 0; i < bray.length; i++) {
			aray[i] = bray[i] ? 1 : 0;
		}
		return aray;
	}

	public static HashMap<String, boolean[]> compressPermissions(ArrayList<Integer> ugroups) {
		HashMap<String, boolean[]> permissions = new HashMap<String, boolean[]>();
		
		boolean[] bray,prevaray; 
		for ( int ugroupid : ugroups) {
			
			HashMap<String, boolean[]> map = _ugroups.get(ugroupid);
			
			Iterator<String> keys = map.keySet().iterator();
			while (keys.hasNext()) {
				String entityname = keys.next();
				bray = map.get(entityname);
				if (permissions.containsKey(entityname)) {
					prevaray = permissions.get(entityname);
					for (int indx=0;indx<prevaray.length;indx++){
						bray[indx] |= prevaray[indx];
					}					
				}
				permissions.put(entityname, bray);				
			}
		}
		return permissions;
	}

	public static JSONObject convertPermissions(ArrayList<Integer> ugroups) {
		try {
			JSONObject permissions = new JSONObject();
			HashMap<String, boolean[]> mPermissions = compressPermissions( ugroups );
			Iterator<String> keys = mPermissions.keySet().iterator();
			while (keys.hasNext()) {
				String entityname = keys.next();
				JSONArray jaActions = new JSONArray();
				for (boolean val : mPermissions.get(entityname)) {
					jaActions.put( val ? 1: 0 );
				}
				permissions.put(entityname.toLowerCase(), jaActions);
			}			
			return permissions;
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	
	/**
	 * 
	 * @return  Returns the number of roles loaded into memory
	 */
	public static int getSize() {
		return _roles.size();
	}
	
	public static void printUgroups() {
		Integer ugroupid;
		Iterator<Integer> ugroupids = _ugroups.keySet().iterator();
		while (ugroupids.hasNext()) {
			ugroupid = ugroupids.next();
			HashMap<String, boolean[]> map = _ugroups.get(ugroupid);
			Iterator<String> enames = map.keySet().iterator();
			while (enames.hasNext()) {
				String ename = enames.next();
				boolean[] bray = map.get(ename);
				Logger.debug(ugroupid + ", " + ename + ' ' + bray[0] + ' ' + bray[1]
						 + ' ' + bray[2] + ' ' + bray[3] + ' ' + bray[4]);
			}
		}
	}

	@SuppressWarnings("unchecked")
	public static void printUserPermissions(ArrayList<Integer> ugroups) {
		HashMap<String, boolean[]> permissions = compressPermissions(ugroups);
		List<String> keys = new ArrayList<String>(permissions.keySet());
		Collections.sort(keys,keyComparator);
		boolean[] bray;
		for (String entityname : keys) {
			bray = permissions.get(entityname);
			Logger.debug(entityname + ' ' + bray[0] + ' ' + bray[1]
					 + ' ' + bray[2] + ' ' + bray[3] + ' ' + bray[4]);
		}
	}

	/**
	 * Returns a serialized version of the requested role
	 * @param rolename Role name to serialize
	 * @return  Serialized version of the requested role
	 */
	public static String toString(String rolename) {
		rolename = rolename.toLowerCase();
		if (!_roles.containsKey(rolename)) {
			for (String key : _roles.keySet()) {
				Logger.error("Role names: [" + key + "]");
			}
			return "role not found: (" + rolename + ")";
		}
		ArrayList<String> RequestActions = _roles.get(rolename);
		String rtn = rolename + " : ";
		for (String permission : RequestActions) {
			rtn += permission + ", ";
		}
		return rtn;
	}

}
