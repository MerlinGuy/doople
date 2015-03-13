mkdir /media/dpl_stor
mkdir /media/dpl_stor/stage
chown -R tomcat6:tomcat6 /media/dpl_stor
sed -ie 's/<location of upload staging directory>/\/media\/dpl_stor\/stage/g' /var/lib/tomcat6/webapps/dpl/WEB-INF/conf/dopple.conf
sudo service tomcat6 restart
