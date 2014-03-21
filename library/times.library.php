<?php
function JNTimeLine_TimeToString($dateString) {
	$_date = explode(" ",$dateString);
	$_day = preg_split("/[\-\/,]+/",$_date[0]);
	$j=1;
	for($i=0; $i<@count($_day); $i++) {
		if((int)((int)$_day[$i] / 100) > 0) $day[0] = $_day[$i];
		else $day[$j++] = $_day[$i];
	}
	if($_date[1]) {
		$time = explode(":",$_date[1]);
	}
	if(!is_numeric($day[0])) return null;
	$pubDate = sprintf("%04d",(int)$day[0])."-".(isset($day[1]) ? sprintf("%02d",(int)$day[1]) : "01")."-".(isset($day[2]) ? sprintf("%02d",(int)$day[2]) : "01")." ".($time[0] ? sprintf("%02d",(int)$time[0]) : '00').":".($time[1] ? sprintf("%02d",(int)$time[1]) : "00").":".($time[2] ? sprintf("%02d",(int)$time[2]) : "00");
	return $pubDate;
}

function JNTimeLine_prettyTime($dateString) {
	$_date = explode(" ",$dateString);
	$_day = preg_split("/[\-\/,]+/",$_date[0]);
	$j=1;
	for($i=0; $i<@count($_day); $i++) {
		if((int)((int)$_day[$i] / 100) > 0) $day[0] = $_day[$i];
		else $day[$j++] = $_day[$i];
	}
	if(!is_numeric($day[0])) return $dateString;
	$pubDate = sprintf("%04d",(int)$day[0]);
	if(isset($day[1])) $pubDate .= ".".sprintf("%d",(int)$day[1]);
	if(isset($day[2])) $pubDate .= ".".sprintf("%d",(int)$day[2]);
	if($_date[1]) {
		$time = explode(":",trim($_date[1]));
		if(isset($time[0])) $pubDate .= " ".sprintf('%02d',$time[0]);
		if(isset($time[1])) $pubDate .= ":".sprintf("%02d",$time[1]);
		if(isset($time[2])) $pubDate .= ":".sprintf("%02d",$time[2]);
	}

	return $pubDate;
}
?>
