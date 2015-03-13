package org.geof.util;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;

import org.geof.log.Logger;

/**
 * ExecTool is used to execute scripts on the server
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class ExecTool {

	private Runtime _rt = null;
	private boolean _debug = false;

	/**
	 * Class constructor
	 */
	public ExecTool() {
		_rt = Runtime.getRuntime();
	}

	/**
	 * Class constructor
	 * 
	 * @param debug If true the class will write the debug statements to the log file as it
	 * runs
	 */
	public ExecTool(boolean debug) {
		this();
		_debug = debug;
	}

	/**
	 * Executes the specified command
	 * 
	 * @param cmd Command to execute
	 * @param waitfor If true the class will wait for the command to finish before it returns.
	 * @return Returns true if no error occurs otherwise it returns false.
	 */
	public boolean execute(String cmd, boolean waitfor) {
		try {
			if (_debug) {
				Logger.debug(" ");
				Logger.debug(cmd);
			}
			if (waitfor) {
				_rt.exec(cmd).waitFor();
			} else {
				_rt.exec(cmd);
			}
			return true;
		} catch (Exception e) {
			Logger.error(e);
			return false;
		}
	}

	/**
	 * Executes the specified command
	 * 
	 * @param cmd Command to execute
	 * @param envp String array of script parameters to use.
	 * @param filedir Working directory for executing script.
	 * @param waitfor If true the class will wait for the command to finish before it returns.
	 * @return Returns true if no error occurs otherwise it returns false.
	 */
	public boolean execute(String cmd, String[] envp, String filedir, boolean waitfor) {
		try {
			if (_debug) {
				Logger.debug(" ");
				Logger.debug(cmd + " " + ToString(envp) + " " + filedir);
			}
			if (waitfor) {
				_rt.exec(cmd, envp, new File(filedir)).waitFor();
			} else {
				_rt.exec(cmd);
			}
			return true;
		} catch (Exception e) {
			Logger.error(e);
			return false;
		}
	}

	/**
	 * Executes the specified command
	 * 
	 * @param cmd Command to execute
	 * @return Returns the output of the executable as an ArrayList of Strings
	 */
	public ArrayList<String> exec(String cmd) {
		try {
			ArrayList<String> output = new ArrayList<String>();
			if (_debug) {
				Logger.debug(" ");
				Logger.debug(cmd);
			}
			Process proc = _rt.exec(cmd);
			BufferedReader read = new BufferedReader(new InputStreamReader(proc.getInputStream()));
			String line;
			while (read.ready()) {
				line = read.readLine();
				if (_debug) {
					Logger.debug(line);
				}
				output.add(line);
			}
			return output;
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	/**
	 * Executes the specified command
	 * 
	 * @param cmd Command to execute
	 * @return Returns the output of the executable as an ArrayList of Strings
	 */
	public ArrayList<String> runCommand(String cmd) {
		if (_debug) {
			Logger.debug(" ");
			Logger.debug(cmd);
		}
		try {
			// Create a list for storing output.
			ArrayList<String> output = new ArrayList<String>();

			// Execute a command and get its process handle
			Process proc = Runtime.getRuntime().exec(cmd);

			// Get the handle for the processes InputStream
			InputStream istr = proc.getInputStream();

			// Create a BufferedReader and specify it reads
			// from an input stream.
			BufferedReader br = new BufferedReader(new InputStreamReader(istr));
			String line; // Temporary String variable

			// Read to Temp Variable, Check for null then
			// add to (ArrayList)list
			while ((line = br.readLine()) != null) {
				if (_debug) {
					Logger.debug(line);
				}
				output.add(line);
			}

			// Wait for process to terminate and catch any Exceptions.
			try {
				proc.waitFor();
			} catch (Exception e) {
				System.err.println("Process was interrupted");
			}

			// Logger.error("Exit value: " + proc.exitValue());
			br.close(); // Done.

			// Convert the list to a string and return
			return output;
		} catch (Exception e) {
			return null;
		}
	}

	/**
	 * Executes the specified command
	 * 
	 * @param cmd Command to execute
	 * @param envp String array of script parameters to use.
	 * @param filedir Working directory for executing script.
	 * @return Returns the output of the executable as an ArrayList of Strings
	 */
	public ArrayList<String> runCommand(String cmd, String[] envp, String filedir) {
		if (_debug) {
			Logger.debug(" ");
			Logger.debug(cmd + " envp:" + ToString(envp) + " filedir:" + filedir);
		}
		try {
			// Create a list for storing output.
			ArrayList<String> output = new ArrayList<String>();

			// Execute a command and get its process handle
			Process proc = Runtime.getRuntime().exec(cmd, envp, new File(filedir));

			// Get the handle for the processes InputStream
			InputStream istr = proc.getInputStream();

			// Create a BufferedReader and specify it reads
			// from an input stream.
			BufferedReader br = new BufferedReader(new InputStreamReader(istr));
			String line; // Temporary String variable

			// Read to Temp Variable, Check for null then
			// add to (ArrayList)list
			while ((line = br.readLine()) != null) {
				if (_debug) {
					Logger.debug(line);
				}
				output.add(line);
			}

			// Wait for process to terminate and catch any Exceptions.
			try {
				proc.waitFor();
			} catch (Exception e) {
				System.err.println("Process was interrupted");
			}

			// Logger.error("Exit value: " + proc.exitValue());
			br.close(); // Done.

			// Convert the list to a string and return
			return output;
		} catch (Exception e) {
			return null;
		}
	}

	/**
	 * 
	 * @return Returns whether or not the class will log debug information when it executes
	 * scripts
	 */
	public boolean Debug() {
		return _debug;
	}

	/**
	 * Sets whether or not to debug the execution of a script
	 * 
	 * @param debug If true the class will debug the the script
	 */
	public void Debug(boolean debug) {
		_debug = debug;
	}

	/**
	 * Converts a String array in to a comma delimited string value
	 * @param value String Array to convert
	 * @return Returns Comma Delimited String
	 */
	private String ToString(String[] value) {
		String rtn = "[";
		for (int indx = 0; indx < value.length; indx++) {
			rtn += value[indx] + (indx < value.length - 1 ? ", " : "");
		}
		return rtn + "]";
	}
}
