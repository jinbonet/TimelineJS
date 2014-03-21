<?php
class JNTimeLine_getSource {
	var $config;

	function JNTimeLine_getSource($config) {
		$this->config = $config;
	}

	function sourceURL($url) {
		if($this->config['cache']) {
			$cache_file = $this->config['cache_path']."/".str_replace(array("/","?","&","="),array("_","-","-","-"),str_replace("http://","",$url));
			if(file_exists($cache_file)) {
				$stat = stat($cache_file);
				if($stat['mtime'] > (time() - $this->config['period'])) {
					$source = $cache_file;
				}
			}
			if(!$source) {
				$content = $this->getSource($url);
				$fp = fopen($cache_file,"w");
				fwrite($fp,$content);
				fclose($fp);
				$source = $cache_file;
			}
			return $cache_file;
		} else {
			return $url;
		}
	}

	function getSource($url) {
		if(substr($url,0,7) == "http://") {
			$ctx = stream_context_create(array(
				'http' => array(
					'timeout' => 3,
					'user_agent' => 'JNTimeLineBot/1.0 (http://'.$_SERVER['HTTP_HOST'].'/)'
				)
			));
			$response = @file_get_contents($url,0,$ctx);
		} else {
			$response = @file_get_contents($url);
		}
		return $response;
	}
}
?>
