<?php
require_once dirname(__FILE__)."/../conf/config.php";
if(!isset($_GET['taogiauth'])) exit;
if($_GET['taogiauth'] != $timelineConfig['taogiauth']) exit;
if(!isset($_GET['type'])) exit;

switch($_GET['type']) {
	case 'twitter':
		session_start();
		require_once(dirname(__FILE__)."/twitteroauth/twitteroauth/twitteroauth.php"); //Path to twitteroauth library
 
		define('CONSUMER_KEY','v6PnW09cC378Kjf3bkM0Eg');
		define('CONSUMER_SECRET','uQ2B9SPioklwaXtZMYlaBSnVWtzXoBW2Jg3rlz10');
		define('ACCESS_TOKEN','56759477-dZXCIJksi7qzi3qNqIfc9nsxlcvIzVGKUaqXhowlC');
		define('ACCESS_TOKEN_SECRET','dYUwzNGMxU6pT0YDtdDkSjLSLslk1n1XT0FdUv7ukKgyZ');
		$connection = new TwitterOAuth(CONSUMER_KEY,CONSUMER_SECRET,ACCESS_TOKEN,ACCESS_TOKEN_SECRET);

		$query_sample = array(
			'endpoint' => 'https://api.twitter.com/1.1/statuses/oembed.json',
			'url' => 'https://twitter.com/jinbonet/status/434194614690398209',
		);
		$query_array = $_GET ? $_GET : $query_sample;
		foreach($query_array as $key => $value){
			if($key != 'endpoint'){
			$query_array_filtered[] = $key.'='.urlencode($value);
			}
		}
		$query = urldecode($query_array['endpoint']).'?'.implode('&',$query_array_filtered);
		$result = $connection->get($query);
		echo json_encode($result);
		break;
	case 'rigvedawiki':
		require_once dirname(__FILE__)."/../classes/getSource.class.php";
		$gS = new JNTimeLine_getSource($timelineConfig);
		$html = $gS->getSource($_GET['url']);
		$doc = new DOMDocument();
		@$doc->loadHTML($html);
		$classname = 'section';
		$finder = new DomXPath($doc);
		$nodes = $finder->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' $classname ')]");
		foreach ($nodes as $node) {
			$s = $node->nodeValue;
			$s = preg_replace('/<h[1-6](.*?)>(.*?)<\/h[1-6]>/is', '', $s);
			$result['section'] = strip_tags($s);
			break;
		}
		$bodies = $doc->getElementsByTagName('body');
		$result['content'] = strip_tags($bodies->item(0)->nodeValue);
		header("Content-Type: text/json; charset=utf-8");
		echo json_encode($result);
		break;
	case 'og':
		require_once dirname(__FILE__)."/../classes/getSource.class.php";
		$gS = new JNTimeLine_getSource($timelineConfig);
		$html = $gS->getSource($_GET['url']);
		if (preg_match('~^content-type: .+?/[^;]+?(.*)/~', $html, $matches)) {
			if (preg_match_all('~;\\s?(?P<key>[^()<>@,;:\"/[\\]?={}\\s]+)'.
					'=(?P<value>[^;"\\s]+|"[^;"]+")\\s*~i', $matches[1], $m)) {
				for ($i = 0; $i < count($m['key']); $i++) {
					if (strtolower($m['key'][$i]) == "charset") {
						$charset = trim($m['value'][$i], '"');
					}
				}
			}
		}
		if(!$charset) {
			if (preg_match('/<meta([^>]*)charset=([\'"])?([^"\';\/]+)([^>]*)>/i', $html, $matches)) {
				$charset = $matches[3];
			}
			$html = preg_replace('/<meta([^>]*)charset=([\'"])?([^"\']+)([^>]*)>/i','<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />',$html);
		}
		if($charset != "utf-8") {
			$html = str_replace($charset,"utf-8",$html);
			if($charset == "euc-kr") $charset = "euckr";
			$html = @mb_convert_encoding($html,'utf-8',$charset);
		}
		$html = preg_replace('/<title(.*?)>(.*?)<\/title>/is', '', $html);
		$html = preg_replace('/<script(.*?)>(.*?)<\/script>/is', '', $html);
		$html = str_replace('\\"', "&quot;", $html);
		if(preg_match_all('~<\s*meta\s+property="((og|twitter):[^"]+)"\s+content="([^"]*)~i', $html, $matches)) {
			for($c=0; $c<@count($matches[1]); $c++) {
				switch ($matches[1][$c]) {
					case 'og:title':
					case 'twitter:title':
						$og['title'] = $matches[3][$c];
						break;
					case 'og:description':
					case 'twitter:description':
						$og['description'] = $matches[3][$c];
						break;
					case 'og:site_name':
					case 'twitter:creator':
						$og['name'] = $matches[3][$c];
						break;
					case 'og:image':
					case 'twitter:image:src':
						$og['image'] = $matches[3][$c];
						break;
					default:
						break;
				}
			}
		}
		header("Content-type: text/json; charset=utf-8");
		echo json_encode($og);
		break;
	case 'proxy':
		include_once(dirname(__FILE__).'/php-proxy/proxy.php');

		$_url = parse_url(rawurldecode($_GET['url']));
		$taogi_proxy_config['server'] = $_url['host'];
		if($_url['port']) $$taogi_proxy_config['server'] = $_url['port'];
		$url = $_url['path'];
		if($_url['query']) $url .= "?".$_url['query'];
		if($_url['fragment']) $url .= "#".$_url['fragment'];
		if($_GET['skip_referer'] == 1) $taogi_proxy_config['skip_referer'] = 1;
		$proxy = new Proxy();
		$proxy->forward($url);
		break;
	case 'url':
	default:
		require_once dirname(__FILE__)."/../classes/getSource.class.php";
		$gS = new JNTimeLine_getSource($timelineConfig);
		$result = $gS->getSource($_GET['url']);
		header("Content-Type: text/html; charset=utf-8");
		echo $result;
		break;
}
?>
