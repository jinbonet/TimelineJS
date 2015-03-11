<?php
function _sortByDateAsc($a,$b) {
	if($a['date'] > $b['date']) return 1;
	else if($a['date'] < $b['date']) return -1;
	else return 0;
}

function _sortByDateDesc($a,$b) {
	if($a['date'] < $b['date']) return 1;
	else if($a['date'] > $b['date']) return -1;
	else return 0;
}

class JNTimeLine_Data {
	private static $use_proxy;

	public static function getJson($data,$order="asc") {
		$json = json_decode($data,true);
		if(!$json) {
			require_once dirname(__FILE__)."/JSON.php";

			$jsonParser = new Services_JSON(SERVICES_JSON_IN_ARR);
			$json = json_decode(json_encode($jsonParser->decode($data)),true);
			if(!$json) {
				$json = json_decode(json_encode(jsinit_decode($data)),true);
			}
		}
		$datalist = $json['timeline']['date'];
		for($i=0; $i<@count($datalist); $i++) {
			$datalist[$i]['date'] = JNTimeLine_TimeToString($datalist[$i]['startDate']);
//			$datalist[$i]['date'] = ($i+1);
			if(!$datalist[$i]['unique'])
				$datalist[$i]['unique'] = trim(strtr(base64_encode(hash('crc32',$datalist[$i]['startDate']." ".$datalist[$i]['headline'], true)), '+/=', '-_ '));
		}

		if($order == "asc") {
//			usort($datalist,array(self,'_sortByDateAsc'));
			usort($datalist,'_sortByDateAsc');
		} else {
//j			usort($datalist,array(self,'_sortByDateDesc'));
			usort($datalist,'_sortByDateDesc');
		}
		unset($json['timeline']['date']);
		$json['timeline']['date'] = $datalist;
		if(!$json['timeline']['startDate']) {
			if($json['timeline']['era']['startDate']) $json['timeline']['startDate'] = $json['timeline']['era']['startDate'];
			else $json['timeline']['startDate'] = $datalist[0]['startDate'];
		}
		if(!$json['timeline']['endDate']) {
			if($json['timeline']['era']['endDate']) $json['timeline']['endDate'] = $json['timeline']['era']['endDate'];
			else $json['timeline']['endDate'] = $datalist[@count($datalist)-1]['startDate'];
		}

		return $json;
	}

	public static function getGoogleSpreed($data,$order="asc") {
		$_data = json_decode($data,true);

		$entry = $_data['feed']['entry'];
		$datalist = array();
		if(!@count($entry)) return null;
		for($i=0; $i<@count($entry); $i++) {
			$dd = $entry[$i];
			$type = "";

			if($dd['gsx$type']) {
				$type = $dd['gsx$type']['$t'];
			} else if($dd['gsx$titleslide']) {
				$type = $dd['gsx$titleslide']['$t'];
			}
			if(eregi("start",$type) || eregi("title",$type)) {
				$json['timeline']['startDate'] = $dd['gsx$startdate']['$t'];
				$json['timeline']['headline'] = $dd['gsx$headline']['$t'];
				$json['timeline']['asset']['media'] = $dd['gsx$media']['$t'];
				$json['timeline']['asset']['caption'] = $dd['gsx$mediacaption']['$t'];
				$json['timeline']['asset']['credit'] = $dd['gsx$mediacredit']['$t'];
				$json['timeline']['text'] = $dd['gsx$text']['$t'];
				$json['timeline']['type'] = 'google spreadsheet';
			} else if(eregi("era",$type)) {
				if(!$json['timeline']['era']) $json['timeline']['era'] = array();
				$json['timeline']['era'][] = array(
					'startDate' => $dd['gsx$startdate']['$t'],
					'endDate' => $dd['gsx$enddate']['$t'],
					'headline' => $dd['gsx$headline']['$t'],
					'text' => $dd['gsx$text']['$t'],
					'tag' => $dd['gsx$tag']['$t']
				);
			} else {
				$datalist[] = array(
					'type' => $dd['gsx$startdate']['$t'],
					'startDate' => $dd['gsx$startdate']['$t'],
					'endDate' => $dd['gsx$enddate']['$t'],
					'headline' => $dd['gsx$headline']['$t'],
					'text' => $dd['gsx$text']['$t'],
					'tag' => $dd['gsx$tag']['$t'],
					'unique' => $dd['gsx$startdate']['$t'].' '.$dd['gsx$headline']['$t'],
					'asset' => array(
						'media' => $dd['gsx$media']['$t'],
						'credit' => $dd['gsx$mediacredit']['$t'],
						'caption' => $dd['gsx$mediacaption']['$t'],
						'thumbnail' => $dd['gsx$mediathumbnail']['$t']
					)
				);
			}
		}
		if($order == "asc") {
			usort($datalist,array(self,'_sortByDateAsc'));
		} else {
			usort($datalist,array(self,'_sortByDateDesc'));
		}
		$json['timeline']['date'] = $datalist;

		return $json;
	}

