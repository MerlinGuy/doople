package org.geof.request;

import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Derived ABaseRequest class used for managing the EntityMap objects and their
 * configurations. The TableRequest object provides methods for keeping EntityMap objects up
 * to date the database tables they are mapped to. This includes features such as which fields
 * are default (returned by all queries), which are required, etc.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class EntityRequest extends DBRequest {

	public final static String ENTITYNAME = "entity";

	public static final int UNSET = -1, MISSING = 0, OKAY = 1, DIFFERENT = 2, DROPPED = 3, NOT_TABLE = 4, ERROR = 5;
	public static final boolean USE_RETURNING = true;
	public static final boolean NO_RETURNING = true;
	private static final String _sqlTables = "SELECT table_name, table_schema FROM information_schema.tables WHERE" 
			+ " ((table_schema NOT IN ('pg_catalog', 'information_schema'))"
			+ " AND (table_name NOT IN (SELECT tablename from entityignore)))" 
			+ " ORDER BY table_name";

	private static final String _sqlEntityIdByName = "SELECT id FROM entity WHERE name = ?";
	private static final String _sqlDelEntity = "DELETE FROM entity WHERE id = ?";
	private static final String _sqlDelEntityField = "DELETE FROM entityfield WHERE entityid = ?";

	private static String ENTITYLIST = "id,name,indatabase";
	private static String ENTITYFIELDLIST = "entityid,fieldname,isdefault,ispkey,datatype,isrequired,isauto";


	/**
	 * Overrides the base class process() to provide EntityMap specific action handlers.
	 * 
	 * @return True if action was processed
	 */
	@Override
	public boolean process() {
		boolean rtn = false;
		if (_actionKey.equalsIgnoreCase(READ)) {
			if (_data.has(JOIN)) {
				return super.read();
			} else {
				return read();
			}
			
		} else if (_actionKey.equalsIgnoreCase(CREATE)) {
			if (rtn = create()) {
				EntityMapMgr.initialize(_dbi);
			}	
			
		} else if (_actionKey.equalsIgnoreCase(DELETE)) {
			rtn = delete();
			
		} else if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return update();
			
		} else if (_actionKey.equalsIgnoreCase(UPDATE + ".fix")) {
			return fixEntities(); 
		}
		return rtn;
	}

	/**
	 * Reads all the EntityMap table information from both the Postgresql table catalog and
	 * the Entity table along with a comparison of the two.
	 * 
	 * @return True if the method succeeds, false if an error occurs.
	 */
	protected boolean read() {
		boolean rtn = false;
		try {
			HashMap<String, Entity> tables = getTableList(MISSING);
			_data.put(COLUMNS, ENTITYLIST);
			ResultSet rs = _dbi.readRecords(_entitymap, _data);
			String name;
			int indatabase;
			long id;
			
			_jwriter.openArray(DATA);
			while (rs.next()) {
				_jwriter.openObject();
				id = rs.getLong("id");
				_jwriter.writePair("id", id);
				name = rs.getString("name");
				_jwriter.writePair("name", name);
				indatabase = rs.getInt("indatabase");
				_jwriter.writePair("indatabase", indatabase);
				if (tables.containsKey(name)) {
					_jwriter.writePair("status", compare(tables.get(name), id));
				} else {
					_jwriter.writePair("status", (indatabase == 1 ? DROPPED : NOT_TABLE));
				}
				_jwriter.closeObject();
			}
			_jwriter.closeArray();

			rtn = true;
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}

	/**
	 * Returns the primary key of the name in the Entity database table.
	 * 
	 * @param name Table name to lookup in the Entity table
	 * @return Returns the primary key of the Entity.
	 */
	private long getEntityId(String name) {
		PreparedStatement ps = null;
		try {
			ps = _dbi.getPreparedStatement(_sqlEntityIdByName);
			ps.setString(1, name);
			ResultSet rs = ps.executeQuery();
			if (rs == null) {
				return -1;
			}
			if (rs.next()) {
				return rs.getLong(1);
			} else {
				return -1;
			}

		} catch (Exception e) {
			setError(e);
			return -1;
		} finally {
			if (ps != null) {
				try { ps.close();} catch (Exception dbe){}
			}
		}
	}

	/**
	 * Creates a new record in the Entity table.
	 * 
	 * @return True if the method succeeds, false if an error occurs.
	 */
	public boolean create() {
		try {
			JSONObject flds = _data.getJSONObject("fields");
			if (!flds.has("name")) {
				setError("Missing field name");
				return false;
			}
			String name = flds.getString("name");
			boolean indatabase = true;
			if (flds.has("indatabase")) {
				indatabase = flds.getInt("indatabase") == 1;
			}
			long id = getEntityId( name );
			Entity entity = new Entity(name, id, indatabase);
			if (id == -1) {
				if (! createEntity(entity, indatabase)) {
					return false;
				}
			}
			return createEntityFields(entity);
		} catch (Exception e) {
			setError("Error: create Entity");
			return false;
		}
	}

	/**
	 * Deletes a record from the Entity table using the entityid field in the _data object
	 * 
	 * @return True if the method succeeds, false if an error occurs.
	 */
	protected boolean delete() {
		try {
			JSONObject where = _data.getJSONObject("where");
			if (!where.has("id")) {
				setError("Missing field id");
				return false;
			}
			long id = where.getLong("id");
			if (!deleteEntity(id)) {
				return false;
			}
			return true;
		} catch (Exception e) {
			setError("Error: delete Entity");
			return false;
		}
	}

	/**
	 * Deletes a record from the Entity table using the passed in primary key.
	 * 
	 * @param entityid Primary key of the Entity to delete
	 * @return True if the method succeeds, false if an error occurs.
	 */
	private boolean deleteEntity(long id) {
		PreparedStatement ps = null;
		try {
			deleteFields(id);
			ps = _dbi.getPreparedStatement(_sqlDelEntity);
			ps.setLong(1, id);
			return ps.execute();
		} catch (Exception e) {
			setError("deleteEntity failed for " + id);
			return false;
		} finally {
			if (ps != null) {
				try { ps.close();} catch (Exception dbe){}
			}
		}
	}

	/**
	 * Deletes all the records from the entityfield table for the parent Entity.
	 * 
	 * @param entityid Parent Entity's primary key
	 * @return True if the method succeeds, false if an error occurs.
	 */
	private boolean deleteFields(long entityid) {
		PreparedStatement ps = null;
		try {
			ps = _dbi.getPreparedStatement(_sqlDelEntityField);
			ps.setLong(1, entityid);
			ps.execute();
			return true;
		} catch (Exception e) {
			setError("deleteFields failed for " + entityid);
			return false;
		} finally {
			if (ps != null) {
				try { ps.close();} catch (Exception dbe){}
			}

		}
	}

	/**
	 * Updates the EntityField table with new column data
	 * 
	 * @return True if the method succeeds, false if an error occurs.
	 */
	protected boolean update() {
		boolean rtn = false;
		try {
			if (!_data.has("fields")) {
				setError("data missing fields element");
				return false;
			}
			JSONObject flds = _data.getJSONObject("fields");
			if (!flds.has("id")) {
				setError("Missing field id");
				return false;
			}
			if (!flds.has("name")) {
				setError("Missing field name");
				return false;
			}
			long entityid = flds.getLong("id");
			
			boolean recreate = false;
			if (flds.has("recreate")) {
				recreate = flds.getBoolean("recreate");
			}
			
			String name = flds.getString("name");
			HashMap<String, Entity> tables = getTableList(MISSING);
			Entity entity = null;
			boolean indatabase = tables.containsKey(name);
			
			if (! indatabase ) {
				return true;
			}
			
			entity = tables.get(name);
			EntityMap emap = EntityMapMgr.getEMap(name);
			if (emap == null) {
				if ((entityid == -1) || recreate) {
					return createEntity(entity, indatabase);
				} else {
					setError("Entity: " + name + " does not exist - no recreate for id: " + entityid);
					return false;
				}
			}
			long emap_id = emap.getEntityId();					
			if (emap_id != entityid) {
				setError("Entity Id: " + entityid + " does not match EMap id : " + emap_id);
				return false;
			}
			rtn = alignTable(entity);
			if (rtn) {
				rtn = EntityMapMgr.initialize(_dbi);
			}
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}

	/**
	 * Compares the metadata for a table in the database with the stored information in the
	 * EntityField table.
	 * 
	 * @param entity Name of the table in the database to use for the comparison
	 * @param entityid Primary key of the Entity Object to use for the comparison
	 * @return Returns 1 if same otherwise 2
	 */
	private boolean alignTable(Entity entity) {
		try {
			HashMap<String, Column> oldCols = entity.columns;
			HashMap<String, Column> mapCols = entity.buildColumns();
			for (String key : mapCols.keySet()) {
				if (oldCols.containsKey(key)) {
					mapCols.get(key).isDefault = oldCols.get(key).isDefault;
				} 
			}
			
//			deleteFields( entity.id );
			createEntityFields( entity );
			return true;
		} catch (Exception e) {
			setError(e);
			return false;
		}
	}

	private int compare(Entity entity, long entityid) {
		ResultSet rs = null;
		try {
			EntityMap emap = EntityMapMgr.getEMap("entityfield");
			JSONObject data = JsonUtil.getDataWhere("entityid", entityid);
			data.put(COLUMNS, ENTITYFIELDLIST);
			rs = _dbi.readRecords(emap, data);
			if (rs == null) {
				setError("EntityRequest.compare failed to create resultset");
				return ERROR;
			}
			Column column;
			String fieldname;
			ArrayList<String> columnNames = entity.getColumnList();
			// Logger.verbose("tbl --- " + table.Tablename);
			
			int status = UNSET;
			while ((status == UNSET) && rs.next()) {
				fieldname = rs.getString("fieldname");
				columnNames.remove(fieldname);
				if ((status == UNSET) && !entity.columns.containsKey(fieldname)) {
					status = DIFFERENT;
				}
				column = entity.columns.get(fieldname);
				if ((status == UNSET) && column.datatype != rs.getInt("datatype")) {
					status = DIFFERENT;
				}
				if ((status == UNSET) && column.isPkey != rs.getBoolean("ispkey")) {
					status = DIFFERENT;
				}				
				if ((status == UNSET) && column.isRequired != rs.getBoolean("isrequired")) {
					status = DIFFERENT;
				}
				if ((status == UNSET) && column.isAutoIncrement != rs.getBoolean("isauto")) {
					status = DIFFERENT;
				}
			}
			// Logger.verbose("   ***** Remain Column count: " + columnNames.size());
			return (columnNames.size() == 0) ? OKAY : DIFFERENT;
		} catch (Exception e) {
			setError(e);
			return ERROR;
		} finally {
			try {
				rs.close();
			} catch (Exception e1) {}
		}
	}

	/**
	 * Method queries the metadata of a requested table and returns the names of the primary
	 * key fields.
	 * 
	 * @param tablename Table to
	 * @param schema Not used at this time, send in null
	 * @return Returns an ArrayList of fieldnames representing the fields in the table's
	 * primary key
	 */
	private ArrayList<String> getPKeys(String tablename, String schema) {
		try {
			DatabaseMetaData meta = _dbi.getDbMetaData();
			ResultSet rs = meta.getPrimaryKeys(null, "public", tablename);
			ArrayList<String> pkfields = new ArrayList<String>();
			while (rs.next()) {
				pkfields.add(rs.getString(4));
			}
			return pkfields;
		} catch (Exception e) {
			setError("getPKeys: " + e.getMessage());
			return null;
		}
	}

	public boolean fixEntities() {
		boolean rtn = false;
		try {
			HashMap<String, Entity> tables = getTableList(MISSING);
			JSONArray rows = _dbi.readAsJson(_entitymap, null);
			
			for (int indx = 0; indx < rows.length(); indx++) {
				JSONObject row = rows.getJSONObject(indx);
				String name = row.getString("name");
				long id = row.getLong("id");
				
				if ( tables.containsKey(name) ) {
					Entity table = tables.get(name);
					alignTable(table);
					//Check for type conflict and correct.
					if (row.getInt("indatabase") != 1) {
						JSONObject data = JsonUtil.getDataWhere("id", id);
						JSONObject fields = new JSONObject();
						fields.put("indatabase", 1);
						data.put("fields", fields);
						_dbi.update(_entitymap, data);
					}
				} 
			}
			rtn = EntityMapMgr.initialize(_dbi);
		} catch (Exception e) {
			setError(e);
		}
		return rtn;
	}

	/**
	 * Creates a new record in the Entity using information in the Table object
	 * 
	 * @param entity Table object which holds the Entity information.
	 * @return True if the method succeeds, false if an error occurs.
	 */
	private boolean createEntity(Entity entity, boolean inDatabase) {
		String sql = "INSERT INTO entity (name, loadtime, status, inDatabase) VALUES (?,0,1,?) RETURNING id";
		PreparedStatement ps = null;
		ResultSet rs = null;
		try {
			long entityid = getEntityId(entity.name);
			if (entityid > -1) {
				deleteEntity(entityid);
			}
			ps = _dbi.getPreparedStatement(sql);
			ps.setString(1, entity.name);
			ps.setInt(2, inDatabase ? 1 : 0);
			rs = ps.executeQuery();
			if ((rs != null) && (rs.next())) {
				entity.id = rs.getLong("id");
				if (inDatabase) {
					createEntityFields(entity);
					EntityMapMgr.loadMap(entity.name, _dbi);
				}
				rs.close();
			} else {
				setError("createEntity Error: RETURNING record failed for " + entity.name);
			}
			return true;
		} catch (Exception e) {			
			String errormsg = "createEntites: " + e.getMessage() + "/n sql = " + sql + "\nEntityName: " + entity.name + ", id :  " + entity.id;
			setError(errormsg, e);
			return false;
		}
	}

	/**
	 * Inserts a row into the EntityField table for each column in the Table object.
	 * 
	 * @param entity Table object containing the EntityField row information
	 * 
	 * @return True if the method succeeds, false if an error occurs.
	 */
	private boolean createEntityFields(Entity entity) {
		//Logger.verbose("createEntityFields for " + table.Tablename);
		String sql1 = "INSERT INTO EntityField (entityid,fieldname,isdefault,ispkey,datatype,isauto,isrequired) VALUES (?,?,?,?,?,?,?)";

		PreparedStatement ps = null;
		//Logger.verbose("deleting fields for " + table.Tablename);
		deleteFields(entity.id);
		try {
			ps = _dbi.getPreparedStatement(sql1);
			// Logger.verbose("createEntityFields: " + table.Tablename);
			for (Column column : entity.columns.values()) {
				//Logger.verbose("createEntityFields: Col: " + column.name + ", table.EntityId:" + table.EntityId);
				// column.datatype);
				int indx = 1;
				ps.setLong(indx++, entity.id);
//				Logger.debug(entity.name + " : " + column.name);
				ps.setString(indx++, column.name);
				ps.setBoolean(indx++, column.isDefault);
				ps.setBoolean(indx++, column.isPkey);
				ps.setInt(indx++, column.datatype);
				ps.setBoolean(indx++, column.isAutoIncrement);
				ps.setBoolean(indx++, column.isRequired);
				ps.execute();
			}
			return true;
		} catch (Exception e) {
			setError("Error createEntityFields : " + e.getMessage());
			return false;
		} finally {
			if (ps != null) {
				try { ps.close();} catch (Exception dbe){}
			}
		}
	}

	/**
	 * Method retrieves a HashMap of table names from the Postgresql table catalog
	 * 
	 * @param defaultstatus Default status to use for the returned Table objects.
	 * @return Returns HashMap of the tables listed in the Databse table catalog.
	 */
	private HashMap<String, Entity> getTableList(int defaultstatus) {

		HashMap<String, Entity> tables = new HashMap<String, Entity>();
		try {
			ResultSet rs = _dbi.getPreparedStatement(_sqlTables).executeQuery();
			if (rs == null) {
				setError("EntityRequest.getTableList returned no tables");
				return tables;
			}
			String tablename;
			
			while (rs.next()) {
				long entityid = -1;
				tablename = rs.getString("table_name");
				if (EntityMapMgr.hasMap(tablename)) {
					entityid = EntityMapMgr.getEMap(tablename).getEntityId(); 
				}
				Entity tbl = new Entity(tablename, entityid, true);
				tbl.status = defaultstatus;
				tables.put(tablename, tbl);
			}
			rs.close();
			return tables;
		} catch (SQLException e) {
			setError(e);
			return null;
		}
	}

	public Column getColumn(ResultSetMetaData metadata, ArrayList<String> pkeys, int indx) {
		try {
			Column col = new Column();
			col.name = metadata.getColumnName(indx);
			col.isPkey = pkeys.contains(col.name);
			col.datatype = metadata.getColumnType(indx);
			col.isAutoIncrement = metadata.isAutoIncrement(indx);
			col.isRequired = (metadata.isNullable(indx) == 0);
			return col;
		} catch (SQLException e) {
			setError("TableRequest.getColumn Error: "+ e.getMessage());
			return null;
		}
	}


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/**
	 * Class used for holding table column information
	 * 
	 * @author Jeff Boehmer
	 * @comanpay Ft Collins Research, LLC.
	 * @url www.ftcollinsresearch.org
	 */
	class Entity {
		public String name;
		public long id = -1;
		public int status = OKAY;
		public HashMap<String, Column> columns;

		/**
		 * Class Constructor
		 * 
		 * @param name Name of the table in the database
		 * @param entityid Primary key of the Entity Object in the Entity table.
		 */
		public Entity(String name, long id, boolean indatabase) {
			// _entityname = "table";
			this.name = name;
			this.id = id;
			if (indatabase) {
				buildColumns();
			}
		}

		/**
		 * 
		 * @return Returns an ArrayList of the column names for the Table object
		 */
		public ArrayList<String> getColumnList() {
			ArrayList<String> columnNames = new ArrayList<String>();
			columnNames.addAll(columns.keySet());
			return columnNames;
		}

		/**
		 * Queries the table and uses the metadata to build a list of Column objects with
		 * information about each of the table's columns
		 */
		private HashMap<String, Column> buildColumns() {
			this.columns = new HashMap<String, Column>();
			try {
				ArrayList<String> pkeys = getPKeys(this.name, "public");
				ResultSetMetaData metadata = this.getMetaData();
				int colcnt = metadata.getColumnCount();
				Column col;

				for (int indx = 1; indx <= colcnt; indx++) {
					col = getColumn(metadata, pkeys, indx);
					this.columns.put(col.name, col);
				}
			} catch (Exception e) {
				setError("EntityRequest.buildColumns Error for " + this.name + " - " + e.getMessage());
			}
			return columns;
		}
		
		/**
		 * Queries the database for the metadata for a table.
		 * 
		 */
		public ResultSetMetaData getMetaData() {

			ResultSetMetaData metadata = null;
			ResultSet rs = null; 
			try {
				String sql = "SELECT * FROM " + this.name;
				rs = _dbi.getPreparedStatement(sql).executeQuery();
				metadata = rs.getMetaData();
				rs.close();
			} catch (Exception e) {
				setError("EntityRequest.buildColumns Error for " + name);
			} finally {
			}
			return metadata;
		}

	}

	/**
	 * Class used to hold column information for the Table Object
	 * 
	 * @author Jeff Boehmer
	 * @comanpay Ft Collins Research, LLC.
	 * @url www.ftcollinsresearch.org
	 * 
	 */
	public class Column {
		public String name;
		public boolean isPkey;
		public int datatype;
		public boolean isAutoIncrement;
		public boolean isRequired;
		public boolean isDefault = true;

		/**
		 * Class Constructor
		 */
		public Column() {
		}

		/**
		 * Serializes a Column object into a JSONObject
		 * @return Returns a JSONObject with specific column information added.
		 */
		public JSONObject toJSONObject() {

			JSONObject json = new JSONObject();
			try {
				json.put("name", name);
				json.put("ispkey", isPkey);
				json.put("datatype", datatype);
				json.put("isautoinc", isAutoIncrement);
				json.put("isrequired", isRequired);
			} catch (JSONException e) {
				setError(e);
			}
			return json;

		}
	}
}
///**
//* Automatically sweeps through Entity and EntityField tables and removes bad EntityField
//* records and then adds missing records in.
//* 
//* @return True if the method succeeds, false if an error occurs.
//*/
//private boolean fixLinkRecords() {
//	// 1) get list of all tables from entity table;
//	// 2) sort list into basic tables (not underscore) and link tables (one underscore)
//	// 3) check for valid link tables - both side of underscore exists
//	// 4) check that linktable is represented in th entitylink table
//	HashMap<String, Table> mapBasicTables = new HashMap<String, Table>();
//	HashMap<String, Table> mapLinkTables = new HashMap<String, Table>();
//
//	try {
//		String sqlCleanData = "DELETE FROM entitylink WHERE fromentityid NOT IN (SELECT entityid FROM entity) OR toentityid NOT IN (SELECT entityid FROM entity)";
//		Statement stmt = _conn.getStatement();
//		stmt.execute(sqlCleanData);
//
//		ResultSet rs = stmt.executeQuery(_sqlEntityTables);
//		while (rs.next()) {
//			Table tbl = new Table(rs.getString("tablename"), rs.getLong("entityid"));
//			int indx = tbl.Tablename.indexOf("_");
//			if (indx == -1) {
//				mapBasicTables.put(tbl.Tablename, tbl);
//			} else if (tbl.Tablename.indexOf("_", indx + 1) == -1) {
//				mapLinkTables.put(tbl.Tablename, tbl);
//			}
//		}
//		rs.close();
//
//		String sql = "SELECT fromentityid, toentityid FROM entitylink WHERE entitymapid = ?";
//		PreparedStatement ps = _conn.getPreparedStatement(sql);
//
//		long fromid = -1;
//		long toid = -1;
//
//		for (Table tbl : mapLinkTables.values()) {
//			// Logger.verbose("Link Table: " + tbl.Tablename + ", ID: " + tbl.EntityId);
//			int indx = tbl.Tablename.indexOf("_");
//			String fromTable = tbl.Tablename.substring(0, indx);
//			String toTable = tbl.Tablename.substring(indx + 1);
//			if (!mapBasicTables.containsKey(fromTable)) {
//				Logger.error("fromTable missing: " + fromTable);
//
//			} else if (!mapBasicTables.containsKey(toTable)) {
//				Logger.error("toTable missing: " + toTable);
//
//			} else {
//				ps.clearParameters();
//				ps.setLong(1, tbl.EntityId);
//				rs = ps.executeQuery();
//				if (rs.next()) {
//					fromid = rs.getLong("fromentityid");
//					toid = rs.getLong("toentityid");
//					if (!rs.next()) {
//						CreateEntityLink(toid, fromid, tbl.EntityId);
//					}
//				} else {
//					fromid = mapBasicTables.get(fromTable).EntityId;
//					toid = mapBasicTables.get(toTable).EntityId;
//					CreateEntityLink(toid, fromid, tbl.EntityId);
//					CreateEntityLink(fromid, toid, tbl.EntityId);
//				}
//				rs.close();
//			}
//		}
//		return true;
//	} catch (Exception e) {
//		Logger.error(e);
//		return false;
//	}
//}
//
///**
//* Creates a link from one entity to another in the entitylink table.
//* 
//* @param fromEntityID EntityMap id for the From side of the link
//* @param toEntityID EntityMap id for the To side of the link
//* @param EntityID EntityMap id of the Entity/Table which holds the links.
//* @return True if the method succeeds, false if an error occurs.
//*/
//private boolean CreateEntityLink(long fromEntityID, long toEntityID, long EntityID) {
//	try {
//		// Logger.verbose("CreateEntityList F:" + fromEntityID + " , T: " + toEntityID +
//		// ", E" + EntityID);
//		String sqlInsert = "INSERT INTO entitylink (fromentityid, toentityid, entitymapid) VALUES (?,?,?)";
//		PreparedStatement psInsert = _conn.getPreparedStatement(sqlInsert);
//
//		psInsert.setLong(1, fromEntityID);
//		psInsert.setLong(2, toEntityID);
//		psInsert.setLong(3, EntityID);
//		boolean rtn = psInsert.execute();
//		psInsert.close();
//		return rtn;
//	} catch (SQLException e) {
//		Logger.error(e);
//		return false;
//	}
//}
