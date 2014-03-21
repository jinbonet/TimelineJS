<?php
require_once dirname(__FILE__)."/conf/config.php";
require_once dirname(__FILE__)."/classes/getSource.class.php";
extract($_GET);
if(!$src) {
	header('HTTP/1.1 404 Not Found');
	exit;
}

$_url = parse_url($src);
parse_str($_url['query'],$_query);
extract($_query);

if(!$model) $model = $timelineConfig['default_model'];
if(eregi("docs.google.com",$src)) {
	$source_type = "csv";
	if($model == "fb") {
		$src = str_replace("&output=html","&output=csv",$src);
	}
} else if(eregi("storify.com",$src)) {
	$source_type = "storify";
} else {
	$source_type = "json";
}
$src = str_replace("https://","http://",$src);
$getSource = new JNTimeLine_getSource($timelineConfig);
$source = $getSource->sourceURL($src);

header("Content-Type:text/html; charset=utf-8");
require_once dirname(__FILE__)."/model/".$model."/index.php";

print $content;
?>
