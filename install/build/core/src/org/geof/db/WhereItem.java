package org.geof.db;

public class WhereItem {

	public String name = null;
	public Object value = null;
	public int datatype = 0;
	public String constraint = null;
	public boolean hasValue = true;

	public static final String ISNULL = "IS NULL";
	public static final String ISNOTNULL = "IS NOT NULL";

	
	public WhereItem(String name, Object value, int datatype, String operator) {
		this.name = name;
		this.value = value;
		if (ISNULL.equalsIgnoreCase(value.toString()) ) {
			this.constraint = name + " " + ISNULL;
			hasValue = false;
		} else if (ISNOTNULL.equalsIgnoreCase(value.toString())) {
			this.constraint = name + " " + ISNOTNULL;
			hasValue = false;
		} else {
			this.datatype = datatype;
			if (operator == null) {
				operator = "=";
			}
			this.constraint = name + operator + "?";
		}
	}
}