	public static function getGoogleCells($data) {
		$_data = json_decode($data,true);

		$entry = $_data['feed']['entry'];
		$datalist = array();
		if(!@count($entry)) return null;

		for($i=0; $i<@count($entry); $i++) {
			$dd = $entry[$i];
			$type = "";
			$column_name = "";
			$cell = array(
				'content' => $dd['gs$cell']['$t'],
				'col' => $dd['gs$cell']['col'],
				'row' => $dd['gs$cell']['row'],
				'name' => ''
			);

			if($cell['row'] == 1) {
				$cellnames = array();
				if($cell['content'] == "Start Date") {
					$column_name = "startDate";
				} else if($cell['content'] == "End Date") {
					$column_name = "endDate";
				} else if($cell['content'] == "Headline") {
					$column_name = "headline";
				} else if($cell['content'] == "Text") {
					$column_name = "text";
				} else if($cell['content'] == "Media") {
					$column_name = "media";
				} else if($cell['content'] == "Media Credit") {
					$column_name = "credit";
				} else if($cell['content'] == "Media Caption") {
					$column_name = "caption";
				} else if($cell['content'] == "Media Thumbnail") {
					$column_name = "thumbnail";
				} else if($cell['content'] == "Type") {
					$column_name = "type";
				} else if($cell['content'] == "Tag") {
					$column_name = "tag";
				}

				$cellnames[] = $column_name;
			} else {
				$cell['name'] = $cellnames[$cell['col']];
				$lists[$cell['row']][$cell['name']] = $cell['content'];
			}
		}

		$datalist = array();
		foreach($lists as $row => $data) {
			if(eregi("start",$data['type']) || eregi("title",$data['type'])) {
				$json['timeline'] = array(
					'startDate' => $data['startDate'],
					'headline' => $data['headline'],
					'asset' => array(
						'media' => $data['media'],
						'caption' => $data['caption'],
						'credit' => $data['credit'],
					),
					'text' => $data['text'],
					'type' => 'google spreadsheet'
				);
			} else if(eregi("era",$data['type'])) {
				if(!$json['timeline']['era']) $json['timeline']['era'] = array();
				$json['timeline']['era'][] = array(
					'startDate' => $data['startDate'],
					'endDate' => $data['endDate'],
					'headline' => $data['headline'],
					'text' => $data['text'],
					'tag' => $dd['tag']
				);
			} else {
				$datalist[] = array(
					'type' => "google spreadsheet",
					'startDate' => $data['startDate'],
					'endDate' => $data['endDate'],
					'headline' => $data['headline'],
					'text' => $data['text'],
					'tag' => $data['tag'],
					'unique' => $data['startDate']." ".$data['headline'],
					'asset' => array (
						'media' => $data['media'],
						'credit' => $data['credit'],
						'caption' => $data['caption'],
						'thumbnail' => $data['thumbnail']
					)
				);
			}
		}
		if($order == "asc") {
			usort($datalist,array(self,'_sortByDateAsc'));
		} else {
			usort($datalist,array(self,'_sortByDateDesc'));
		}
		$json['timeline']['date'] = $datalist;

		return $json;
	}

