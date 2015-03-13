package org.geof.job;

import java.util.concurrent.ThreadPoolExecutor;
import org.geof.log.Logger;

public class GeofMonitorThread implements Runnable {

    ThreadPoolExecutor executor;
    public static final int DEFAULT_SLEEP = 3000;
    int sleeptime = 0;
    
    public GeofMonitorThread(ThreadPoolExecutor executor) {
        this(executor, GeofMonitorThread.DEFAULT_SLEEP);
    }
 
    public GeofMonitorThread(ThreadPoolExecutor executor, int sleepMillisecs) {
        this.executor = executor;
        sleeptime = sleepMillisecs;
    }
 
    @Override
    public void run() {
        try {
            do {
                System.out.println(
                    String.format("[monitor] [%d/%d] Active: %d, Completed: %d, Task: %d, isShutdown: %s, isTerminated: %s",
                        this.executor.getPoolSize(),
                        this.executor.getCorePoolSize(),
                        this.executor.getActiveCount(),
                        this.executor.getCompletedTaskCount(),
                        this.executor.getTaskCount(),
                        this.executor.isShutdown(),
                        this.executor.isTerminated()));
                Thread.sleep(sleeptime);
            }
            while (true);
        }
        catch (Exception e) {
        	Logger.error(e);
        }
    }
}