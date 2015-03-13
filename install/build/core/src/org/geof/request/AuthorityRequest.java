package org.geof.request;

import org.geof.service.AuthorityMgr;

/**
 * Derived class from ABaseRequest which handles Authority requests.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class AuthorityRequest extends Request {

	public final static String ENTITYNAME = "authority";


	// TODO: Review this class and see if it can better wrapper the AuthorityManager class

	@Override
	public boolean process() {
		// Only the UPDATE action is supported since all other functions are handled directly
		// through the AuthorityManager class
		if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return AuthorityMgr.initialize(_dbi, false, false);
		} else {
			return false;
		}
	}

}
