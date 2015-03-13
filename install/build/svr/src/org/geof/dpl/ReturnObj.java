package org.geof.dpl;

public class ReturnObj {
	public boolean success = false;
	public String error = null;
	public String text = null;
	public int exit_code = -1;
	
	public ReturnObj(boolean success, String error, String text, int exit_code) {
		this.success = success;
		this.error = error;
		this.text = text;
		this.exit_code = exit_code;
	}
	
	public ReturnObj(boolean success) {
		this.success = success;
	}

	public ReturnObj(boolean success, String error) {
		this.success = success;
		this.error = error;
	}

	public ReturnObj(String error, int exit_code) {
		this.error = error;
		this.exit_code = exit_code;
	}
	
	public static ReturnObj getOkay() {
		return new ReturnObj(true);
	}
	public static ReturnObj getError(String error) {
		return new ReturnObj(false, error);
	}
}
