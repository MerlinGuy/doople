package org.geof.request;

import java.sql.ResultSet;

import org.geof.db.ParameterList;
import org.geof.db.QueryBuilder;
import org.geof.util.JsonUtil;

import org.json.JSONArray;
import org.json.JSONObject;


public class RequestauditRequest extends DBRequest {

	@Override
	/*
	 * Processes Read and Delete calls from clients.
	 * 
	 * @return Returns true if the call was a Read or Delete and successfull otherwise false.
	 */
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(READ)) {
			if (! _data.has(COMPLEXWHERE)) {
				return super.read();
			}else {
				return readComplex();
			}
		} else if (_actionKey.equalsIgnoreCase(DELETE)) {
			return delete();
		}
		return false;
	}
	
	public boolean readComplex() {
		boolean rtn = false;
		try {
			String[] columns = null;
			String columnsCSV = _data.optString(COLUMNS, "");
			if (columnsCSV.length() > 0) {
				columns = _data.getString(COLUMNS).split(",");
			} else {
				columns = _entitymap.getDefaultFields();
			}
			ParameterList pl = new ParameterList(_entitymap);
			
			String sql = "SELECT " + _entitymap.getFieldsCsv(columns, false)
					+ " FROM requestaudit";
			
			JSONArray where = _data.getJSONArray(COMPLEXWHERE);
			int len = where.length();
			JSONObject wItem;
			String operator;
			String field;
			Integer datatype;
			
			String WHERE = "";
			for (int indx=0; indx < len; indx++) {
				if (indx == 0) {
					WHERE = " WHERE ";
				} else {
					WHERE += " AND ";
				}
				wItem = where.getJSONObject(indx);
				field = wItem.getString(COLUMN);
				datatype = _entitymap.getDatatype(field);
				if (datatype == null) {
					setError("Invalid field for read: " + field);
					return false;
				}
				operator = wItem.getString(OPERATOR);
				
				if (QueryBuilder.VALID_OPERATORS.contains(operator)) {
					WHERE += field + operator + "?";
					pl.add(field, wItem.getString(VALUE), datatype);
				} else {
					setError("Invalid Operator set for read: " + operator);
					return false;
				}
			}
			sql += WHERE;
			String orderby = _data.optString( "orderby", "");
			if (orderby.length() > 0) {
				sql +=  " ORDER BY " + orderby;
			}
			ResultSet rs = _dbi.getResultSet(sql, pl);
			
			if (rs == null) {
				setError(_dbi.getError());
				return false;
			}
			_jwriter.openArray(DATA);
			rtn = _jwriter.writeResultset(rs, columns);
			_jwriter.closeArray(); //Close DATA array
			rtn = true;
		} catch (Exception e) {
			setError(e.getMessage());
		}
		return rtn;
	}

	@Override
	public boolean delete() {
		try {
			String sql = "DELETE FROM requestaudit";
			ParameterList pl = new ParameterList(_entitymap);
			JSONArray where = JsonUtil.getJsonArray(_data, COMPLEXWHERE, null);
			if (where == null) {
				setError("Delete missing 'complexwhere' element");
				return false;
				
			}
			int len = where.length();
			JSONObject wItem;
			String operator;
			String field;
			Integer datatype;
			
			String WHERE = "";
			for (int indx=0; indx < len; indx++) {
				if (indx == 0) {
					WHERE = " WHERE ";
				} else {
					WHERE += " AND ";
				}
				wItem = where.getJSONObject(indx);
				field = wItem.getString(COLUMN);
				datatype = _entitymap.getDatatype(field);
				if (datatype == null) {
					setError("Invalid field for read: " + field);
					return false;
				}
				operator = wItem.getString(OPERATOR);
				
				if (QueryBuilder.VALID_OPERATORS.contains(operator)) {
					WHERE += field + operator + "?";
					pl.add(field, wItem.getString(VALUE), datatype);
				} else {
					setError("Invalid Operator set for read: " + operator);
					return false;
				}
			}
			sql += WHERE;
			_dbi.execute(sql, pl);
			String error = _dbi.getError();
			if (error != null) {
				setError(error);
				return false;
			}
			_jwriter.openArray(DATA);			
			_jwriter.writeJsonPair(SUCCESS, true);
			_jwriter.closeArray(); //Close DATA array
			return true;

		} catch (Exception e) {
			setError(e.getMessage());
			return false;
		}
	}
	
}
