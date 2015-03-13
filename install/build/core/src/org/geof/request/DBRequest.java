package org.geof.request;

import org.geof.db.DBInteract;
import org.geof.db.EntityMapMgr;

/**
 * Extends the base ABaseRequest class for use with Database EntityMap objects.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class DBRequest extends Request {

	public final static String ID = "id";
	public final static String NAME = "name";
	protected static final String CHILDREN = "children";
	protected static final String TIE = "tie";
	protected static final String LINK = "link";

	/**
	 * Class Constructor
	 */
	public DBRequest() {
		String name = getClass().getName();
		int indx = name.lastIndexOf('.');
		if (indx > -1) {
			name = name.substring( indx + 1 );	
		}
		name = name.substring(0,name.indexOf("Request"));
		_entityname = name.toLowerCase();
	}

	public void init(DBInteract dbi) {
		_dbi = dbi;
		_jwriter = null;
		_entitymap = EntityMapMgr.loadMap(_entityname, _dbi);
	}
	

	// -------------------------------------------

	/**
	 * Method breaks the basic process into Create,Read,Update,and Delete actions and then
	 * processes them.
	 * 
	 * @return Returns true if method action calls succeed
	 */
	@Override
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();
		} else if (_actionKey.equalsIgnoreCase(CREATE)) {
			return create();
		} else if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return update();
		} else if (_actionKey.equalsIgnoreCase(DELETE)) {
			return delete();
		}
		return false;
	}

	/**
	 * Initializes the DBInteract object and then calls the DBInteract create method. This is
	 * used to create records in the ABaseRequest's EntityMap database table.
	 * 
	 * @return Returns the success of the DBInteract.create call
	 */
	protected boolean create() {
		boolean rtn = _dbi.create(_entitymap, _data);
		if (rtn) {
			_transaction.setReturning(String.valueOf(this._requestid), _dbi.getLastReturning());
		}
		return rtn;
	}

	/**
	 * Initializes the DBInteract object and then calls the DBInteract read method. Executes a
	 * SELECT query against the table defined in the EntityMap object.
	 * 
	 * @param leaveOpen If true the Json Script response object is left open for later
	 * additions. Note: If left open then it is the calling method's responsibility to close
	 * the json script correctly.
	 * @return Returns the success of the DBInteract.read call
	 */
	protected boolean read() {
		try {
			return _dbi.read(_entitymap, _data);
		} catch (Exception e) {
			setError(e.getMessage());
			return false;
		}
	}

	/**
	 * Initializes the DBInteract object and then calls the DBInteract update method. Executes
	 * one or more UPDATE queries against the table defined in the EntityMap object.
	 * 
	 * @return Returns the success of the DBInteract.update call
	 */
	protected boolean update() {
		return _dbi.update(_entitymap, _data);
	}
	
	/**
	 * Initializes the DBInteract object and then calls the DBInteract delete method. Executes
	 * one or more DELETE queries against the table defined in the EntityMap object.
	 * 
	 * @return Returns the success of the DBInteract.delete call
	 */
	protected boolean delete() {
		return _dbi.delete(_entitymap, _where);
	}

}
