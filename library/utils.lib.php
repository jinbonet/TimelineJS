<?php
function loadClass($path) {
	$flist = scandir($path);
	foreach($flist as $f) {
		if(is_dir($path."/".$f)) {
			loadClass($path."/".$f);
			continue;
		}
		if(preg_match("/\.class\.php$/i",$f))
			require_once $path."/".$f;
	}
}

function unique_ID($size) {
	$chars = "abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ";
	for($i=0; $i<$size; $i++) {
		$str .= substr($chars,rand(0,61),1);
	}
	return $str;
}
?>
