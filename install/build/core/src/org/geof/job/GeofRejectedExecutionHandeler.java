package org.geof.job;

import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;

public class GeofRejectedExecutionHandeler implements RejectedExecutionHandler {

	@Override
	public void rejectedExecution(Runnable geofjob, ThreadPoolExecutor executor) {
		((GeofTask)geofjob).handleCancellation();
	}

}
