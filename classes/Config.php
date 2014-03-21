<?php
final class JNTimeLine_Config extends JNTimeLine_Objects {
	public $service;

	public static function instance() {
		return self::_instance(__CLASS__);
	}

	protected function __construct() {
		$this->ConfigLoader(dirname(__FILE__)."/../config/config.php");
	}

	private function ConfigLoader($config_file) {
		if(file_exists($config_file)) {
			@include_once($config_file);
			$this->config = $config;
		}
		$this->updateContext();
	}

	public function updateContext() {
		$context = JNTimeLine_Context::instance();
		foreach($this->service as $k => $v) {
			$context->setProperty('config.'.$k,$v);
		}
	}
}
?>
