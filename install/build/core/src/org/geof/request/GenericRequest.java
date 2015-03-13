package org.geof.request;

import org.geof.db.DBConnMgr;
import org.geof.db.DBConnection;
import org.geof.db.DBInteract;
import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.json.JSONArray;
import org.json.JSONObject;


/**
 * Derived DBRequest class which will handle generic database request. A generic request is
 * one where there is not a Class available to map to a specific EntityMap object.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class GenericRequest extends DBRequest {

	public String ENTITYNAME = "generic";
	/**
	 * Class constructor
	 */
	public GenericRequest() {
		_entityname = "generic";
	}

	/**
	 * Class constructor
	 * @param entityname Name of the EntityMap to use to access the database
	 */
	public GenericRequest(String entityname) {
		this();
		_entityname = entityname;
	}
	
	public void setEntityName(String entityName){
		ENTITYNAME = entityName;
	}
	
	public JSONObject create(String entityName, JSONObject data, DBConnection conn)throws Exception  {
		
		boolean releaseOnExit = (conn == null);
		if (releaseOnExit) {
			conn = DBConnMgr.getConnection();
			releaseOnExit = true;
		}
		JSONObject rtn = create(entityName, data, new DBInteract( conn, null));
		if (releaseOnExit) {
			DBConnMgr.release(conn);
		}
		return rtn;
	}

	public static JSONObject create(String entityName, JSONObject data, DBInteract dbi) throws Exception {
		EntityMap entitymap = EntityMapMgr.loadMap(entityName, dbi);
		dbi.create(entitymap, data);
		return dbi.getLastReturning();
	}

	public static JSONArray read(String entityName, JSONObject data, DBInteract dbi) throws Exception  {
		EntityMap entitymap = EntityMapMgr.loadMap(entityName, dbi);
		return dbi.readAsJson(entitymap, data);
	}

}
