<?php
define('ROOT',dirname(__FILE__));
require_once dirname(__FILE__)."/conf/config.php";
require_once dirname(__FILE__)."/classes/Dispatcher.class.php";
require_once dirname(__FILE__)."/classes/getSource.class.php";
extract($_GET);
if(!$src) {
	header('HTTP/1.1 404 Not Found');
	exit;
}
$_url = parse_url($src);
parse_str($_url['query'],$_query);
extract($_query);

$dispatcher = Dispatcher::instance();
$uri = $dispatcher->uri;
define("BASE_URI",rtrim($uri['root'],"/"));

if(!$model) $model = $timelineConfig['default_model'];
if(eregi("docs\.google\.com\/spreadsheet",$src)) {
	$source_type = "googlespreadsheet";
	if($model != "timelineJS") {
		$src = "https://spreadsheets.google.com/feeds/list/".$key."/od6/public/values?alt=json";
	}
} else if(eregi("storify.com",$src)) {
	$source_type = "storify";
} else {
	$source_type = "json";
}
$src = str_replace("https://","http://",$src);
$getSource = new JNTimeLine_getSource($timelineConfig);
$source = $getSource->sourceURL($src);
$page=1;

$theme_path = dirname(__FILE__)."/themes/".$timelineConfig['theme'];
if(file_exists($theme_path."/css")) {
	$dp = opendir($theme_path."/css");
	while($f = readdir($dp)) {
		if(substr($f,0,1) == ".") continue;
		$header .= "\t\t<link href=\"".BASE_URI."/themes/".$timelineConfig['theme']."/css/".$f."\" rel=\"stylesheet\" type=\"text/css\" />\n";
	}
	closedir($dp);
}
$header .= "\t\t<!--[if IE]>
		<link href=\"".BASE_URI."/resources/ie/ie_all.css\" rel=\"stylesheet\" type=\"text/css\" />
		<![endif]-->
		<!--[if IE]>
		<script language=\"javascript\" type=\"text/javascript\" src=\"".BASE_URI."/resources/ie/script.html5.js\"></script>
		<![endif]-->\n";
$dp = opendir(dirname(__FILE__)."/resources/script");
while($f = readdir($dp)) {
	if(substr($f,0,1) == ".") continue;
	$header .= "\t\t<script type=\"text/javascript\" src=\"".BASE_URI."/resources/script/".$f."\"></script>\n";
}
closedir($dp);
$dp = opendir(dirname(__FILE__)."/resources/js");
while($f = readdir($dp)) {
	if(substr($f,0,1) == ".") continue;
	$header .= "\t\t<script type=\"text/javascript\" src=\"".BASE_URI."/resources/js/".$f."\"></script>\n";
}
closedir($dp);
if(file_exists($theme_path."/js")) {
	$dp = opendir($theme_path."/js");
	while($f = readdir($dp)) {
		if(substr($f,0,1) == ".") continue;
		$header .= "\t\t<script type=\"text/javascript\" src=\"".BASE_URI."/themes/".$timelineConfig['theme']."/js/".$f."\"></script>\n";
	}
	closedir($dp);
}

if(!$skinname) $skinname = "default";
require_once dirname(__FILE__)."/model/".$model."/index.php";

ob_start();
include_once $theme_path."/layout.html.php";
$content = ob_get_contents();
ob_end_clean();

if($timelineConfig['use_sns']) {
	require_once "./classes/sns.class.php";
	$tmSns = new JNTimeLine_SNS($timeline,$timelineConfig,"http://".$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']."/".$uri[2]);
	$content = $tmSns->sns_share_button($content);
}
print $content;
?>
