package org.geof.db;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Time;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.geof.log.Logger;
import org.geof.request.Request;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class QueryBuilder {
	
	public static final String INSERT_INTO = "INSERT INTO ";
	public static final String SELECT = "SELECT ";
	public static final String FROM = " FROM ";
	public static final String WHERE = " WHERE ";
	public static final String ORDERBY = " ORDER BY ";
	public static final String RETURNING = " RETURNING ";
	public static final String NOT = "NOT ";
	public static final String EXISTS = "EXISTS ";
	public static final String BLANK = "";
	public static final String COMMA = ",";
	public static final String DOT = ".";
	public static final String ID = "id";
	public static final String SPACE = " ";
	
	public final static String GT = ">";
	public final static String LT = "<";
	public final static String GTE = ">=";
	public final static String LTE = "<=";
	public final static String NE = "<>";
	public static final String EQUAL = "=";
	
	public static final List<String> VALID_OPERATORS = Arrays.asList(new String[]{GT,LT,GTE,LTE,NE,EQUAL});

	public static final String AND = " AND ";
	public static final String EQUAL_Q = "=?";
	public static final String QMARK = "?";
	public static final String PAREN_L = "(";
	public static final String PAREN_R = ")";
	public static final String PAREN_LS = " (";
	public static final String PAREN_RS = ") ";
	public static final String UNDERSCORE = "_";
	public static final int GEOMETRYTYPE = 1111;
	public static final String LEFT_OUTER_JOIN = " LEFT OUTER JOIN ";
	public static final String INNER_JOIN = " INNER JOIN ";
	public static final String ON = " ON ";
	
	public static final String DATA_JOIN = "join";
	public static final String DATA_WHERE = "where";
	public static final String DATA_ORDERBY = "orderby";
	public static final String DATA_COLUMN = "column";
	public static final String DATA_ORDER = "order";
	
	public static final String FIELD = "field";
	public static final String VALUE = "value";
	public static final String OPERATOR = "operator";
	

	public static PreparedStatement getLinkPS(EntityMap emap, JSONObject data, DBConnection conn, boolean returning) {
/*
INSERT INTO file_project
(fileid,projectid)
(SELECT 1,5 WHERE NOT EXISTS
( SELECT fileid FROM file_project WHERE fileid = 1 AND projectid = 5))
RETURNING fileid,projectid
*/
		PreparedStatement ps = null;
		try {
			String entityName = emap.getName();
			String[] pkeys = emap.getPrimaryKeys();
			int tblCount = pkeys.length;

			JSONObject fields = data.getJSONObject(Request.FIELDS);
			String fieldList = "";
			String where = WHERE;
			String dataParams = "";

			ArrayList<NameValue> nvList = new ArrayList<NameValue>();
			String fieldName;

			NameValue nv = null;
			
			for (int indx =0; indx < tblCount; indx++) {
				fieldName = pkeys[indx];

				if (! emap.hasField(fieldName) ) {
					Logger.error("QueryBuilder.getLinkPS missing field name: " + fieldName);
					return null;
				}
				nv = new NameValue(fieldName, fields.get(fieldName), emap.getDatatype(fieldName));

				nvList.add(nv);
	
				if (indx == 0) {
					fieldList += fieldName;
					dataParams += QMARK;
					where += fieldName + EQUAL_Q;
				} else {
					fieldList += COMMA + fieldName;
					dataParams += COMMA + QMARK;
					where += AND + fieldName + EQUAL_Q;					
				}
			}

			String sql = INSERT_INTO + entityName + PAREN_L + fieldList + PAREN_R
					+ PAREN_LS + SELECT + dataParams + WHERE + NOT + EXISTS 
					+ PAREN_L + SELECT + nvList.get(0).Name 
					+ FROM + entityName + where + PAREN_R + PAREN_R;
			
			if (returning) {
				sql += RETURNING + fieldList;
			}
//			Logger.debug(sql);
			ps = conn.getPreparedStatement(sql);
			
			int nvCount = nvList.size();
			int offset = 1;
			for (int index = 0; index < nvCount; index++) {
				if (! setData(ps, nvList.get(index), index, offset)) {
					return null;
				}
			}
			offset = tblCount + 1;
			for (int index = 0; index < nvCount; index++) {
				if (! setData(ps, nvList.get(index), index, offset)) {
					return null;
				}
			}

		} catch (Exception e) {
			Logger.error("QueryBuilder.createLink: " + e.getMessage());
		}
		return ps;
	}
	
	public static String buildColumn(EntityMap emap, JSONObject data, boolean prefix) {
		String columnCSV = null;
		String columns = "";
		try {			
			if (data.has(Request.COLUMNS)) {
				columns = data.getString(Request.COLUMNS);
			}
		} catch (Exception e) {
			Logger.error("QueryBuilder.buildColumn: " + e.getMessage());
		}
		if (columns.length() > 0) {
			columnCSV = QueryBuilder.buildColumns(emap.getName(), columns);
		} else {
			String tablename = prefix ? emap.getName() : null;
			columnCSV = JsonUtil.getArrayAsCsv(emap.getDefaultFields(), tablename);
		}
		return columnCSV;
	}
	
	public static PreparedStatement getReadPS(EntityMap emap, JSONObject data, DBInteract dbi) {
		PreparedStatement ps = null;
		try {			
			String tblName = emap.getName();
			
			// 1) build column list
			String columnCSV = buildColumn(emap, data, false);
			
			// start adding where items
			ArrayList<WhereItem> whereitems = new ArrayList<WhereItem>();
			if (data.has(DATA_WHERE)) {
				whereitems.addAll(QueryBuilder.getWhereItems(emap, data));
			}

			String toTblList = "";
			String joinSql = "";
			String whereSql = "";
			boolean useAND = false;
			
		    // 2) build join list
			if (data.has(DATA_JOIN)) {
				JSONArray join = data.getJSONArray(DATA_JOIN);
				int joinCount = join.length();
				JoinItem joinItem;
				EntityMap lemap;
				
				String toTbl;
				String joinTbl;
				
				for (int indx = 0; indx < joinCount; indx++) {
					joinItem = new JoinItem( join.getJSONObject(indx));
					if (joinItem.columns.length() > 0) {
						columnCSV += "," + joinItem.columns;
					}
					
					toTbl = joinItem.emap.getName();
					toTblList += "," + toTbl;
					whereitems.addAll(joinItem.whereItems);
					lemap = EntityMapMgr.getLinkMap(tblName, toTbl);
					joinTbl = lemap.getName();
					joinSql += joinItem.join + lemap.getName() + ON + PAREN_L
						+ joinTbl + DOT + tblName + ID + EQUAL + tblName + DOT + ID + PAREN_R;
					
					if (whereSql.length() == 0) {
						whereSql = WHERE;
					} else {
						whereSql += AND;
						useAND = true;
					}
					whereSql += joinTbl + DOT + toTbl + ID + EQUAL + toTbl + DOT + ID; 
				}
			}
			
			String sql = SELECT + columnCSV + FROM + tblName + joinSql + toTblList + whereSql;
			
			 // 3) build where list
			int wiCount = whereitems.size();
			for (int indx = 0; indx < wiCount; indx++) {
				if (useAND ){
					sql += AND;
				} else if (whereSql.length() == 0) {
					sql += WHERE;
				}
				sql += whereitems.get(indx).constraint;
				useAND = true;
			}
			
			String orderby = parseOrderBy(data);
			if (orderby.length() > 0) {
				sql += ORDERBY + orderby;
			}			
//			Logger.debug(sql);
			ps = dbi.getPreparedStatement(sql);
			
			int index = 1;
			for (WhereItem whereItem : whereitems) {
				setData(ps, whereItem.value, whereItem.datatype, index);
				index++;
			}
		} catch (Exception e) {
			Logger.error(e);
			Logger.error("QueryBuilder.getReadPS: " + e.getMessage());
		}
		return ps;
	}
	
	public static PreparedStatement getComplexRead(EntityMap emap, JSONObject data, DBInteract dbi) {
		PreparedStatement ps = null;
		try {			
			String tblName = emap.getName();
			
			// 1) build column list
			String columnCSV = "";
			String columns = null;
			if (data.has(Request.COLUMNS)) {
				columns = data.getString(Request.COLUMNS);
				columnCSV = QueryBuilder.buildColumns(tblName, columns);
			}

			// start adding where items
			ArrayList<WhereItem> whereitems = new ArrayList<WhereItem>();
			if (data.has(DATA_WHERE)) {
				whereitems.addAll(QueryBuilder.getWhereItems(emap, data));
			}

		    // 2) build join list
			
			JSONArray join = data.getJSONArray(DATA_JOIN);

			int joinCount = join.length();
			JoinItem joinItem;
			EntityMap lemap;
			String toTbl;
			String toTblList = "";
			String joinSql = "";
			String whereSql = WHERE;
			String joinTbl;
			
			for (int indx = 0; indx < joinCount; indx++) {
				joinItem = new JoinItem( join.getJSONObject(indx));
				if (joinItem.columns.length() > 0) {
					if (columnCSV.length() > 0) {
						columnCSV += ",";
					}
					columnCSV += joinItem.columns;
				}
				
				toTbl = joinItem.emap.getName();
				if (toTbl.indexOf(UNDERSCORE) == -1) {

					whereitems.addAll(joinItem.whereItems);
					
					if (joinItem.type == JoinItem.LINK) {
						toTblList += "," + toTbl;
						lemap = EntityMapMgr.getLinkMap(tblName, toTbl);
						joinTbl = lemap.getName();
						joinSql += joinItem.join + lemap.getName() + ON + PAREN_L
							+ joinTbl + DOT + tblName + ID + EQUAL + tblName + DOT + ID + PAREN_R;
						
						whereSql += joinTbl + DOT + toTbl + ID + EQUAL + toTbl + DOT + ID;
						
					} else if (joinItem.type == JoinItem.PARENT) {
						joinSql += joinItem.join + joinItem.emap.getName() + ON + PAREN_L
								+ tblName + DOT + toTbl + ID + EQUAL + toTbl + DOT + ID + PAREN_R;
						
					} else if (joinItem.type == JoinItem.CHILD) {
						joinSql += joinItem.join + joinItem.emap.getName() + ON + PAREN_L
								+ toTbl + DOT + tblName + ID + EQUAL + tblName + DOT + ID + PAREN_R;
					}
					
				} else {
					whereitems.addAll(joinItem.whereItems);
					joinSql += joinItem.join + toTbl + ON + PAREN_L
						+ toTbl + DOT + tblName + ID + EQUAL + tblName + DOT + ID + PAREN_R;					
				}
				
			}
			
			String sql = SELECT + columnCSV + FROM + tblName + joinSql + toTblList + whereSql;
			
			 // 3) build where list
			int wiCount = whereitems.size();
			boolean useAnd = ! WHERE.equalsIgnoreCase(whereSql);
			for (int indx = 0; indx < wiCount; indx++) {
				if ( useAnd || (indx > 0) ) {
					sql += AND;
				}
				sql += whereitems.get(indx).constraint;
			}
			
			String orderby =  parseOrderBy( data);
			if (orderby.length() > 0) {
				sql += ORDERBY + orderby;				
			}
				
			dbi.setLastSQL(sql);
//			Logger.debug(sql);
			ps = dbi.getPreparedStatement(sql);
			
			int index = 1;
			for (WhereItem whereItem : whereitems) {
				if (whereItem.hasValue) {
					setData(ps, whereItem.value, whereItem.datatype, index);
					index++;
				}
			}
		} catch (Exception e) {
			Logger.error("QueryBuilder.getComplexRead: " + e.getMessage());
		}
		return ps;
	}

	public static String parseOrderBy(JSONObject data) throws Exception{
		String orderby= "";		
		if (data.has(DATA_ORDERBY)) {
			Object obj = data.get(DATA_ORDERBY);
			if (obj instanceof JSONArray) {
				JSONArray jaOB = (JSONArray)obj;
				int count = jaOB.length();
				JSONObject joOB;
				for (int indx=0;indx < count;indx++) {
					joOB = jaOB.getJSONObject(indx);
					if (indx > 0) {
						orderby += ", ";
					} 
					orderby += joOB.getString(DATA_COLUMN) + SPACE + joOB.getString(DATA_ORDER);
				}					
			} else {
				orderby = ((String)obj);
			}
		}
		return orderby;
	}
	
	public static List<String[]> getOrderby(Object orderby) throws Exception {
		List<String[]> list = new ArrayList<String[]>();
		
		if (orderby instanceof JSONArray) {
			JSONArray jaOB = (JSONArray)orderby;
			int count = jaOB.length();
			JSONObject joOB;
			for (int indx=0;indx < count;indx++) {
				joOB = jaOB.getJSONObject(indx);
				list.add(
						new String[] {
								joOB.getString(DATA_COLUMN), joOB.getString(DATA_ORDER)
							}
					);
			}					
		} else {
			list.add( ((String)orderby).split(" "));
		}
		return list;
	}

	public static String buildColumns(String tblName, String columnsCSV) {
		String rtn = "";
		if ((columnsCSV != null) && (columnsCSV.length() > 0)) {
			String[] cols = columnsCSV.split(",");
			for (int indx = 0; indx < cols.length; indx++) {
				if (indx == 0) {
					rtn += tblName + "." + cols[indx];
				} else {
					rtn += "," + tblName + "." + cols[indx];
				}
			}
		}
		return rtn;
	}
	
	public static ArrayList<WhereItem> getWhereItems(EntityMap emap, JSONObject parent) {
		ArrayList<WhereItem> whereitems = new ArrayList<WhereItem>();
		JSONObject joWhere;
		String tblprefix = emap.getName() + DOT;
		String field, operator;
		int datatype;
		WhereItem wItem;
		try {
			Object objWhere = parent.get(DATA_WHERE);
			if (objWhere instanceof JSONArray) {
				JSONArray jaWhere = (JSONArray)objWhere;
				int count = jaWhere.length();
				for (int indx = 0; indx < count; indx++) {
					joWhere = jaWhere.getJSONObject(indx);
					field = joWhere.getString(FIELD);
					if (emap.hasField(field)) {
						operator = joWhere.optString( OPERATOR, "=");
						datatype = emap.getDatatype(field);
						wItem = new WhereItem (tblprefix + field, joWhere.get(VALUE), datatype, operator);
						whereitems.add( wItem );
					} else {
						Logger.error("QueryBuilder.getWhereItems invalid field, entity: "
								+ emap.getName() + ", field: " + field);
						return whereitems;
					}
				}
				
			} else if (objWhere instanceof JSONObject) {
				joWhere = (JSONObject)objWhere;
				String[] names = JSONObject.getNames(joWhere);
				if (names != null) {
					int count = names.length;
					for (int indx = 0; indx < count; indx++) {
						field = names[indx];
						if (emap.hasField(field)) {
							whereitems.add( new WhereItem (tblprefix + field, joWhere.get(field), emap.getDatatype(field), null));
						} else {
							Logger.error("QueryBuilder.getWhereItems invalid field, entity: "
									+ emap.getName() + ", field: " + field);
							return whereitems;
						}
					}
				}
			}
		} catch (JSONException e) {
			Logger.error(e);
			Logger.error("QueryBuilder.getWhereItems: " + e.getMessage());
		}
		return whereitems;
	}

	/**
	 * Internal Method for setting the individual PreparedStatement's parameter value
	 * 
	 * @param ps PreparedStatement whose parameter is to be set
	 * @param nv NameValue object holding the parameter data
	 * @param index Index of Parameter object to set.
	 * @return True if the method was successful other false if an error occurred.
	 */
	public static boolean setData(PreparedStatement ps, NameValue nv, int index, int offset) {
		index += offset;
		try {
			if (nv.Datatype == java.sql.Types.CHAR) {
				ps.setString(index, (String) nv.Value);
			} else if (nv.Datatype == java.sql.Types.VARCHAR) {
				ps.setString(index, (String) nv.Value);
			} else if (nv.Datatype == java.sql.Types.LONGVARCHAR) {
				ps.setString(index, (String) nv.Value);
			} else if (nv.Datatype == java.sql.Types.NUMERIC) {
				ps.setBigDecimal(index, BigDecimal.valueOf((Double) nv.Value));
			} else if (nv.Datatype == java.sql.Types.DECIMAL) {
				ps.setBigDecimal(index, BigDecimal.valueOf((Double) nv.Value));
			} else if (nv.Datatype == java.sql.Types.BIT) {
				ps.setBoolean(index, (Boolean) nv.Value);
			} else if (nv.Datatype == java.sql.Types.TINYINT) {
				ps.setByte(index, (Byte) nv.Value);
			} else if (nv.Datatype == java.sql.Types.SMALLINT) {
				ps.setShort(index, (Short) nv.Value);
			} else if (nv.Datatype == java.sql.Types.BIGINT) {
				ps.setLong(index, (Long) nv.Value);
			} else if (nv.Datatype == java.sql.Types.INTEGER) {
				ps.setInt(index, Integer.parseInt(nv.Value.toString()));
			} else if (nv.Datatype == java.sql.Types.BIGINT) {
				ps.setLong(index, (Long) nv.Value);
			} else if (nv.Datatype == java.sql.Types.REAL) {
				ps.setFloat(index, (Float) nv.Value);
			} else if (nv.Datatype == java.sql.Types.FLOAT) {
				ps.setDouble(index, (Float) nv.Value);
			} else if (nv.Datatype == java.sql.Types.DOUBLE) {
				ps.setDouble(index, (Double) nv.Value);
			} else if (nv.Datatype == java.sql.Types.DATE) {
				ps.setDate(index, (Date) nv.Value);
			} else if (nv.Datatype == java.sql.Types.TIME) {
				ps.setTime(index, (Time) nv.Value);
			} else if (nv.Datatype == java.sql.Types.BOOLEAN) {
				ps.setBoolean(index, (Boolean) nv.Value);
			} else if (nv.Datatype == java.sql.Types.TIMESTAMP) {
				ps.setTimestamp(index, (Timestamp) nv.Value);
			} else if (nv.Datatype == GEOMETRYTYPE) {
				ps.setObject(index, nv.Value, GEOMETRYTYPE);
			} else {
				Logger.error("setData Failed for " + nv.Name + "," + nv.Value + "," + nv.Datatype);
			}
			// Logger.verbose(nv.toString());
			return true;
		} catch (Exception e) {
			Logger.error("setData Error " + nv.Name + "," + nv.Value + " - datatype: " + nv.Value.getClass().toString() + "," + nv.Datatype);
			Logger.error(e);
			return false;
		}
	}

	
	public static boolean setData(PreparedStatement ps, Object value, int datatype, int index) {
		try {
			if (datatype == java.sql.Types.CHAR) {
				ps.setString(index, (String) value);
			} else if (datatype == java.sql.Types.VARCHAR) {
				ps.setString(index, (String) value);
			} else if (datatype == java.sql.Types.LONGVARCHAR) {
				ps.setString(index, (String) value);
			} else if (datatype == java.sql.Types.NUMERIC) {
				ps.setBigDecimal(index, BigDecimal.valueOf((Double) value));
			} else if (datatype == java.sql.Types.DECIMAL) {
				ps.setBigDecimal(index, BigDecimal.valueOf((Double) value));
			} else if (datatype == java.sql.Types.BIT) {
				ps.setBoolean(index, (Boolean) value);
			} else if (datatype == java.sql.Types.TINYINT) {
				ps.setByte(index, (Byte) value);
			} else if (datatype == java.sql.Types.SMALLINT) {
				ps.setShort(index, (Short) value);
			} else if (datatype == java.sql.Types.BIGINT) {
				ps.setLong(index, (Long) value);
			} else if (datatype == java.sql.Types.INTEGER) {
				ps.setInt(index, Integer.parseInt(value.toString()));
			} else if (datatype == java.sql.Types.BIGINT) {
				ps.setLong(index, (Long) value);
			} else if (datatype == java.sql.Types.REAL) {
				ps.setFloat(index, (Float) value);
			} else if (datatype == java.sql.Types.FLOAT) {
				ps.setDouble(index, (Float) value);
			} else if (datatype == java.sql.Types.DOUBLE) {
				ps.setDouble(index, (Double) value);
			} else if (datatype == java.sql.Types.DATE) {
				ps.setDate(index, (Date) value);
			} else if (datatype == java.sql.Types.TIME) {
				ps.setTime(index, (Time) value);
			} else if (datatype == java.sql.Types.BOOLEAN) {
				ps.setBoolean(index, (Boolean) value);
			} else if (datatype == java.sql.Types.TIMESTAMP) {
				ps.setTimestamp(index, (Timestamp) value);
			} else if (datatype == GEOMETRYTYPE) {
				ps.setObject(index, value, GEOMETRYTYPE);
			} else {
				Logger.error("setData Failed for " + value + "," + datatype);
			}
			// Logger.verbose(nv.toString());
			return true;
		} catch (Exception e) {
			Logger.error("setData Error " + value + " - datatype: " + value.getClass().toString() + "," + datatype);
			Logger.error(e);
			return false;
		}
	}
	
}
