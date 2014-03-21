<?php
require_once dirname(__FILE__)."/config/config.php";
require_once ROOT."/library/times.library.php";
require_once ROOT."/classes/Data.class.php";
require_once dirname(__FILE__)."/classes/MediaElement.class.php";
$line_cnt = $config['line_cnt'];
if(!$skinname) $skinname = "default";
if(!$width) $width = 960;

if(!$order) $order = "desc";
switch($source_type) {
	case 'googlespreadsheet':
		$data = $getSource->getSource($source);
		if($data) {
			$json = JNTimeLine_Data::getGoogleSpreed($data);
			if($json) {
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
	$total_cnt = @count($datalist);
	$page = ($_GET['page'] ? $_GET['page'] : 1);
	if(file_exists(dirname(__FILE__)."/skin/".$skinname."/style.css")) {
		$header .= "\t\t<link rel=\"stylesheet\" type=\"text/css\" href=\"./model/fb/skin/".$skinname."/style.css\" />\n";
	}
	$header .= "\t\t<script type=\"text/javascript\" src=\"./model/fb/js/jquery.masonry.js\"></script>\n";
	$header .= "\t\t<script type=\"text/javascript\" src=\"./model/fb/js/timeline.js\"></script>\n";
	if(file_exists(dirname(__FILE__)."/skin/".$skinname."/script.js")) {
		$header .= "\t\t<script type=\"text/javascript\" src=\"./model/fb/skin/".$skinname."/script.js\"></script>\n";
	}
	ob_start();
	require_once dirname(__FILE__)."/skin/".$skinname."/timeline.php";
	$content = ob_get_contents();
	ob_end_clean();
}
?>
