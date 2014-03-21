<?php
class Dispatcher {
	private static $instances = array();

	public $uri, $interfacePath;

	protected function __construct() {
		$this->URIinterpreter();
	}

	public static function instance() {
		$className = __CLASS__;
		if (!array_key_exists($className, self::$instances)) {
			self::$instances[$className] = new $className();
		}
		return self::$instances[$className];
	}

	private function URIinterpreter() {

		$this->uri = array (
			'host'      => $_SERVER['HTTP_HOST'],
			'fullpath'  => str_replace('index.php', '', $_SERVER["REQUEST_URI"]),
			'root'      => rtrim(rtrim(str_replace(array('rewrite.php','index.php'), array('',''), $_SERVER["SCRIPT_NAME"]), 'index.php'),'rewrite.php')
		);

		$_request_url = @parse_url($_SERVER['REQUEST_URI']);
		$this->uri['base_uri'] = rtrim($_request_url['path'],"/");
		$this->uri['uri'] = "http://".$this->uri['host'].$this->uri['fullpath'].($_request_url['query'] ? "?".$_request_url['query'] : "");
	}
}
