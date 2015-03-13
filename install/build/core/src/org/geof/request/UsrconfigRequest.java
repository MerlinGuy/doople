package org.geof.request;

/**
 * Derived DBRequest class to handle database interactions for the UsrconfigRequest table
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */

public class UsrconfigRequest extends DBRequest {

	public final static String ENTITYNAME = "usrconfig";
	
	public final static String USRID = "usrid";

	/**
	 * Class constructor
	 */
	public UsrconfigRequest() {
		_entityname = ENTITYNAME;
	}

	@Override
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return create();

		} else if (_actionKey.equalsIgnoreCase(DELETE)) {
			return super.delete();

		} else if (_actionKey.equalsIgnoreCase(CREATE)) {
			return create();

		} else {
			return super.process();
		}
	}

	/**
	 * Creates a new record in the UsrConfig table.
	 * 
	 * @return Returns true if the method succeeds, false if there was an error
	 */
	@Override
	protected boolean create() {
		setFieldValue(USRID, _session.getUsrID());
		if (super.delete()) {
			return super.create();
		}
		return false;
	}

	/**
	 * Deletes a record from the UsrConfig table. 
	 * @return Returns true if the method succeeds, false if there was an error
	 */
	@Override
	protected boolean delete() {
		setFieldValue(USRID, _session.getUsrID());
		return super.delete();
	}

}
