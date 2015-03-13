package org.geof.job;


public abstract class GeofTask implements Runnable {

	protected String _error = null;
	
	//--------------------------------------
	
	@Override
	public void run() {
		doTask();
	}
	
	public abstract void doTask();
	public abstract void handleCancellation();

	
	public void setError(String  error) {
		_error = error;
	}
	
	public String getError() {
		return _error;
	}
	
}
