<?php

/*
 * The server you want to proxy to
 * Provide without any ports and protocol
 */ 
$config['server'] = 'my.server.com';

/*
 * Forwarding ports for http and https
 */
$config['http_port']  = 80;
$config['https_port'] = 433;

/*
 * Timeout in seconds
 */
$config['timeout'] = 5;
