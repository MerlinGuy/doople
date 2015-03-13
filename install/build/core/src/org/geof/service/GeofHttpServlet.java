package org.geof.service;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletInputStream;
import java.io.PrintWriter;

import org.geof.db.DBInteract;
import org.geof.log.Logger;
import org.geof.request.RsaencryptionRequest;
import org.geof.util.FileUtil;

/**
 * Open Source Media Server Main Application HttpServlet
 * 
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class GeofHttpServlet extends HttpServlet {

	private static final long serialVersionUID = -1811532837973925513L;

	public static final int JSON = 0, XML = 1, URL = 2;
	
	public static final int CT_IMAGE=0, CT_HTML=1, CT_WORD=2, CT_EXCEL=3, CT_TEXT=4, CT_PDF=5, CT_JSON=6;
	public static String[] CONTENTTYPES = { "image/jpeg", "text/html", "application/vnd.ms-word", "Application/vnd.ms-excel", "text/plain", "application/pdf","application/json" };

	private static final String APPJSON = "application/json";
	private static final String HTML = "text/html";
	private static final String CLEARCODE = "clearcode";	
	protected String _sessionID = null;
	protected String _ipAddr = null;

	private int _requestType = -1;

	/**
	 * Class constructor
	 */
	public GeofHttpServlet() {
		super();
	}

	/**
	 * Processes HTTP post requests.
	 * 
	 * This is the main entry point in to the Java Servlet for posts. It reads the entire
	 * Input stream in and converts to a JSON Request object it in and then processes it
	 * through the Transaction Object.
	 * 
	 * @param request servlet request
	 * @param response servlet response
	 */
	protected void processPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

		try {
			_ipAddr = request.getRemoteAddr();
			response.setContentType(APPJSON);
			StringBuilder sb = new StringBuilder();
			byte[] buffer = new byte[4098];

			ServletInputStream sis = request.getInputStream();

			int bytesread = sis.read(buffer);
			while (bytesread > 0) {
				sb.append(new String(buffer, 0, bytesread));
				bytesread = sis.read(buffer);
			}

			String input = sb.toString();
			
			// Determine request type
			if (sb.length() == 0) {
				writeError(response, "Zero length message sent"); 
			} else {
				char fchr = sb.charAt(0);
				_requestType = (fchr == '{') ? JSON : ((fchr == '<') ? XML : URL);

				if (_requestType == JSON) {
					try {
						Transaction trans = new Transaction();
						trans.process(input, response.getOutputStream());
					} catch (Exception e) {
						writeError(response, "Zero length message sent"); 
					}
				} else {
					writeError(response,"Only accepting JSON based requests");
				}
			}
			
		} catch (Exception e) {
			writeError(response,"GeofHttpServlet.processPost - Unknown error occurred. " +  e.getMessage());
			Logger.error(e);
		}

		response.getOutputStream().close();
	}

	/**
	 * Processes HTTP Get requests..
	 * 
	 * At this point in time it only handles requests for Photos to be served back to the client
	 * 
	 * @param request servlet request
	 * @param response servlet response
	 */
	protected void processGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {	
		String clearcode = request.getParameter(CLEARCODE);
		if (clearcode != null) {
			sendRsaKey(clearcode, request,response);
		} else {
			sendPhoto(request, response);
		}
	}

	protected void sendPhoto(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		FileUtil.sendImage(request, response);
	}

	protected void sendRsaKey(String clearcode, HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		try {
			String msg = null;
			Thread.sleep(3000);
			if (clearcode.length() > 0) {
				DBInteract dbi = new DBInteract();
				boolean rtn = RsaencryptionRequest.emailRsa(dbi, clearcode);
				dbi.dispose();
				if (rtn ) {
					msg = "{\"state\":\"key sent\"}";
				} else {
					msg = "{\"error\":\"clearcode not found\"}";
				}
			} else {
				msg = "{\"error\":\"Clearcode is zero length\"}";
			}
			writeJson(response,msg);
		} catch (Exception e) {			
			Logger.error("geofHttpServlet.processGet (send RSA key) " + e.getMessage());
			Logger.error(e);
			response.getOutputStream().close();
		} 
	}

	/**
	 * Writes an error out to the HttpServletResponse stream
	 * @param response  HttpServletResponse to write the error text to.
	 * @param error  Text error message to write to the stream.
	 */
	private void writeError(HttpServletResponse response, String error) {
		try {
			response.setContentType(HTML);
			PrintWriter out = response.getWriter();
			out.println("{\"error\":\"" + error + "\"}");
			out.close();
		} catch (IOException ioe) {
			Logger.error( ioe );
		}
	}

	private void writeJson(HttpServletResponse response, String json) {
		try {
			response.setContentType(HTML);
			PrintWriter out = response.getWriter();
			out.print(json);
			out.close();
		} catch (IOException ioe) {
			Logger.error( ioe );
		}
	}
	/**
	 * Handles the HTTP <code>GET</code> method.
	 * 
	 * @param request servlet request
	 * @param response servlet response
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		processGet(request, response);
	}

	/**
	 * Handles the HTTP <code>POST</code> method.
	 * 
	 * @param request servlet request
	 * @param response servlet response
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		processPost(request, response);
	}

	/**
	 * Returns a short description of the servlet.
	 */
	public String getServletInfo() {
		return "Open Source Media Server - Main HttpServlet";
	}

}
