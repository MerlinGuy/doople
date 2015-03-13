package org.geof.request;

import org.geof.db.EntityMapMgr;

/**
 * Derived Class for accessing the EntityField table in the database
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */

public class EntityfieldRequest extends DBRequest {

	public final static String ENTITYNAME = "entityfield";
	/**
	 * Class constructor
	 */
	public EntityfieldRequest() {
		_entityname = ENTITYNAME;
	}

	public boolean process() {
		if (_actionKey.equalsIgnoreCase(UPDATE)) {
			
			if (super.update()) {
				EntityMapMgr.initialize(_dbi);
			}
			return true;
		} else {
			return super.process();
		}
	}

}