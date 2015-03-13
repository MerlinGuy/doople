package org.geof.db;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;

import org.geof.log.Logger;

/**
 * Class used to Resultset field and datatype information
 */
public class ColumnTrio {
	public String FieldName;
	public int Indx;
	public int Datatype;
	public boolean Encode = false;
	public boolean isString = false;

	public ColumnTrio(int index, int datatype, String fieldname) {
		Indx = index;
		Datatype = datatype;
		FieldName = fieldname;
	}
	
	public ColumnTrio(int index, int datatype, String fieldname, boolean encode) {
		Indx = index;
		Datatype = datatype;
		FieldName = fieldname;
		Encode = encode;
		isString = this.isString();
	}
	
	public boolean isString() {
		return ((Datatype == java.sql.Types.CHAR)
				|| (Datatype == java.sql.Types.VARCHAR)
				|| (Datatype == java.sql.Types.LONGVARCHAR));
	}
	
	public static ColumnTrio[] getList(ResultSetMetaData rsmd) {
		try {
			int colCount = rsmd.getColumnCount();
			ColumnTrio[] cps = new ColumnTrio[colCount];
			colCount++;
			for (int indx = 1; indx < colCount; indx++) {
				cps[indx-1] = new ColumnTrio(indx, rsmd.getColumnType(indx), rsmd.getColumnName(indx));
			}
			return cps;
		} catch (SQLException e) {
			Logger.error(e);
			return new ColumnTrio[0];
		}
	}
	
	public static ColumnTrio[] getList(ResultSet rs) {
		try {
			return ColumnTrio.getList(rs.getMetaData());
		} catch (SQLException e) {
			Logger.error(e);
			return new ColumnTrio[0];
		}
	}

	/**
	 * Generates an Array of ColumnTrio from a ResultSetMetaData object and list of ResultSet
	 * fields.
	 * 
	 * @param rsmd ResultSetMetaData to use as the source ResultSet field data
	 * @param flds List of fields to add to the Array of ColumnTrio
	 * @return Returns the generated ColumnTrio list.
	 */
	public static ColumnTrio[] getList(ResultSetMetaData rsmd, String[] flds) {
		try {
			int size = flds.length;
			int colcount = rsmd.getColumnCount();
			ColumnTrio[] columns = new ColumnTrio[size];
			String fld;
			for (int col = 1; col <= colcount; col++) {
				boolean notFound = true;
				for (int indx = 0; indx < size && notFound; indx++) {
					fld = flds[indx];
					if (rsmd.getColumnName(col).equalsIgnoreCase(fld)) {
						columns[indx] = new ColumnTrio(col, rsmd.getColumnType(col), fld);
						notFound = false;
					}
				}
				if (notFound) {
					Logger.error("ColumnTrio.getList " + rsmd.getColumnName(col) + " not in Resultset");
					return null;
				}
			}
			return columns;
		} catch (SQLException e) {
			Logger.error(e);
			return null;
		}
	}
	
	public static ColumnTrio[] getList2(ResultSetMetaData rsmd, String[] encoded) {
		try {
			int eSize = encoded.length;
			boolean encode;
			int colcount = rsmd.getColumnCount();
			ColumnTrio[] list = new ColumnTrio[colcount];
			
			String colName;
			int rsCol;
			int datatype;
			for (int col = 0; col < colcount; col++) {
				rsCol = col + 1;
				datatype = rsmd.getColumnType(rsCol);
				colName = rsmd.getColumnName(rsCol);
				encode = false;
				for (int indx = 0; indx < eSize; indx++) {
					if (encoded[indx].equalsIgnoreCase(colName)) {
						encode = true;
						break;
					}
				}
				list[col] = new ColumnTrio(rsCol, datatype, colName, encode);
			}
			return list;
		} catch (SQLException e) {
			Logger.error(e);
			return null;
		}
	}

	public static String[] getColumns(ResultSetMetaData rsmd) {
		try {
			int colcount = rsmd.getColumnCount();
			String[] columns = new String[colcount];
			for (int indx = 1; indx <= colcount; indx++) {
				columns[indx-1] = rsmd.getColumnName(indx);
			}
			return columns;
		} catch (SQLException e) {
			Logger.error(e);
			return null;
		}
	}
}
