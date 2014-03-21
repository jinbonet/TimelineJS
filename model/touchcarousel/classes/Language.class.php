<?php
class TaogiLanguage {
	public $lang;
	public $dic;
	public $json;

	public function TaogiLanguage($root,$lang,$skinname) {
		global $config;
		$this->lang = $lang;
		$skinfile = $root."/skin/".$skinname."/lang/".$lang.".json";
		$langfile = $root."/lang/".$lang.".json";
		if(file_exists($skinfile)) {
			$this->json = "skin/".$skinname."/lang/".$lang.".json";
			$this->dic = json_decode(file_get_contents($skinfile),true);
		} else if(file_exists($langfile)) {
			$this->json = "lang/".$lang.".json";
			$this->dic = json_decode(file_get_contents($langfile),true);
		}
	}

	public function json_url($uri) {
		return ($this->json ? $uri."/".$this->json : '');
	}

	public function _t() {
		$argc = func_num_args();
		$argv = func_get_args();
		if($argc) {
			$ret = ($this->dic[$argv[0]] ? $this->dic[$argv[0]] : $argv[0]);
			for($i=1; $i<$argc; $i++) {
				$ret = str_replace("$".$i,$argv[$i],$ret);
			}
		}
		return $ret;
	}
}
?>
