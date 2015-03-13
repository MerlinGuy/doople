package org.geof.db;

import java.util.ArrayList;
import java.util.List;

import org.geof.log.Logger;
import org.geof.prop.GlobalProp;
import org.json.JSONArray;

/**
 * Database Connection Pool Management Object.  This class runs in its own thread as a Singleton object.
 * 
 * @author Jeff Boehmer
 * @comanpay  Ft Collins Research, LLC.
 * @url	www.ftcollinsresearch.org
 *
 */

public class DBConnMgr implements Runnable {

	public static final int ORACLE = 0, POSTGRESQL = 1;
	public static String[] CONN_NAMES = { "ConnectionOra", "ConnectionPG" };

	private static int _DatabaseType = POSTGRESQL;
	
	public static final String MIN_CONNECTIONS = "min_db_connections";
	public static final String MAX_CONNECTIONS = "max_db_connections";
	

	private static String _connStr = null;
	private static String _uid = "";
	private static String _pwd = "";

//	private int _connectCount = 0;
	private int _minConnects = 1;
	private int _maxConnects = 25;

	private boolean _poolLocked = false;
	private int _index = 0;

	private ArrayList<DBConnection> _idlePool = new ArrayList<DBConnection>();
	private ArrayList<DBConnection> _queryPool = new ArrayList<DBConnection>();
	private ArrayList<DBConnection> _allPool = new ArrayList<DBConnection>();

	private static DBConnMgr _instance = null;

	private int _checkTimeout =   30000; // Check each 30 seconds.
	private int _maxIdleTime  =  300000; // Maximum time idle time is 5 minutes.
	private int _maxQueryTime = 1200000; // Don't let a query run more than 20 minutes.
	private int _maxCreateAttempts = 100;
	private int _failedCreateAttempts = 100;
	
	private static Thread _thread = null;
	private boolean _alive = false;

	private DBConnMgr() {
	}

	/**
	 * Returns the singleton instance of DB Connection Pool
	 * 
	 * @return  The Singleton instance of the DBConnMgr
	 */
	public static DBConnMgr get() {
		if (_instance == null) {
			_instance = new DBConnMgr();
			_instance.initialize();
			_thread = new Thread(_instance);
			_thread.setName("DBConnMgr");
			_thread.start();
		}
		return _instance;
	}

	/**
	 * Initializes the Class and creates request initial database connection.
	 * @return  True if initialization succeeds, false if an error occurs
	 */
	private void initialize() {
		GlobalProp gprops = GlobalProp.instance();
		// _DatabaseType = 0;// DataSource.DatabaseType;
		
		_connStr = gprops.get("connstr");
		_uid = gprops.get("uid");
		_pwd = gprops.get("pwd");
		
		_maxConnects = gprops.getInt(MAX_CONNECTIONS, _maxConnects);
		_minConnects = gprops.getInt(MIN_CONNECTIONS, _minConnects);
		checkPools();		
	}

	private synchronized void checkPools() {
		if (_poolLocked) {
			return;
		}
		try {
//			Logger.verbose("checkPools locking");
			_poolLocked = true;
			// check for long running transactions
			List<DBConnection> killList = new ArrayList<DBConnection>();
			for (DBConnection conn2 : _queryPool) {
				if (conn2.getQueryTime() > _maxQueryTime) {
//					Logger.verbose("Killing long running dbconn: " + conn2.getID());
					killList.add(conn2);
				}
			}
			
			while (killList.size() > 0) {
				close(killList.remove(0));
			}
//			Logger.verbose("checkPools killList complete");

			// Remove idle connections
			if (_allPool.size() > _minConnects) {
				for (DBConnection conn : _idlePool) { 
					if (conn.getIdleTime() > _maxIdleTime) {
						killList.add(conn);
						_allPool.remove(conn);
					}
					if (_allPool.size() <= _minConnects) {
						break;
					}
				}
			}
			while (killList.size() > 0) {
				close(killList.remove(0));
			}
			
//			Logger.verbose("checkPools Remove idle complete");

			// Fill pool if necessary
			while ( _allPool.size() < _minConnects && (! failExceeded()) ) {
				createConnection(false);
			}
//			Logger.verbose("checkPools Fill pool complete");
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			_poolLocked = false;	
//			Logger.verbose("... checkPools unlocked");
		}
	}
	
