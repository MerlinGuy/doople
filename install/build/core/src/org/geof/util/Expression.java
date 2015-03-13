package org.geof.util;

import java.util.Stack;

/**
 * Expression Class is used to build complex queries for the SearchRequest
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class Expression {

	public final static String GT = " > ";
	public final static String GTE = " >= ";
	public final static String LT = " < ";
	public final static String LTE = " <= ";
	public final static String EQ = " = ";
	public final static String NEQ = " != ?";
	public final static String GTQ = " > ?";
	public final static String GTEQ = " >= ?";
	public final static String LTQ = " < ?";
	public final static String LTEQ = " <= ?";
	public final static String EQQ = " = ?";
	public final static String NEQQ = " != ?";
	public final static String LIKEWC = " LIKE %?%";
	public final static String LIKEQ = " LIKE ?";
	public final static String OPEN = "(";
	public final static String CLOSE = ")";
	public final static String DOT = ".";
	public final static String COMMA = ",";

	public final static String OR = " OR ";
	public final static String AND = " AND ";

	private StringBuilder _where = new StringBuilder();
	private boolean _useSeparator = false;
	private String _separator = AND;
	private Stack<String> _separatorStack = new Stack<String>();
	private Stack<Boolean> _useStack = new Stack<Boolean>();

	/**
	 * Class constructor
	 */
	public Expression() {
	}

	/**
	 * Class constructor
	 * 
	 * @param sb Additional Where constraints to add to the built Where Expression
	 */
	public Expression(StringBuilder sb) {
		if (sb != null) {
			_where.append(sb);
		}
	}

	/**
	 * Class constructor
	 * 
	 * @param separator Constraint seperator to use.
	 */
	public Expression(String separator) {
		_separator = separator;
	}

	/**
	 * Adds a string to the Where constraint string.
	 * 
	 * @param str String to add
	 * @return Returns This object
	 */
	public Expression add(String str) {
		if (_useSeparator) {
			_where.append(_separator);
		}
		_where.append(str);
		if ((!_useSeparator) && (_where.length() > 0)) {
			_useSeparator = true;
		}
		return this;
	}

	/**
	 * Adds two strings to the Where constraint
	 * 
	 * @param str First string to add
	 * @param str2 Second string to add
	 * @return Returns this object.
	 */
	public Expression add(String str, String str2) {
		if (_useSeparator) {
			_where.append(_separator);
		}
		_where.append(str).append(str2);
		if ((!_useSeparator) && (_where.length() > 0)) {
			_useSeparator = true;
		}
		return this;
	}

	/**
	 * 
	 * @return Returns the base StringBuilder containing Where constraint expression
	 */
	public StringBuilder getStringBuilder() {
		return _where;
	}

	/**
	 * Appends another Expression object to this Expression
	 * @param exp Additional Expression to add
	 * @return Returns this Expression
	 */
	public Expression append(Expression exp) {
		_where.append(exp.getStringBuilder());
		return this;
	}

	/**
	 * Appends a String to the end of the Expression
	 * @param str  Addition string contraint to add
	 * @return Returns this Expression
	 */
	public Expression append(String str) {
		_where.append(str);
		return this;
	}

	/**
	 * Appends two strings to the end of the Expression
	 * @param str First string to add
	 * @param str2 Second string to add
	 * @return Returns this Expression
	 */
	public Expression append(String str, String str2) {
		_where.append(str).append(str2);
		return this;
	}

	/**
	 * Prepends a String to the start of the Expression
	 * @param str  Addition string contraint to add
	 * @return Returns this Expression
	 */
	public Expression prepend(String str) {
		_where.insert(0, str);
		return this;
	}

	/**
	 * Opens up a new section of the Expression
	 * 
	 * @param str Constraint String to add
	 * @param newSeparator New Seperator to use
	 * @return Returns this Expression
	 */
	public Expression open(String str, String newSeparator) {
		_separatorStack.push(_separator);
		_useStack.push(_useSeparator);
		_separator = newSeparator == null ? AND : newSeparator;
		_useSeparator = false;
		return this.add(OPEN).append(str);
	}

	/**
	 * Adds the new constraint string and closes the current Expression section 
	 * 
	 * @param str New constraint string to add
	 * @return Returns this Expression
	 */
	public Expression close(String str) {
		add(str).append(CLOSE);
		_separator = _separatorStack.pop();
		_useSeparator = _useStack.pop();
		_useSeparator = false;
		return this;
	}

	/**
	 * Opens up a new section of the Expression
	 * 
	 * @param newSeparator New Expression section to add
	 * @return Returns this Expression
	 */
	public Expression open(String newSeparator) {
		this.add(OPEN);
		_separatorStack.push(_separator);
		_useStack.push(_useSeparator);
		_separator = newSeparator == null ? AND : newSeparator;
		_useSeparator = false;
		return this;
	}

	/**
	/**
	 * Adds the new constraint string and closes the current Expression section 
	 * 
	 * @return Returns this Expression
	 */
	public Expression close() {
		append(CLOSE);
		_separator = _separatorStack.pop();
		_useSeparator = _useStack.pop();
		return this;
	}

	/**
	 * @return Returns the Expression converted to a where string.
	 */
	public String toString() {
		return _where.toString();
	}

	/**
	 * 
	 * @return Returns the length of the Where expression
	 */
	public int length() {
		return _where.length();
	}

	/**
	 * 
	 * @return Return whether Expression is using its seperator
	 */
	public boolean willUseAnd() {
		return _useSeparator;
	}

	/**
	 * Sets the Expression's seperator string (And / Or)
	 * @param andor New seperator to use.
	 */
	public void setAndOr(String andor) {
		_separator = andor;
	}
}
