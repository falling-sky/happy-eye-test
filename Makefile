beta: 
	rsync -av *.html *.js *.map *.css /var/www/stuff.gigo.com/happy-eye-test/.
	rsync -av *.html *.js *.map *.css /var/www/stuff.gigo.com/happy-eye-test-beta/.

prod: beta
	rsync -av *.html *.js *.map *.css /var/www/he.test-ipv6.com/.
