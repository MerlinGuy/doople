package org.geof.request;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class AuthcodeRequest extends DBRequest {
	
	public final static String GUID = "guid";
	@Override
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(CREATE + ".create_guid")) {
			return create_guid();
		} else {
			return super.process();
		}
	}

	public boolean create_guid() {
		try {
			JSONArray data = new JSONArray();
			JSONObject joGuid = new JSONObject();
			joGuid.append(GUID, java.util.UUID.randomUUID().toString());
			data.put(joGuid);
			_jwriter.writePair("data", data);
			return true;
		} catch (JSONException e) {
			setError(e);
			return false;
		}
	}

}
