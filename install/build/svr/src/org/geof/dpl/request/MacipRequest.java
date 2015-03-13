package org.geof.dpl.request;

import org.geof.db.DBInteract;
import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.geof.request.DBRequest;
import org.json.JSONArray;
import org.json.JSONObject;

public class MacipRequest extends DBRequest {

	public final static String ENTITYNAME = "macip";

	public static JSONArray getMacIps(DBInteract dbi, JSONObject data) {
		EntityMap emap = EntityMapMgr.getEMap(ENTITYNAME);
		return dbi.readAsJson(emap, data);
	}

}
