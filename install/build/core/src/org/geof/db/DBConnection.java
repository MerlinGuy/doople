package org.geof.db;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;

import org.geof.db.DBConnMgr;
import org.geof.log.Logger;
import org.geof.service.GSession;
import org.geof.util.DateUtil;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * DBConnection is a abstract wrapper class for generic database connections which can be
 * pooled by DBConnMgr
 * 
 * @see DBConnMgr
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public abstract class DBConnection {

	protected static final int UPDATE = 1, EXECUTE = 2;
	protected static final int IDLE = 0, INUSE = 1;
	protected static final String[] STATUSNAMES = { "Idle", "In Use", "UNKNOWN" };

	protected boolean _debug = true;
	protected Connection _conn = null;
	protected boolean _driverLoaded = false;
	protected boolean _autoCommit = true;

	private Timestamp _tsInUse = null;
	private Timestamp _tsInPool = null;
	private Timestamp _tsCreated = null;
	
	private int _status = IDLE;
	private int _id = -1;
	private GSession _session = null;

	protected String _connstr = "";
	protected String _uid = "";
	protected String _pwd = "";

	protected boolean _qryBool = false;
	protected int _qryInt = -1;
	protected String _errMsg = null;

	protected HashMap<ResultSet, Statement> _mapStatements = new HashMap<ResultSet, Statement>();
	protected ArrayList<Statement> _Statements = new ArrayList<Statement>();

	/**
	 * This is the default method for connecting to the database.
	 * 
	 * @param connstr Standard JDBC connection string ex.
	 * <CODE>jdbc:postgresql://localhost/geof</CODE>
	 * @param uid Database login user id
	 * @param pwd Database login password
	 * @return Returns true if connection established, false if connection failed.
	 */
	public abstract boolean connect(String connstr, String uid, String pwd);

	/**
	 * This method sets the Connection Pool information so that a object can place itself back
	 * into the pool when it is no longer needed
	 * 
	 * @param pool Point to the DBConnMger Object
	 * @param id System based id for this connection object.
	 */
	public void setId(int id) {
		_id = id;
		_tsCreated = DateUtil.getTimestamp(null);
	}

	/**
	 * Sets the status of the Connection Object which can be either Active or Inactive.
	 * 
	 * @param status Is Active if the connection is in use or Inactive if returned to the
	 * Connection Pool
	 * @param timestamp Timestamp marking the time when the state changed. Used for tracking
	 * how long a connection is active or inactive.
	 */
	public void setStatus( int status ) {
		_status = status;
		Timestamp timestamp = DateUtil.getTimestamp(null);
		if (_status == IDLE) {
			_tsInUse = null;
			_tsInPool = timestamp;
		} else if (_status == INUSE) {
			_tsInPool = null;
			_tsInUse = timestamp;
		}
	}

	/**
	 * 
	 * @return The current status of the Connection Object
	 */
	public int getStatus() {
		return _status;
	}

	/**
	 * 
	 * @return The amount of time the Connection Object has been use.
	 */
	public Timestamp getInUseTS() {
		return _tsInUse;
	}

	/**
	 * 
	 * @return The amount of time the Connection Object has been inactive.
	 */
	public Timestamp getInPoolTS() {
		return _tsInPool;
	}

	/**
	 * Helper class to display the time the connection has been inactive
	 * 
	 * @return Time in milliseconds that the connection has be inactive
	 */
	public long getIdleTime() {
		return (_tsInPool == null) ? 0 : (new Date()).getTime() - _tsInPool.getTime();
	}

	/**
	 * Helper class to display te time the connection has been active
	 * 
	 * @return Tme in milliseconds that the connection has been active.
	 */
	public long getQueryTime() {
		return (_tsInUse == null) ? 0 : (new Date()).getTime() - _tsInUse.getTime();
	}

	/**
	 * 
	 * @return Time the connection to the database was first established.
	 */
	public Timestamp getCreatedTS() {
		return _tsCreated;
	}

	/**
	 * Helper class to display the length of time the database connection has been in use
	 * 
	 * @return Time in milliseconds that the database connection has been connected.
	 */
	public long getLifeTime() {
		return (new Date()).getTime() - _tsCreated.getTime();
	}

	/**
	 * 
	 * @return The system based unique ID for the connection object.
	 */
	public int getID() {
		return _id;
	}

	/**
	 * Sets the autoCommit field of the underlying JDBC Connection object. Also does an
	 * immediate commit if there are waiting transactions.
	 * 
	 * @param autoCommit True if connection object should autoCommit, otherwise false
	 * @return True if setting the underlying connection object's autoCommit field was
	 * successful, otherwise false if it failed.
	 */
	public boolean setAutoCommit(boolean autoCommit) {
		_autoCommit = autoCommit;
		if (_conn != null) {
			try {
				_conn.setAutoCommit(_autoCommit);
				_conn.commit();
				return true;
			} catch (Exception e) {
				Logger.error("setAutoCommit: " + e.getMessage());
				return false;
			}
		} else {
			return false;
		}
	}

	/**
	 * Set the underlying JDBC connection object's autoCommit to false
	 * 
	 * @return True if no error occured.
	 */
	public boolean beginTransaction() {
		if (_conn == null)
			return false;
		try {
			setAutoCommit(false);
			// _savePoint = _conn.setSavepoint();
			return true;
		} catch (Exception e) {
			Logger.error("beginTransaction(): " + e.getMessage());
			return false;
		}
	}

	/**
	 * Exposes the underlying JDBC Connection object's rollback() function
	 * 
	 * @return True if no error occurs.
	 */
	public boolean rollback() {
		try {
			if ((_conn == null) || (_autoCommit))
				return false;

			_conn.rollback();
			// _savePoint = null;
			return true;
		} catch (Exception e) {
			Logger.error("rollback(): " + e.getMessage());
			return false;
		}
	}

	/**
	 * Executes an immediate commit on the underlying JDBC Connection object
	 */
	public void commit() {
		try {
			if (_conn != null) {
				_conn.commit();
				// _savePoint = null;
			}
		} catch (Exception e) {
			Logger.error("commit(): " + e.getMessage());
		}
	}

	/**
	 * Returns the underlying JDBC connection object
	 * 
	 * @return The underlying JDBC Connection Object
	 */
	public Connection getBaseConnection() {
		return _conn;
	}

	/**
	 * 
	 * @return The status of the AutoCommit variable
	 */
	public boolean getAutoCommit() {
		return _autoCommit;
	}

	/**
	 * Executes a query against the connected databse
	 * 
	 * @param qry SQL query string to execute
	 * @param executeType Selects whether the execute command returns affected count or not.
	 * @return True if the query was executed successfully, false if an error occurred
	 */
	public boolean execute(String qry, int executeType) {
		_errMsg = null;
		_qryBool = false;
		_qryInt = -1;
		boolean rtn = false;
		Statement stmt = null;

		try {
			stmt = _conn.createStatement();
			if (executeType == UPDATE) {
				_qryInt = stmt.executeUpdate(qry);
			} else if (executeType == EXECUTE) {
				stmt.execute(qry);
				_qryBool = true;
			} else {
				return rtn;
			}
			if (!_conn.getAutoCommit()) {
				_conn.commit();
			}
			rtn = true;
		} catch (SQLException e) {
			_errMsg = e.getMessage() + " qry = " + qry;
			Logger.error("DBConnection.execute: " + _errMsg);
		} finally {
			this.closeStatement(stmt);

		}
		return rtn;
	}

	/**
	 * Helper method for executing a SQL query against the database. Return no affected count
	 * information
	 * 
	 * @param sql The SQL string to exeucte
	 * @return True if the query executed successfully, false if an error occured
	 */
	public boolean executeQuery(String sql) {
		return execute(sql, EXECUTE);
	}

	/**
	 * Helper method for executing a SQL query against the database. This does return affected
	 * count information.
	 * 
	 * @param sql The SQL string to exeucte
	 * @return True if the query executed successfully, false if an error occured
	 */
	public int executeUpdate(String sql) {
		execute(sql, UPDATE);
		return _qryInt;
	}

	/**
	 * Method executes a Select SQL query and returns a ResultSet.
	 * 
	 * @param sql SQL Select string query
	 * @return ResultSet results of the select statement
	 */
	public ResultSet getResultset(String sql) {
		return getResultset(sql, -1);
	}

	/**
	 * Executes an Update on the database and returns the results in a ResultSet object
	 * 
	 * @param sql Update SQL string to execute on the Database.
	 * @return ResultSet returned when the SQL statement was executed on the Database
	 */
	public ResultSet getResultsetUpd(String sql) {
		return getResultsetUpd(sql, -1);
	}

	/**
	 * Executes a SQL Select Query against the Databse but limits the resulting number of
	 * return records.
	 * 
	 * @param sql SQL Select string query
	 * @param maxRows Maximum number of rows to return in the ResultSet
	 * @return ResultSet return when the query was executed.
	 */
	public ResultSet getResultset(String sql, int maxRows) {
		_errMsg = null;
		try {
			Statement stmt = _conn.createStatement();
			if (maxRows != -1) {
				stmt.setMaxRows(maxRows);
			}
			ResultSet rs = stmt.executeQuery(sql);
			_mapStatements.put(rs, stmt);
			return rs;
		} catch (SQLException sqle) {
			_errMsg = sqle.getMessage() + " sql = " + sql;
			Logger.error("ConnectionOra.execute: " + _errMsg);
			return null;
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	/**
	 * Executes a SQL Update Query against the Databse but limits the resulting number of
	 * return records.
	 * 
	 * @param sql SQL Select string query
	 * @param maxRows Maximum number of rows to return in the ResultSet
	 * @return ResultSet return when the query was executed.
	 */
	public ResultSet getResultsetUpd(String sql, int maxRows) {
		_errMsg = null;
		try {
			Statement stmt = _conn.createStatement(ResultSet.TYPE_SCROLL_SENSITIVE, ResultSet.CONCUR_UPDATABLE);
			if (maxRows != -1) {
				stmt.setMaxRows(maxRows);
			}
			ResultSet rs = stmt.executeQuery(sql);
			_mapStatements.put(rs, stmt);
			return rs;
		} catch (SQLException e) {
			_errMsg = e.getMessage() + " sql = " + sql;
			Logger.error("ConnectionOra.execute: " + _errMsg);
			return null;
		}
	}

	/**
	 * Method returns a prepared statement
	 * 
	 * @param sql SQL query string
	 * @return Prepared Statement object if successful, null if an error occurs
	 */
	public PreparedStatement getPreparedStatement(String sql) {
		try {			
			PreparedStatement ops = _conn.prepareStatement(sql);
			_Statements.add(ops);
			return ops;
		} catch (Exception e) {
			Logger.error("BaseConnection.getStatement: " + e.getMessage() + ", sql = " + sql);
			return null;
		}
	}

	/**
	 * Wrapper class that surrounds the JDBC createStatement() Method used to consume any
	 * Exceptions that occur
	 * 
	 * @return Statement if underlying createStatement is successful, null if an error occurs.
	 */
	public Statement getStatement() {
		try {
			Statement stat = _conn.createStatement();
			_Statements.add(stat);
			return stat;
		} catch (Exception e) {
			Logger.error("BaseConnection.getStatement: " + e);
			return null;
		}
	}

	/**
	 * Method closes the passed in statement object and removes it from the open statement
	 * list
	 * 
	 * @param stat Statement object to close
	 */
	public void closeStatement(Statement stat) {
		if (stat == null){
			return;
		}
		try {
			if (_Statements.contains(stat)) {
				_Statements.remove(stat);
			}
			stat.close();
//			Logger.verbose("Closed Statement for conn: " + this._id);
		} catch (Exception e) {
			Logger.error("BaseConnection.closeStatement: " + e.getMessage());
		}
	}

	/**
	 * Closes all open statements
	 */
	public void closeAllStatements() {
		while (_Statements.size() > 0) {
			Statement stmt = _Statements.get(0);
			if (stmt != null) {
				closeStatement(stmt);
			}
		}
	}

	/**
	 * Method closes the passed in ResultSet and its associated open Statement object
	 * 
	 * @param rs ResultSet object to close
	 */
	public void closeResultset(ResultSet rs) {
		if (rs == null) {
			return;
		}
		if (_mapStatements.containsKey(rs)) {
			Statement stmt = _mapStatements.remove(rs);
			try {
				if (stmt != null) {
					stmt.close();
					stmt = null;
				}
			} catch (Exception e1) {
				Logger.error("closeResultset: " + e1.getMessage());
			}
		}
		try {
			rs.close();
		} catch (Exception e2) {
			Logger.error("closeResultset: " + e2.getMessage());
		}
		rs = null;
	}

	/**
	 * Closes all open query objects
	 */
	public void closeAll() {
		try {
			for (ResultSet rs : _mapStatements.keySet()) {
				closeResultset(rs);
			}
			closeAllStatements();
		} catch (Exception e) {}
	}

	/**
	 * Closes all the open queries used by the connection but does not return the connection to the
	 * Connection Pool
	 * @return True if disconnect is successful, false if an error occurred.
	 */
	public boolean disconnect() {
		try {
			if (_conn != null) {
				closeAll();
				_conn.close();
				_conn = null;
			}
			return true;
		} catch (Exception e) {
			Logger.debug("disconnect(): " + e.getMessage());
			return false;
		} finally {
			try {
				_conn.close();
			} catch (Exception e) {}
		}
	}

	/**
	 * Converts a SQL date to a String representation of that date
	 * 
	 * @param date Date to convert to String
	 * @return Returns date as string if successful, null if error occurs
	 */
	abstract public String to_Date(java.sql.Date date);

	/**
	 * Converts a Java Util date to a String representation of that date
	 * 
	 * @param date Date to convert to String
	 * @return Returns date as string if successful, null if error occurs
	 */
	abstract public String to_date(java.util.Date date);

	/**
	 * Returns the current Error Status and resets Error to null
	 * @return  Current Error Status
	 */
	public String getErrMsg() {
		String rtn = _errMsg;
		_errMsg = null;
		return rtn;
	}

	/**
	 * Returns the unique ID of the Session currently using this DB connection object
	 * @return  Current ID of the Session using this connection
	 */
	public String getSessionID() {
		return _session.getSessionID();
	}

	/**
	 * Sets the connection's current Session
	 * @param session  Session Object 
	 */
	public void setSession(GSession session) {
		_session = session;
	}

	/**
	 * 
	 * @return  Current Session using this database connection
	 */
	public GSession getSession() {
		return _session;
	}

	/**
	 * 
	 * @return  Usr ID of session currently using this database connection
	 */
	public long getUsrID() {
		return _session == null ? -1 : _session.getUsrID();
	}

	/**
	 * 
	 * @return  java.sql.DatabaseMetaData of the underlying JDBC connection Object
	 */
	public DatabaseMetaData getMetaData() {
		DatabaseMetaData mdm = null;

		try {
			mdm = _conn.getMetaData();
		} catch (SQLException e) {
			Logger.error(e);
		}
		return mdm;
	}

	/**
	 * Serializes the connection object to a JSON formatted string
	 * @return Returns the object serialzied as a JSON string
	 */
	public JSONObject toJSON() {
		try {
			int status = (_status >= 0 && _status <= 1) ? _status : 2;
			JSONObject json = new JSONObject();
			if (_tsInUse != null) {
				json.put("querytime", DateUtil.getTimespan(getQueryTime()));
			}
			if (_tsInPool != null) {
				json.put("idletime",  DateUtil.getTimespan(getIdleTime()));
			}
			json.put("lifetime",  DateUtil.getTimespan(getLifeTime()));
			json.put("connected", _tsCreated.toString());
			json.put("statusname", STATUSNAMES[status]);
			json.put("status", status);
			json.put("id", _id);
			json.put("sessionid", (_session == null) ? -1 : _session.getSessionID());
			json.put("connstr", _connstr);
			return json;
		} catch (JSONException e) {
			Logger.error(e);
			return null;
		}
	}


}
