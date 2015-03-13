package org.geof.request;

import org.geof.store.StorageLocation;
import org.geof.store.StorageMgr;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Derived ABaseRequest class used for handling database interactions for the Storageloc table.
 * Storagelocs are location on the server disk where MediaObject files are stored such as
 * Photo and Videos.
 * 
 * Since Storagelocs are are stored in the database for persistance between system restarts
 * but managed in memory as a list the StorageManager object is used to
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class StoragelocRequest extends Request {

	public final static String ENTITYNAME = "storageloc";

	public final static String LIST = "list";
	public final static String INFO = "info";
	public final static String ENDSESSION = "end";
	public final static String ENDALL = "endall";

	public final static String USRID = "usrid";
	public final static String SESSIONID = "sessionid";
	public final static String ACTIVE = "active";
	public final static String VALIDATE = "validate";
	public final static String NAME = "name";
	public final static String DIRECTORY = "directory";
	
	private StorageMgr _StrgMgr = null; 
	
	/**
	 * Class constructor
	 */
	public StoragelocRequest() {
		_entityname = ENTITYNAME;
		_StrgMgr = StorageMgr.instance();
	}

	/**
	 * Overrides the base class process() to provide Storageloc specific action handlers.
	 * 
	 * @return True if action was processed
	 */

	@Override
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();			
		} else if (_actionKey.equalsIgnoreCase(READ + ".validate")) {
			return validate();
		}  else if (_actionKey.equalsIgnoreCase(CREATE)) {
			return create();
		} else if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return update();
		} else if (_actionKey.equals(DELETE)) {
			return delete();
		}else if (_actionKey.equals(EXECUTE + ".reinit")) {
			return reinitManager();
		}
		return false;
	}

	/**
	 * Returns information about all storage location as a list or if request just a specific
	 * lcations.
	 * 
	 * @return Returns true if no error occurs
	 */
	private boolean read() {
		try {		
			if (_data.has(WHERE)) {
				JSONObject where = _data.getJSONObject(WHERE);
				if (where.has(ID)) {
					long id = where.getLong(ID);
					StorageLocation sl = _StrgMgr.getById(id);
					_jwriter.writePair(DATA, sl.toJSON());
					
				} else if (where.has(ACTIVE)) {
					_jwriter.writePair(DATA, _StrgMgr.asJson(where.getBoolean(ACTIVE)));
					
				}
			} else {
				JSONArray sessionlist = _StrgMgr.getStorageAsJSON();
				_jwriter.writePair(DATA, sessionlist);
			}
			return true;
		} catch (Exception e) {
			setError(e.getMessage());
			return false;
		}
	}
	
	/**
	 * Creates a new Storage location on the server disk and writes the information to the
	 * database table.
	 * 
	 * @return Returns true if no error occurs
	 */
	private boolean create() {
		String error = _StrgMgr.create(_dbi, _data);
		if (error != null) {
			setError( error);
			return false;
		} else {
			writeData(CREATE, true);
		}
		return true;
	}

	/**
	 * Udpates a storage location with new field information
	 * 
	 * @return Returns true if no error occurs
	 */
	private boolean update() {
		String error = _StrgMgr.update(_dbi, _data);
		if (error != null) {
			setError( error);
			return false;
		} else {
			writeData(UPDATE, true);
		}
		return true;
	}

	/**
	 * Deletes a storage location from the server disk
	 * 
	 * @return Returns true if no error occurs
	 */
	private boolean delete() {
		String error = _StrgMgr.delete(_dbi, _data);
		if (error != null) {
			setError( error);
			return false;
		} else {
			writeData(DELETE, true);
		}
		return true;
	}

	private boolean validate() {
		try {
			JSONObject validate = JsonUtil.getJsonObject(_data, VALIDATE, new JSONObject());
			boolean checkName = validate.optBoolean( NAME, true);
			boolean checkDirectory = validate.optBoolean( DIRECTORY, true);
			String error = _StrgMgr.validate(_data, checkName, checkDirectory);
			if (error != null) {
				setError(error);
				return false;
			}
			return true;
		} catch (Exception e) {
			setError(e);
			return false;
		}
	}
	
	private boolean reinitManager() {
		boolean rtn = _StrgMgr.initialize(_dbi);
		writeData("reinit", rtn);
		return rtn;
	}
	
	//TODO: Finish this code so that a system administrator can move one or all files stored in one storage location to another.
	// private boolean move() {
	// boolean rtn = false;
	// try {
	// } catch (Exception e) {
	// Logger.error(e);
	// }
	// return rtn;
	// }
}
