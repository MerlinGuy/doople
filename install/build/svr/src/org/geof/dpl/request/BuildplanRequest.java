package org.geof.dpl.request;

import org.geof.db.DBInteract;
import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.geof.request.DBRequest;
import org.json.JSONArray;
import org.json.JSONObject;

public class BuildplanRequest extends DBRequest {

	public final static String ENTITYNAME = "buildplan";

	@Override	
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();
		}
		else if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return update();
		}
		else if (_actionKey.equalsIgnoreCase(CREATE)) {
			return create();
		}
		else if (_actionKey.equalsIgnoreCase(DELETE)) {
			return delete();
		}
		else {
			return super.process();
		}
	}

	
	public static JSONArray getBuildPlan(DBInteract dbi, JSONObject data) {
		EntityMap emap = EntityMapMgr.getEMap(ENTITYNAME);
		return dbi.readAsJson(emap, data);
	}
}
