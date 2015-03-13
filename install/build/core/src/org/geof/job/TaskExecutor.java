package org.geof.job;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import org.geof.log.Logger;

public class TaskExecutor {

	private static Executor _executor = null;
	private static boolean _initialized = false;
	private static final int THREAD_COUNT = 5;
	
	public static void initialize() {
		if (_initialized) {
			return;
		}
		_initialized = true;
		_executor = Executors.newFixedThreadPool(THREAD_COUNT);
		Logger.writeInit("*** JobExecutor.initialized ");
	}
	

	public static void execute(GeofTask newJob) {
		_executor.execute(newJob);
	}
	
	
}
