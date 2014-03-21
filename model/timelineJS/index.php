<?php
if(!$width) $width = "100%";
if(!$height) $height = "650";
if(!$lang) $lang = "en";
if(!$maptype) $maptype = "toner";
if(!$start_at_end) $start_at_end = "false";
if(!$hash_bookmark) $hash_bookmark = "false";
if(!$debug) $debug = "false";
if(!$start_at_slide) $start_at_slide = null;
if(!$start_zoom_adjust) $start_zoom_adjust = null;
if(!$skinname) $skinname = "default";
if(file_exists(dirname(__FILE__)."/skin/".$timeline['type']."/style.css")) {
	$header .= "\t\t<link href=\"".BASE_URI."/model/timelineJS/skin/".$skinname."/style.css\" rel=\"stylesheet\" type=\"text/css\" />\n";
}
$_root = explode("/",ltrim(rtrim($uri['root'],"/"),"/"));
$_base_uri = explode("/",ltrim(rtrim($uri['base_uri'],"/"),"/"));
if(count($_root) < count($_base_uri)) {
	$source = str_repeat("../",count($_base_uri)-count($_root)-1).$source;
}
$header .= "\t\t<script type=\"text/javascript\">// <![CDATA[
		var timeline_config = {
			width:      '".$width."',
			height:     '".$height."',
			source:     '".$source."',
			embed_id:   'timeline-embed',
			start_at_end: ".$start_at_end.",
			start_at_slide: '".$start_at_slide."',
			start_zoom_adjust: '". $start_zoom_adjust."',
			hash_bookmark:".$hash_bookmark.",
			font:'".$font."',
			debug:".$debug.",
			lang: '".$lang."',
			maptype: '".$maptype."',
		}
	// ]]></script>\n";
ob_start();
include_once dirname(__FILE__)."/skin/".$skinname."/timeline.php";
?>
			<script src="<?php print BASE_URI; ?>/model/timelineJS/build/js/storyjs-embed.js"></script>
<?php
$content = ob_get_contents();
ob_end_clean();
?>
