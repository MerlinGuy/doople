package org.geof.request;

import org.geof.log.Logger;
import org.json.JSONObject;

/**
 * Derived ABaseRequest class which retrieve log file contents
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class LoggerRequest extends Request {

	public final static String SETLEVEL = "setlevel";
	public final static String RUNTEST = "runtest";
	public final static String LEVEL = "level";
	public final static String FILEPATH = "filepath";
	public final static String CONTENT = "content";
	public final static String TAIL = "tail";

	/**
	 * Class constructor
	 */
	public LoggerRequest() {
		_entityname = "logger";
	}

	/**
	 * @see ABaseRequest.process()
	 * @return Returns true if the action is processes sucessfully otherwise false. 
	 * 
	 */
	@Override
	public boolean process() {

		if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return update();

		} else if (_actionKey.equalsIgnoreCase(READ)) {
			return readContents();
			
		} else if (_actionKey.equalsIgnoreCase(READ + ".settings")) {
			return read();
			
		} else if (_actionKey.equalsIgnoreCase(DELETE)) {
			return delete();
		}
		return false;
	}

	/**
	 * Retrieves lines from the log file and writes them to the response stream
	 * @return Returns true if the method succeeds otherwise false if an error occurs
	 */
	protected boolean readContents() {
		boolean rtn = false;
		try {
			String filename = _where.optString( "filename", "geof.conf");
			boolean isInit = filename.compareToIgnoreCase("init.log") == 0;
			int tail = _data.optInt( TAIL, -1);
			_jwriter.writePair(ENCODE, true);
			_jwriter.writePair(DATA, Logger.getContents(tail, isInit));

		} catch (Exception e) {
			setError(e.getMessage());
		}
		return rtn;
	}

	/**
	 * Retrieves lines from the log file and writes them to the response stream
	 * @return Returns true if the method succeeds otherwise false if an error occurs
	 */
	protected boolean read() {
		boolean rtn = false;
		try {
			String filename = _where.optString( "filename", "geof.conf");
			boolean isInit = filename.compareToIgnoreCase("init.log") == 0;

			int tail = _data.optInt( TAIL, -1);
			_jwriter.writePair(ENCODE, true);
			_jwriter.openArray(DATA);
			JSONObject reply = new JSONObject();
			reply.put(LEVEL, Logger.getLogLevel());
			reply.put(FILEPATH, Logger.getFilePath());
			reply.put(CONTENT, Logger.getContents(tail, isInit));
			_jwriter.writeValue(reply);
			_jwriter.closeArray();

		} catch (Exception e) {
			setError(e.getMessage());
		}
		return rtn;
	}
	/**
	 * Changes the default level of logging or runs a test of the logging system
	 * @return Returns true if the method succeeds otherwise false if an error occurs
	 */
	private boolean update() {
		if (_actionAs.equalsIgnoreCase(RUNTEST)) {
			return runTest();
		} else {
			return setLevel();
		}
	}

	private boolean delete() {
		return Logger.truncate();
	}
	/**
	 * Sets the new level of logging
	 * @return Returns true if the method succeeds otherwise false if an error occurs
	 */
	private boolean setLevel() {
		boolean rtn = false;
		try {
			if (_data.has(LEVEL)) {
				Logger.forceWrite("Logger.setlevel:" + _data.getString(LEVEL));
				Logger.setLogLevel(_data.getInt(LEVEL));
				JSONObject data = new JSONObject();
				data.put("Log Level ", Logger.getLogLevel());
				addData(data);
				rtn = true;
			}
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}

	/**
	 * Runs a test of the logging system and writes the output to the log file.
	 * @return Returns true if the method succeeds otherwise false if an error occurs
	 */
	private boolean runTest() {
		boolean rtn = false;
		try {
			// _FATAL=0,_ERROR=1,_WARN=2,_INFO=3,_DEBUG=4,_VERBOSE=5,_ALL=6;
			Logger.forceWrite("Log Level: " + Logger.getLogLevel());
			Logger.verbose("Verbose test");
			Logger.debug("Debug test");
			Logger.info("Info test");
			Logger.warn("Warn test");
			Logger.error("Error test");
			JSONObject data = new JSONObject();
			data.put("Log test ", "Success - check logs");
			addData(data);
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}

}
