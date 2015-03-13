package org.geof.request;

import java.sql.Timestamp;
import java.util.Date;

import org.geof.db.DBInteract;
import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.geof.log.Logger;
import org.geof.service.AuthorityMgr;
import org.geof.service.JsonWriter;
import org.geof.service.Transaction;
import org.geof.service.GSession;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Abstract Class which forms the base class for all transaction requests. A RequestObject can
 * preform a number of actions on an Entity object which can represent a database table, file,
 * or in memory list of data. The base set of actions are Create, Read, Update, Delete, and
 * Execute.
 * 
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public abstract class Request {

	public final static String ID = "id";

	public static final String ENTITYNAME = "entity";
	public final static String ACTION = "action";
	public final static String ACTIONAS = "actionas";
	public final static String ENTITY = "entity";
	public final static String REQUESTID = "requestid";
	public final static String DATA = "data";
	public final static String ENCODE = "encode";
	public final static String ENCODED = "encoded";
	public final static String ORDER = "order";
	public final static String ROWS = "rows";
	public final static String CONSTRAINTS = "constraints";
	public final static String FIELDS = "fields";
	public final static String COLUMNS = "columns";
	public final static String WHERE = "where";
	public final static String COMPLEXWHERE = "complexwhere";
	public final static String COLUMN = "column";
	public final static String OPERATOR = "operator";
	public final static String VALUE = "value";
	
	public final static String LINK = "link";
	public final static String LINKS = "links";
	public final static String JOIN = "join";
	public final static String ORDERBY = "orderby";
	public final static String GROUPBY = "groupby";
	public final static String MISSING = "missing";
	public final static String DIRECTION = "direction";
	public final static String SORTFIELD = "sortfield";	
	
	public final static String REFERENCE = "reference";		
	public final static String DOLLAR = "$";		
	
	public final static String ERROR = "error";
	public final static String SUCCESS = "success";
	

	//TODO: change to "_id" after db upgrade
	public final static String TABLE_ID = "id"; 
	
	public final static String LOGIN = "login";
	public final static String LOGOUT = "logout";
	public final static String USR = "usr";
	public final static String SESSION = "session";

	public final static String CREATE = "create";
	public final static String READ = "read";
	public final static String UPDATE = "update";
	public final static String DELETE = "delete";
	public final static String EXECUTE = "execute";
	public final static String CREATEDATE = "createdate";	
	
	protected GSession _session = null; // Usr session performing the request
	protected JSONObject _request = null; // pointer to actual received request object
	protected String _action = null; // Main action type to perform
	protected String _actionAs = null; // Secondary action to perform. All responses will use
	
	// this as the return action
	protected int _order = 0;
	protected int _requestid = -1;
	protected JSONObject _data = null; // JSONObject which holds all passed in information
	protected JSONObject _fields = null; // JSONObject which holds all passed in information
	protected JSONObject _where = null; // JSONObject which holds all passed in information
	protected JSONObject _link = null;
	
	protected String _actionKey = "";
	
	// needed for the request
	protected String _encode = null; // Boolean denoting if return data in the form of strings
	// should be Base64 encoded.
	protected String _error = null;
	protected String _entityname = null; // 
	protected EntityMap _entitymap = null; // Entity that all actions are performed against
	protected Transaction _transaction = null;
	protected DBInteract _dbi = null;
	protected long _usrid = -1;
	protected JsonWriter _jwriter = null; // Pointer to response writer usually HTTP stream
										// but can be file based also

	/**
	 * This static method attempts to instantiate a derived Request object that is specified
	 * in the passed int JSONObject request field.
	 * 
	 * @param request JSONObject which holds all necessary data to preform the Request Action
	 * @param transaction Parent transaction which session, jsonwriter and other information
	 * @return The instantiated Request Object
	 */
	public static Request getInstance(JSONObject request, Transaction transaction) {
		String classname = "";
		try {
			
			if (!request.has(ENTITYNAME)) {
				Logger.error("Request.getInstance: request does not have element " + ENTITYNAME);
				return null;
			}
			String entityName = request.getString(ENTITYNAME).toLowerCase();
			if (entityName.length() == 0) {
				Logger.error("Request.getInstance: entity field is empty.");
				return null;
			}

			classname = entityName.substring(0, 1).toUpperCase() + entityName.substring(1) + "Request";
			// Logger.verbose("Classname = " + classname);
			// TODO: write code to handle plugin class directory check also
			String fullClassname = "org.geof.request." + classname;
			Class<?> c = null;
			try {
				c = Class.forName(fullClassname);
			} catch( ClassNotFoundException e ) {
				// Create a GenericRequest and send that back
				c = Class.forName("org.geof.request.GenericRequest");
			}				
			Request instance = (Request) c.newInstance();
			if (instance == null) {
				Logger.error("Could not instantiate object: " + fullClassname);
				return null;
			}
			instance.initialize(entityName, transaction, request);
			return instance;
		} catch (Exception e) {
			Logger.error(e);
			Logger.error("Request.getRequestObject Failed to find Request: " + classname);
			return null;
		}
	}

	/**
	 * Initializes the RequestObject
	 * 
	 * @param entityname The EntityMap object name to use for accessing the database
	 * @param transaction Transaction object
	 * @return True if the method succeeds otherwise false if an error occurs
	 */
	public boolean initialize(String entityname, Transaction transaction, JSONObject request) {

		try {
			_entityname = entityname;
			_transaction = transaction;
			_session = transaction.getSession();
			
			_dbi = transaction.getDBInteract();
			_request = request;
			_jwriter = transaction.getStream();

			if (!_request.has(ACTION)) {
				setError("request missing action ");
				_action = MISSING;
				return false;
			}
			if (!_request.has(REQUESTID)) {
				_requestid = -1;
			} else {
				_requestid = _request.getInt(REQUESTID);
			}

			_action = _request.getString(ACTION);
			if (_action.length() == 0) {
				setError("request action length 0 ");
				_action = MISSING;
				return false;
			}

			_actionKey = _action;
			_actionAs = _request.optString(ACTIONAS, "");
			if (_actionAs.length() > 0) {
				_actionKey += "." + _actionAs;
			}
			
			_data = JsonUtil.getJsonObject(_request, DATA, new JSONObject());
			if (_data.has(REFERENCE)) {
				processReference(_data.getString(REFERENCE));
			}
			_fields = JsonUtil.getJsonObject(_data, FIELDS, new JSONObject());
			_where = JsonUtil.getJsonObject(_data, WHERE, new JSONObject());
			String[] keys = JSONObject.getNames(_where);
			if (keys != null && keys.length > 0) {
				for ( String key :  keys){
		            if( _where.isNull(key) ){
		            	setError("WHERE statement includes 'null' values");
		            	return false;
		            }
		        }
			}			
			_link = JsonUtil.getJsonObject(_data, LINK, null);			
			_encode = _request.optString( ENCODE, null);
			_order = _request.optInt( ORDER, 0);

			_entitymap = EntityMapMgr.loadMap(_entityname, _dbi);

			return true;
		} catch (JSONException e) {
			setError(e.getMessage());
			return false;
		}
	}
	
	/*
            "data":{
				"reference":"fields,where"
                "fields":{
                    "usrid":1,
                    "$notificationid":"1.<fieldname>"
            },
	 */
	private void processReference(String reference) {
		try {
			String[] elements = reference.split(",");
			int len = elements.length;
			JSONObject jo;
			Object val;
			String fieldname,lookup;
			
			for (int indx=0;indx<len;indx++) {
				jo = _data.getJSONObject(elements[indx]);
				JSONArray names = jo.names();
				int nLen = names.length();
				for (int nIndx=0;nIndx<nLen;nIndx++) {
					fieldname = names.getString(nIndx);
					if (fieldname.startsWith(DOLLAR)) {
						lookup = jo.getString(fieldname);
						jo.remove(fieldname);
						val = _transaction.getReturning(lookup, null);
						if (val != null) {
							jo.put(fieldname.substring(1), val);
						}
					}
				}
			}
		} catch (Exception e) {
			setError(e);
		}
	}

	/**
	 * Initializes the RequestObject
	 * 
	 * @param entityname The EntityMap object name to use for accessing the database
	 * @param dbi DBInteract object to access the database
	 * @return True if the method succeeds otherwise false if an error occurs
	 */
	public boolean initialize(String entityname, JSONObject data, DBInteract dbi) {

		try {
			_data = data;
			_entityname = entityname;
			_dbi = dbi;
			_jwriter = new JsonWriter();
			_entitymap = EntityMapMgr.loadMap(_entityname, dbi);
			return true;
		} catch (Exception e) {
			setError(e);
			return false;
		}
	}

	public EntityMap getEntityMap() {
		return EntityMapMgr.getEMap(_entityname);
	}
	
	public void removeWriter() {
		this._jwriter = null;
	}
	

//	/**
//	 * The top level method for executing all request actions
//	 * 
//	 * @return True if the method succeeds otherwise false
//	 */
//	public boolean executeRequest(boolean writeHeaderFooter) {
//		if (writeHeaderFooter) {
//			writeRequestHeader(); // Start the response write with this header information
//		}
//		boolean rtn = false; // Check the user's authorization to perform this request
//
//		if (rtn = authorize()) {
//			// perform any preprocessing actions
//			if (rtn = preprocess()) {
//				// Process the request
//				if (rtn = process()) {
//					// Perorm any remaining actions if necessary
//					rtn = postprocess();
//				}
//			}
//		}
//		if (writeHeaderFooter) {
//			// Write the response footer to the output stream
//			writeRequestFooter();
//		}
//		return rtn;
//	}

	/**
	 * The top level method for executing all request actions
	 * 
	 * @return True if the method succeeds otherwise false
	 */
	public boolean executeRequest() {
		writeRequestHeader(); // Start the response write with this header information
		boolean rtn = false; // Check the user's authorization to perform this request
		if (rtn = authorize()) {
			rtn = process();
		}
		writeRequestFooter();
		return rtn;
	}
	public boolean executeRequestSilent() {
		boolean rtn = false; // Check the user's authorization to perform this request
		if (rtn = authorize()) {
			rtn = process();
		}
		return rtn;
	}
	/**
	 * Writes the request header text as json script to the response stream
	 */
	protected void writeRequestHeader() {
		if (_jwriter != null) {
			try {
				_jwriter.openObject();
				_jwriter.writePair(ENTITY, _entityname);
				_jwriter.writePair(ACTION, ((_actionAs == null || _actionAs.length() == 0) ? _action : _actionAs));
				_jwriter.writePair(REQUESTID, _requestid);
				if (_encode != null) {
					_jwriter.writePair(ENCODE, _encode);
				}
			} catch (Exception e) {
				setError(e);
			}
		}
	}

	/**
	 * Writes the request header text as json script to the response stream
	 */
	public static void writeRequestHeader(JsonWriter jwriter, String entityname, String action, String actionAs, int requestid, String encode) {
		if (jwriter != null) {
			try {
				jwriter.openObject();
				jwriter.writePair(ENTITY, entityname);
				jwriter.writePair(ACTION, ((actionAs == null || actionAs.length() == 0) ? action : actionAs));
				jwriter.writePair(REQUESTID, requestid);
				if (encode != null) {
					jwriter.writePair(ENCODE, encode);
				}
			} catch (Exception e) {
				Logger.error(e);
			}
		}
	}
	/**
	 * Writes any json script to the response stream that is necessary to close the object
	 */
	protected void writeRequestFooter() {
		if (_jwriter == null) {
			return;
		}
		if (_error != null) {
			_error = _error.replaceAll("\"","\'");
			_jwriter.writePair("error", _error);
		}
		_jwriter.closeObject();
	}

	/**
	 * overrideable method for performing any setup actions prior to request processing
	 * 
	 * @return
	 */
	public boolean preprocess() {
		return true;
	}

	/**
	 * overrideable method for performing any closing actions after request processing
	 * 
	 * @return
	 */
	public boolean postprocess() {
		return true;
	}

	/**
	 * Writes a JSONObject as a string to the response stream
	 * 
	 * @param data Payload in the form of a JSONObject
	 * @return True
	 */
	protected boolean addData(JSONObject data) {
		_jwriter.writePair(DATA, data);
		return true;
	}

	/**
	 * Writes a JSONArray as a string to the response stream
	 * 
	 * @param data Payload in the form of a JSONObject
	 * @return True
	 */
	protected boolean addData(JSONArray data) {
		_jwriter.writePair(DATA, data);
		return true;
	}

	public boolean writeData(String name, Object value) {
		try {
			JSONObject content = new JSONObject();
			content.put(name, value);
			_jwriter.openArray(DATA);
			_jwriter.writeValue(content);
			_jwriter.closeArray();
			return true;
		} catch (JSONException e) {
			setError(e.getMessage());
			return false;
		}
	}

	/**
	 * Abstract method that all inheriting classes must override in order preform request
	 * processing
	 * 
	 * @return True if the method succeeds
	 */
	public abstract boolean process();

	/**
	 * Checks to see if the usr has the necessary permissions to perform the specified actions
	 * on the request object
	 * 
	 * @return True if the user has the necessary privileges otherise false.
	 */
	private boolean authorize() {
		// No permissions needed to attempt login
		if ((_entityname.compareTo(SESSION) == 0) && (_action.compareTo(CREATE) == 0)) {
			return true;
		}

		if (_session == null) {
			// Logger.verbose("Entity: " + _entityname + ", Action: " + _action);
			setError(Transaction.NO_SESSION_ERROR);
			_transaction.setError(Transaction.NO_SESSION_ERROR);
			return false;

		} else if (! AuthorityMgr.hasPermission(_session, _entityname, _action)) {
			setError("User does not have permission for Entity:" + _entityname + ", Action:" + _action);
			return false;
		}
		return true;
	}

	/**
	 * Addis a field and value to the _data field
	 * 
	 * @param fieldname Name of the field to add
	 * @param value Value to set for the field
	 * @return True if the method succeeds otherwise false
	 */
	public boolean setFieldValue(String fieldname, Object value) {
		try {
			if (_data != null) {
				JSONObject fields = null;
				if (_data.has(FIELDS)) {
					fields = _data.getJSONObject(FIELDS);
				} else {
					fields = new JSONObject();
					_data.put(FIELDS, fields);
				}
				if (fields.has(fieldname)) {
					fields.remove(fieldname);
				}
				fields.put(fieldname, value);
				return true;
			}
		} catch (JSONException e) {
			setError(e);
		}
		return false;
	}

	/**
	 * Set current error message and writes to the response stream
	 * 
	 * @param errMsg Message to set and write
	 */
	public void setErrorNoLog(String errMsg) {
		_error = errMsg;
	}
	
	/**
	 * Set current error message and writes to the response stream
	 * 
	 * @param errMsg Message to set and write
	 */
	public boolean setError(String errMsg) {
		_error = errMsg;
		Logger.error(errMsg);
		return false;
	}

	public void setError(String errMsg, Exception e) {
		_error = errMsg;
		Logger.error(e);
	}

	public void setError(Exception e) {
		_error = e.getMessage();
		Logger.error(e);
	}

	/**
	 * 
	 * @return Returns the current error message
	 */
	public String getError() {
		return _error;
	}

	public long getUsrId() {
		return _usrid;
	}
	/**
	 * 
	 * @return Returns the current date/time in SQL format
	 */
	protected java.sql.Date newSQLDate() {
		return new java.sql.Date((new Date()).getTime());
	}

	/**
	 * 
	 * @return Returns the current date/time as a Timestamp object
	 */
	protected Timestamp newSQLTimestamp() {
		return new Timestamp(new Date().getTime());
	}

	/**
	 * 
	 * @return Returns the Request object's entity name
	 */
	public String getEntity() {
		return _entityname;
	}

	/**
	 * 
	 * @return Returns the current Request action
	 */
	public String getAction() {
		return _action;
	}

	/**
	 * 
	 * @return Returns the current Request actionas if set otherwise it will return an empty
	 * string
	 */
	public String getActionAs() {
		return _actionAs == null ? "" : _actionAs;
	}

	/**
	 * 
	 * @return The request id associated with this request
	 */
	public int getRequestID() {
		return _requestid;
	}

	/**
	 * 
	 * @return Returns the transaction's execution order index for this request
	 */
	public int getOrder() {
		return _order;
	}

	/**
	 * 
	 * @return Returns the encode string
	 */
	public String getEncode() {
		return _encode;
	}

}
