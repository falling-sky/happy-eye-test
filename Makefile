
beta: 
	rsync -av index.html *.js *.map index.css /var/www/stuff.gigo.com/happy-eye-test/.
	rsync -av index.html *.js *.map index.css /var/www/stuff.gigo.com/happy-eye-test-beta/.

prod: beta
	rsync -av index.html *.js *.map index.css /var/www/he.test-ipv6.com/.