	public static function csvToArray($fileContent,$delimiter=",",$escape = '\\', $enclosure = '"') {
		$lines = array();
		$fields = array();
	
		if($escape == $enclosure) {
			$escape = '\\';
			$fileContent = str_replace(array('\\',$enclosure.$enclosure,"\r\n","\r"),
			array('\\\\',$escape.$enclosure,"\\n","\\n"),$fileContent);
		} else
			$fileContent = str_replace(array("\r\n","\r"),array("\\n","\\n"),$fileContent);

		$nb = strlen($fileContent);
		$field = '';
		$inEnclosure = false;
		$previous = '';

		for($i = 0;$i<$nb; $i++) {
			$c = $fileContent[$i];
			if($c === $enclosure) {
				if($previous !== $escape)
					$inEnclosure ^= true;
				else
					$field .= $enclosure;
			} else if($c === $escape) {
				$next = $fileContent[$i+1];
				if($next != $enclosure && $next != $escape)
					$field .= $escape;
			} else if($c === $delimiter) {
				if($inEnclosure)
					$field .= $delimiter;
				else {
					//end of the field
					$fields[] = $field;
					$field = '';
				}
			} else if($c === "\n") {
				if($inEnclosure)
					$field .= $c;
				else {
					$fields[] = $field;
					$field = '';
					$lines[] = $fields;
					$fields = array();
				}
			} else
				$field .= $c;
			$previous = $c;
		}
		//we add the last element
		if(true || $field !== '') {
			$fields[] = $field;
			$lines[] = $fields;
		}
		return $lines;
	}

	public static function csvArrayIndex($lines,$order="asc") {
		for($i=0; $i<@count($lines[0]); $i++) {
			$fieldName[$i] = strtolower($lines[0][$i]);
		}
		$datalist = array();
		for($i=1; $i<@count($lines); $i++) {
			if($lines[$i][0]) {
				unset($data);
				for($j=0; $j<@count($lines[$i]); $j++) {
					switch($fieldName[$j]) {
						case 'start date':
							$data['startDate'] = $lines[$i][$j];
							$data['date'] = JNTimeLine_TimeToString($lines[$i][$j]);
							break;
						case 'end date':
							$data['endDate'] = $lines[$i][$j];
							break;
						case 'headline':
							$data['headline'] = $lines[$i][$j];
							break;
						case 'text':
							$data['text'] = $lines[$i][$j];
							break;
						case 'media':
							$data['asset']['media'] = $lines[$i][$j];
							break;
						case 'media credit':
							$data['asset']['credit'] = $lines[$i][$j];
							break;
						case 'media caption':
							$data['asset']['caption'] = $lines[$i][$j];
							break;
						case 'media thumbnail':
							$data['asset']['thumbnail'] = $lines[$i][$j];
							break;
						case 'type':
							$data['type'] = $lines[$i][$j];
							break;
						case 'tag':
							$data['tag'] = $lines[$i][$j];
							break;
						case 'url':
							$data['url'] = $lines[$i][$j];
							break;
					}
				}
				if(!$data['date']) continue;
				$datalist[] = $data;
			}
		}
		if($order == "asc") {
			usort($datalist,array(self,'_sortByDateAsc'));
		} else {
			usort($datalist,array(self,'_sortByDateDesc'));
		}
		return $datalist;
	}

	function _sortByDateAsc($a,$b) {
		if($a['date'] > $b['date']) return 1;
		else if($a['date'] < $b['date']) return -1;
		else return 0;
	}

	function _sortByDateDesc($a,$b) {
		if($a['date'] < $b['date']) return 1;
		else if($a['date'] > $b['date']) return -1;
		else return 0;
	}
}
