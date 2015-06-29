
beta: 
	rsync -av index.html *.js *.map index.css /var/www/stuff.gigo.com/happy-eye-test-beta/.


prod: 
	rsync -av index.html *.js *.map index.css /var/www/stuff.gigo.com/happy-eye-test/.
