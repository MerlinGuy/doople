package org.geof.request;

import org.geof.db.DBConnMgr;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * DbpoolRequest class provides RequestObject functionality wrapper around the DBConnMgr
 * static object class. This means the same api calls used for ABaseRequest class can be
 * routed to DBConnMgr instead of hitting a database.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class DbpoolRequest extends Request {

	@Override
	/*
	 * Processes Read and Delete calls from clients.
	 * 
	 * @return Returns true if the call was a Read or Delete and successfull otherwise false.
	 */
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();
		} else if (_actionKey.equalsIgnoreCase(DELETE)) {
			delete();
			return true;
		}
		return false;
	}

	/**
	 * Reads all active database connections and writes them to the response stream as a list.
	 * 
	 * @return Returns true if no errors occurr.
	 */
	private boolean read() {
		try {
			JSONArray connections = DBConnMgr.get().getPoolAsJSON();
			connections = JsonUtil.filter(connections, _where);
			_jwriter.writePair("data", connections);
			return true;
		} catch (Exception e) {
			setError(e.getMessage());
			return false;
		}
	}

	/**
	 * Closes Database connections and removes them from the connection pool. This method uses
	 * connection ID information sent in the where section of the data JSONObject.
	 * 
	 * @return Returns true if no errors occurr.
	 */
	private void delete() {
		try {
			int id = _where.getInt(ID);
			if (_dbi.getConnectionId() == id) {
				setError("Can not delete own database connection");
			} else {
				DBConnMgr.get().close(id);
			}
		} catch (JSONException e) {
			setError(e.getMessage());
		}
	}

}