	public static DBConnection getConnection() {
		return DBConnMgr.get().getDBConnection();
	}

	public static void release(DBConnection conn) {
		DBConnMgr.get().releaseConnection(conn);
	}

	/**
	 * Creates a new connection to the Database, adds the connection to the Pool
	 * @param InService  Defines whether or not the connection should be immediately placed in the IsUse queue
	 * @return  The new DBConnecion object
	 */
	private synchronized DBConnection getDBConnection() {
		try {
			if (_poolLocked) {
				Logger.debug("DBConnMgr.getConnection() _poolLocked");
				return null;
			}

			DBConnection conn = null;
			int idleSize = _idlePool.size();
			if (idleSize > 0) {
				conn = _idlePool.remove(idleSize-1);
				_queryPool.add(conn);
				conn.setStatus(DBConnection.INUSE);
			} 
			else if (_failedCreateAttempts > _maxCreateAttempts) {
				Logger.error("DBConnMgr.getConnection() maxCreateAttempts reached: " + _failedCreateAttempts);
			}
			else if (_allPool.size() < _maxConnects) {
				conn = createConnection(true);				
			} 
			else {
				Logger.error("DBConnMgr.getConnection() maximum connections reached: " + _maxConnects);
			}
//			Logger.verbose("getDBConnection: " + conn.getID());
			return conn;
		} catch (Exception e) {
			Logger.error("DBConnMgr.getConnection ");
			Logger.error( e);
			return null;
		}
	}

	/**
	 * Creates a new DBConnection object and places it in the Pool
	 * @return The new connection object
	 */
	private synchronized DBConnection createConnection(boolean inUse) {
		if (failExceeded()) {
			return null;
		}
		try {
			Class<?> c = Class.forName("org.geof.db." + CONN_NAMES[_DatabaseType]);
			DBConnection conn = (DBConnection) c.newInstance();
			conn.setId( _index++);
			if (conn.connect(_connStr, _uid, _pwd)) {
				_allPool.add(conn);
				if (inUse) {
					_queryPool.add(conn);
					conn.setStatus(DBConnection.INUSE);
				} else {
					_idlePool.add(conn);
					conn.setStatus(DBConnection.IDLE);
				}
				return conn;
			} else {
				Logger.error("Database conn.connect failed");
				Logger.error("_connStr " + _connStr);
				Logger.error("_uid " + _uid);
				Logger.error("_pwd " + _pwd);
			}

		} catch (Exception e) {
			Logger.error("DBConnMgr.createConnection");
			Logger.error(e);
		}
		_failedCreateAttempts++;
		return null;
	}

	/**
	 * Releases the connection back into the available pool for reuse.  
	 * Also closes all open queries, statement, or resultsets
	 * @param DBConnection to be release and placed in the Available list
	 */
	public synchronized void releaseConnection(DBConnection conn) {
		if (conn != null) {
			conn.setSession(null);
			if (_queryPool.contains(conn)) {
				conn.closeAll();
				_queryPool.remove(conn);
				conn.setStatus(DBConnection.IDLE);
				_idlePool.add(conn);
			}
		}
	}

	/**
	 * Closes the DBConnection and removes it from the Pool
	 * @param DBConnection object to close and remove from Pool
	 */
	public synchronized void close(DBConnection conn) {
		if (conn != null) {
			if (_queryPool.contains(conn)) {
				_queryPool.remove(conn);
			}
			if (_idlePool.contains(conn)) {
				_idlePool.remove(conn);
			}
			_allPool.remove(conn);
			//Logger.verbose("Killing Connection - id=" + conn.getID());
			conn.disconnect();
			conn = null;
		}
	}

