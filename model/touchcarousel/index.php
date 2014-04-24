<?php
require_once dirname(__FILE__)."/config/config.php";
require_once ROOT."/library/times.library.php";
require_once ROOT."/classes/Data.class.php";
require_once dirname(__FILE__)."/classes/ElementResolution.class.php";
require_once dirname(__FILE__)."/classes/Theme.class.php";
require_once dirname(__FILE__)."/classes/Language.class.php";
if(!$skinname) $skinname = "default";

$taogi_ER = new Taogi_ElementResolution();

if(!$order) $order = "asc";
$lang = new TaogiLanguage(dirname(__FILE__),$config['lang'],$skinname);
switch($source_type) {
	case 'googlespreadsheet':
		$data = $getSource->getSource($source);
		if($data) {
			$json = JNTimeLine_Data::getGoogleSpreed($data);
			if($json) {
				$timeline = $json['timeline'];
				$datalist = $json['timeline']['date'];
			} else {
				$source = str_replace("/feeds/list/","/feeds/cells/",$source);
				$data = $getSource->getSource($source);
				if($data) {
					$json = JNTimeLine_Data::getGoogleCells($data);
					$datalist = $json['timeline']['date'];
				}
			}
		}
		break;
	case 'storify':
		break;
	default:
		$json = $getSource->getSource($source);
		if($json) {
			$json = JNTimeLine_Data::getJson($json,$order);
			$timeline = $json['timeline'];
			$datalist = $json['timeline']['date'];
		}
		break;
}

if($datalist) {
	$header .= "\t\t<meta name=\"viewport\" content=\"user-scalable=no,width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0\" />";
	$header .= "\t\t<link rel=\"stylesheet\" type=\"text/css\" href=\"".BASE_URI."/resources/css/media.css\" />\n";
	$header .= "\t\t<link rel=\"stylesheet\" type=\"text/css\" href=\"".BASE_URI."/model/touchcarousel/css/gnb.css\" />\n";
	$header .= "\t\t<link rel=\"stylesheet\" type=\"text/css\" href=\"".BASE_URI."/model/touchcarousel/css/layout.css\" />\n";
	$header .= "\t\t<!--[if lt IE 9]>
		<link rel=\"stylesheet\" type=\"text/css\" href=\"".BASE_URI."/model/touchcarousel/css/layout.ie.css\" />
		<![endif]-->\n";
	if(file_exists(dirname(__FILE__)."/skin/".$skinname."/style.css")) {
		$header .= "\t\t<link rel=\"stylesheet\" type=\"text/css\" href=\"".BASE_URI."/model/touchcarousel/skin/".$skinname."/style.css\" />\n";
	}
	if(file_exists(dirname(__FILE__)."/skin/".$skinname."/style.ie.css")) {
		$header .= "\t\t<!--[if lt IE 9]>
		<link rel=\"stylesheet\" type=\"text/css\" href=\"".BASE_URI."/model/touchcarousel/skin/".$skinname."/style.ie.css\" />
		<![endif]-->\n";
	}

	$taogi_theme = new Taogi_Theme($json['timeline']['extra']['theme'],$config);
	if($json['timeline']['extra']['theme']) {
		$header .= $taogi_theme->makeStyle();
		$font_list = $taogi_theme->getRequiredFontFace();
	}

	$header .= "\t\t<script type=\"text/javascript\">\n\t\t\t\tvar TaogiLanguagePack='".$lang->json_url(BASE_URI."/model/touchcarousel")."';\n\t\t</script>\n";
	$header .= "\t\t<script type=\"text/javascript\" src=\"".BASE_URI."/model/touchcarousel/js/jquery.easing.1.3.js\"></script>\n";
	$header .= "\t\t<script type=\"text/javascript\" src=\"".BASE_URI."/model/touchcarousel/js/jquery.taogi.touchcarousel.js\"></script>\n";
	$header .= "\t\t<script type=\"text/javascript\" src=\"".BASE_URI."/model/touchcarousel/js/gnb.js\"></script>\n";
	if(file_exists(dirname(__FILE__)."/skin/".$skinname."/script.js")) {
		$header .= "\t\t<script type=\"text/javascript\" src=\"".BASE_URI."/model/touchcarousel/skin/".$skinname."/script.js\"></script>\n";
	}
	$permalink = $_SERVER['REQUEST_URI'];
	ob_start();
	require_once dirname(__FILE__)."/skin/".$skinname."/timeline.php";
if($config['use_gnb'] != false) {
	require_once dirname(__FILE__)."/navigation.php";
}
	$content = ob_get_contents();
	ob_end_clean();
}
?>
