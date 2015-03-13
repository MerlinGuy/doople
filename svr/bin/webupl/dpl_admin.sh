cpath="/var/lib/tomcat6/webapps/dpl/WEB-INF/lib/"
java -cp $cpath/geof_admin.jar:$cpath/* org.geof.admin.GeofAdmin "$@"
