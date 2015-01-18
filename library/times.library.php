<?php
function JNTimeLine_TimeToString($dateString) {
	$_date = explode(" ",$dateString);
	$_day = preg_split("/[\-\/,\.]+/",$_date[0]);
//	$j=1;
//	for($i=0; $i<@count($_day); $i++) {
//		if((int)((int)$_day[$i] / 100) > 0) $day[0] = $_day[$i];
//		else $day[$j++] = $_day[$i];
//	}
	$day = $_day;
	if($_date[1]) {
		$time = explode(":",$_date[1]);
	}
	if(!is_numeric($day[0])) return null;
	$pubDate = sprintf("%04d",(int)$day[0])."-".(isset($day[1]) ? sprintf("%02d",(int)$day[1]) : "01")."-".(isset($day[2]) ? sprintf("%02d",(int)$day[2]) : "01")." ".($time[0] ? sprintf("%02d",(int)$time[0]) : '00').":".($time[1] ? sprintf("%02d",(int)$time[1]) : "00").":".($time[2] ? sprintf("%02d",(int)$time[2]) : "00");
	return $pubDate;
}

function JNTimeLine_prettyTime($dateString) {
	$_date = explode(" ",$dateString);
	$_day = preg_split("/[\-\/,\.]+/",$_date[0]);
//	$j=1;
//	for($i=0; $i<@count($_day); $i++) {
//		if((int)((int)$_day[$i] / 100) > 0) $day[0] = $_day[$i];
//		else $day[$j++] = $_day[$i];
//	}
	$day = $_day;
	if(!is_numeric($day[0])) return $dateString;
	$pubDate = sprintf("%d",(int)$day[0]);
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

function JNTimeLine_formatTime($dateString,$format) {
	$_date = explode(" ",$dateString);
	$_day = preg_split("/[\-\/\.,]+/",$_date[0]);
	$_time = explode(":",trim($_date[1]));
	$year = (int)$_day[0];;
	if(@count($_day) == 1) {
		$dt = new DateTime($dateString."-01-01");
	} else if(@count($_day) == 2) {
		$dt = new DateTime(preg_replace("/[\/\.,]/i","-",$dateString)."-01");
	} else {
		$dt = new DateTime(preg_replace("/[\/\.,]/i","-",$dateString));
	}
	$out = '';
	$skip = false;
	for($i=0; $i<mb_strlen($format); $i++) {
		$c = mb_substr($format,$i,1);
		switch($c) {
			case 'd':
			case 'D':
			case 'j':
			case 'l':
			case 'N':
			case 'S':
			case 'w':
			case 'z':
			case 'W':
			case 't':
				if($_day[2]) {
					$out .= $c;
					$skip = false;
				} else {
					$skip = true;
				}
				break;
			case 'F':
			case 'm':
			case 'M':
			case 'n':
				if($_day[1]) {
					$out .= $c;
					$skip = false;
				} else {
					$skip = true;
				}
				break;
			case 'L':
			case 'o':
			case 'Y':
			case 'y':
				if($_day[0]) {
					$out .= $c;
					$skip = false;
					if($c == 'Y') $year_pretty = true;
				} else {
					$skip = true;
				}
				break;
			case 'a':
			case 'A':
			case 'B':
			case 'g':
			case 'G':
			case 'h':
			case 'H':
			case 'e':
			case 'I':
			case 'O':
			case 'P':
			case 'T':
			case 'Z':
				if($_time[0]) {
					$out .= $c;
					$skip = false;
				} else {
					$skip = true;
				}
				break;
			case 'i':
				if($_time[1]) {
					$out .= $c;
					$skip = false;
				} else {
					$skip = true;
				}
				break;
			case 's':
			case 'u':
				if($_time[2]) {
					$out .= $c;
					$skip = false;
				} else {
					$skip = true;
				}
				break;
			case 'c':
			case 'r':
				$out .= $c;
				$skip = false;
				break;
			case ' ':
				$out .= ' ';
				break;
			default:
				if($skip == false) $out .= $c;
				break;
		}
	}
	if( $year_pretty == true ) {
		$out = str_replace("Y",$year,$out);
	}
	return $dt->format(trim($out));
}
?>