	/**
	 * Closes the DBConnection and removes it from the Pool by using the connection's ID and doing
	 * a lookup in the Pool list.
	 * @param ID of the DBConnection object to close.
	 */
	public synchronized void close(int id) {
		for ( DBConnection conn : _allPool ) {
			if (id == conn.getID()) {
				close(conn);
				return;
			}
		}
	}

	/**
	 * Calls closeAll to close connections and then sets them to null. Once dispose is called
	 * the class is unusable.
	 */
	public void dispose() {
		closeAll();
		_queryPool = null;
		_idlePool = null;
		_instance = null;
	}

	/**
	 * Closes all connections, removes all connection from the Pool 
	 * and disposes of the Singleton instance object.  This method is primary used
	 * for housekeeping and is called before the Servlet is shutdown.
	 */
	public static void shutdown() {
		if (_instance != null) {
			_instance.closeAll();
			_instance.dispose();
		}
	}

	/**
	 * closesAll Connections and removes them from the pool.
	 * 
	 */
	public void closeAll() {
		for (DBConnection conn : _allPool) {
			conn.disconnect();
		}
		_queryPool.clear();
		_queryPool.clear();
		_idlePool.clear();
	}

	/**
	 * Returns the status of the Connection Pool as a string
	 * @return String field with Connection information as a list of Name/Value pairs
	 */
	public String getStatusText() {
		return "Limit: " + getLimit() + "  Count: " + size() + "  Available: " + getAvailable()
				+ "  In Use: " + getInUse();
	}

	/**
	 * @return  The maximum number of Database connection that the Pool with hold.
	 */
	public int getLimit() {
		return _maxConnects;
	}

	/**
	 * Resets the pool connection limit. If size is less that current limit the method will
	 * attempt to lower the number of by removing connections from the Available queue.
	 * 
	 * @param size The request Pool Limit size (no guarranted to match this number);
	 * @return Returns the final Connection Limit size;
	 */
	public int setLimit(int size) {
		_poolLocked = true;
		try {
			size = (size < 1) ? 1 : size;
			if (size >= _maxConnects) {
				_maxConnects = size;
			} else {
				int dropCount = _maxConnects - size;
				if (dropCount > getAvailable()) {
					dropCount = getAvailable();
				}
				DBConnection conn;
				for (int I = 0; I < dropCount; I++) {
					conn = _idlePool.remove(_idlePool.size() - 1);
					conn.closeAll();
					conn.disconnect();
				}
				_maxConnects -= dropCount;
			}
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			_poolLocked = false;
		}
		return _maxConnects;
	}

	/**
	 * 
	 * @return  The current number of Database connections currently active.
	 */
	public int size() {
		return _allPool.size();
	}

	/**
	 * 
	 * @return  The current number of Database connections currently not currently in use.
	 */
	public int getAvailable() {
		return _idlePool.size();
	}

	public boolean failExceeded() {
		return _failedCreateAttempts > _maxCreateAttempts;
	}
	/**
	 * 
	 * @return  The current number of Database connections currently in use and checked out of the pool.
	 */
	public int getInUse() {
		return _queryPool.size();
	}

	/**
	 * Finalize method for cleaning up the Connection Pool after shutdown
	 */
	public void finalize() {
		dispose();
	}

	/**
	 * 
	 * @return  JSONArray of strings that hold each connection object's status and information
	 */
	public JSONArray getPoolAsJSON() {
		JSONArray array = new JSONArray();
		for (DBConnection conn : _allPool) {
			array.put(conn.toJSON());
		}
		return array;
	}

	@Override
	public void run() {
		Logger.writeInit("*** Started - DBConnManager - *** ");

		_alive = true;		
		while (_alive) {
			if (! _poolLocked) {
				checkPools();
			}
			try {
				Thread.sleep(_checkTimeout);
			} catch (InterruptedException e) {
			}
		}
	}

}
