package org.geof.email;

import java.util.HashMap;
import java.util.Properties;

import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

public class EmailSender {
	
	public static final String HOST = "host";
	public static final String PORT = "port";
	public static final String TO_ADDR = "to_addr";
	public static final String LOGIN = "login";
	public static final String PWD = "pwd";
	public static final String SUBJECT = "subject";
	public static final String MESSAGE = "msg";


	public static void send(HashMap<String,String> data) {
 
		String username = data.get(LOGIN);
		String password = data.get(PWD);
		String to_addr = data.get(TO_ADDR);
		String host = data.get(HOST);
 
		Properties props = new Properties();
		props.put("mail.smtp.auth", "true");
		props.put("mail.smtp.starttls.enable", "true");
		props.put("mail.smtp.host", host);
		props.put("mail.smtp.port", "587");
		props.put("mail.smtp.user", username);
	    props.put("mail.smtp.password", password);
 	    
		try {
			Session session = Session.getDefaultInstance(props, null);
			Message message = new MimeMessage(session);
			message.setFrom(new InternetAddress(username));
			message.setRecipients(Message.RecipientType.TO,InternetAddress.parse(to_addr));
			message.setSubject(data.get(SUBJECT));
			message.setText(data.get(MESSAGE));
			Transport transport = session.getTransport("smtp");
			transport.connect(host, username, password);
		    transport.sendMessage(message, message.getAllRecipients());
		    transport.close();
  
		} catch (MessagingException e) {
			throw new RuntimeException(e);
		}
	}
}
