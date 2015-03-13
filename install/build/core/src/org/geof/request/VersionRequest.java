package org.geof.request;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Derived ABaseRequest object for recording and reading the software version of the server.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */

public class VersionRequest extends Request {

	public static String ENTITYNAME = "version";

	// Software version information stored here.
	public static int MAJOR = 0;
	public static int MINOR = 9;
	public static int REVISION = 0;
//	public static int BUILD = 1;
	public static String SVN_VERSION = "748:753M";
	

	/**
	 * Class constructor
	 */
	public VersionRequest() {
		_entityname = ENTITYNAME;
	}

	/**
	 * Overrides the base class process() to provide Version specific action handlers.
	 * 
	 * @return True if action was processed
	 */
	@Override
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(Request.READ)) {
			return read();
		}
		return false;
	}

	/**
	 * Writes the software version information to the response stream
	 * 
	 * @return  Returns true if method succeeded, false if an error occurred
	 */
	private boolean read() {
		boolean rtn = false;
		try {
			_jwriter.writePair(Request.DATA, toJSON());
			rtn = true;
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}

	/**
	 * 
	 * @return  Returns the full software version in string format
	 */
	public static String getVersion() {
		return MAJOR + "." + MINOR + "." + REVISION + "." + SVN_VERSION;
	}

	/**
	 * Converts the software version information into a JSONObject
	 * 
	 * @return Returns the software version serialzied as a JSONObject
	 */
	public JSONObject toJSON() {
		try {
			JSONObject json = new JSONObject();
			json.put(ENTITYNAME, getVersion());
			return json;
		} catch (JSONException e) {
			setError(e);
			return null;
		}
	}

}
