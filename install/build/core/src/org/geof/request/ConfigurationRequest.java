package org.geof.request;

import java.util.ArrayList;

import org.geof.prop.GlobalProp;

/**
 * Derived ABaseRequest class which retrieve log file contents
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class ConfigurationRequest extends Request {

	public final static String PROPERTIES = "properties";
	public final static String NAME = "name";
	public final static String VALUE = "value";
	/**
	 * Class constructor
	 */
	public ConfigurationRequest() {
		_entityname = "configuration";
	}

	/**
	 * @see ABaseRequest.process()
	 * @return Returns true if the action is processes sucessfully otherwise false. 
	 * 
	 */
	@Override
	public boolean process() {

		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();
		}
		return false;
	}

	protected boolean read() {
		GlobalProp gp = GlobalProp.instance();
		_jwriter.openArray(DATA);
		ArrayList<String> keys = gp.getSortedKeys();
		for (String key : keys) {
			_jwriter.openObject();
			_jwriter.writePair(NAME, key);
			_jwriter.writePair(VALUE, gp.get(key));
			_jwriter.closeObject();
		}
		_jwriter.closeArray();
		return true;
	}

}
