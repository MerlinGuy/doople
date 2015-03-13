package org.geof.request;

import java.util.ArrayList;

import org.geof.service.AuthorityMgr;
import org.json.JSONException;

/**
 * Derived DBRequest object for interacting with Permission table.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class PermissionRequest extends DBRequest {

	public final static String ENTITYNAME = "permission";

	private final static String _sqlClean1 = "DELETE FROM ugroup_entity WHERE ugroupid NOT IN (SELECT id from ugroup)";
	private final static String _sqlClean2 = "DELETE FROM ugroup_entity WHERE entityid NOT IN (SELECT id from entity)";

	/**
	 * Class constructor
	 */
	public PermissionRequest() {
		_entityname = ENTITYNAME;
	}

	/**
	 * Overrides the base class process() to provide Permission specific action handlers.
	 * 
	 * @return True if action was processed successfully otherwise false
	 */
	@Override
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();
			
		} else if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return AuthorityMgr.reloadUgroups(_dbi);
			
		} else if (_actionKey.equalsIgnoreCase(UPDATE + ".fix")) { 
			return fix();
			
		} else {
			//TODO: write code to return error when no actions exist for an entity
			return false;
		}
	}

	@Override
	public boolean read() {
		try {
			int usrid = _where.getInt("usrid");
			ArrayList<Integer> ugroups = AuthorityMgr.getUGroups(_dbi, usrid);
			_jwriter.openObject(DATA);
			_jwriter.writePair("permissions", AuthorityMgr.convertPermissions(ugroups));
			_jwriter.closeObject();
			return true;
		} catch (JSONException e) {
			setError(e.getMessage());
		}
		return false;
		
	}
	/**
	 * Removes orphaned records from the permission_request_dbaction table
	 * 
	 * @return True if method succeeded otherwise false if an error occured
	 */
	public boolean fix() {
		try {
			boolean rtn = _dbi.execute(_sqlClean1, null);
			return rtn && _dbi.execute(_sqlClean2, null);
		} catch (Exception e) {
			setError(e.getMessage());
			return false;
		}
	}
}
