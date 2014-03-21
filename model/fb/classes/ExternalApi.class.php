<?php
require_once dirname(__FILE__)."/Aes.class.php";
class JNTimeLine_ExternalApi {
	var $api_key;

	function JNTimeLine_ExternalApi($config) {
		$this->config = $config;
		$this->api_key = $this->config['api_key'];
		$this->api_key['google'] = AesCtr::decrypt($this->api_key['google'],$this->api_key['pt'],256);
		$this->api_key['flickr'] = AesCtr::decrypt($this->api_key['flickr'],$this->api_key['pt'],256);
	}

	function twitter($mid) {
		$url = "http://api.twitter.com/1/statuses/show.json?id=".$mid."&include_entities=true&callback=?";
		$json = $this->get_json($url);
		if($json) {
			$twit = "<div class='twitter'><blockquote><p>".$this->linkify_twitter_status($json['text'],"_blank")."</p></blockquote>";
			$twit .= "<div class='vcard author'>";
			$twit .= "<a class='screen-name url' href='https://twitter.com/".$json['user']['screen_name']."' data-screen-name='".$json['user']['screen_name']."' target='_blank'>";
			$twit .= "<span class='avatar'><img src='".$json['user']['profile_image_url']."' alt='' /></span>";
			$twit .= "<span class='fn'>".$json['user']['name']."</span>";
			$twit .= "<span class='nickname'>@".$json['user']['screen_name']."<span class='thumbnail-inline'></span></span>";
			$twit .= "</a>";
			$twit .= "</div>";

			if($json['entities']['media']) {
				if($json['entities']['media'][0] == 'photo') {
					$twit .= "<img src=\"".$twit['entities']['media'][0]['media_url']."\" alt='' />";
				}
			}
			$twit .= "</div>";
		}

		return $twit;
	}

	function googlemaps($media) {
		$html = '<iframe width="'.$this->config['width'].'" height="'.$this->config['width'].'" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="'.eregi_replace("&","&amp;",$media->id).'&amp;output=embed"></iframe><br /><small><a href="'.$media->id.'&source=embed" style="color:#0000FF;text-align:left">View Larger Map</a></small>';
		return $html;
	}

	function googleplus($media) {
		$gperson_api_url = "https://www.googleapis.com/plus/v1/people/".$media->user."/activities/public?alt=json&maxResults=100&fields=items(id,url)&key=".$this->api_key['google'];

		$json = $this->get_json($gperson_api_url);
		for($i=0; $i<@count($json); $i++) {
			$_parsed = split("posts\/",$json[$i]['url']);
			if($_parsed[1] == $media->activity) {
				$g_activity = $json[$i]['id'];
				$gactivity_api_url = "https://www.googleapis.com/plus/v1/activities/".$g_activity."?alt=json&key=".$this->api_key['google'];

				$a_data = $this->get_json($gactivity_api_url);
				if($a_data) {
					if($a_data['annotation']) {
						$g_content .= "<div class='googleplus-annotation'>'".$a_data['annotation']."</div>";
						$g_content .= $a_data['object']['content'];
					} else {
						$g_content .= $a_data['object']['content'];
					}

					if($a_data['object']['attachments']) {
						for($k=0; $k<@count($a_data['object']['attachments']); $k++) {
							if($a_data['object']['attachments'][$k]['objectType'] == 'photo') {
								$g_attachments = "<a href=\"".$a_data['object']['url']."\" target='_blank'><img src=\"".$a_data['object']['attachments'][$k]['image.url']."\" class='article-thumb'></a>".$g_attachments;
							} else if($a_data['object']['attachments'][$k]['objectType'] == "video") {
								$g_attachments =   "<img src='".$a_data['object']['attachments'][$k]['image.url']."' class='article-thumb'>".$g_attachments;
								$g_attachments .=  "<div>";
								$g_attachments .=  "<a href='".$a_data['object']['attachments'][$k]['url']."' target='_blank'>";
								$g_attachments .=  "<h5>".$a_data['object']['attachments'][$k]['displayName']."</h5>";
								$g_attachments .=  "</a>";
								$g_attachments .=  "</div>";
							} else if($a_data['object']['attachments'][$k]['objectType'] == "article") {
								$g_attachments .=  "<div>";
								$g_attachments .=  "<a href='".$a_data['object']['attachments'][$k]['url']."' target='_blank'>";
								$g_attachments .=  "<h5>".$a_data['object']['attachments'][$k]['displayName']."</h5>";
								$g_attachments .=  "<p>".$a_data['object']['attachments'][$k]['content']."</p>";
								$g_attachments .=  "</a>";
								$g_attachments .=  "</div>";
							}
						}
						$g_attachments = "<div class='googleplus-attachments'>".$g_attachments."</div>";
					}
					$mediaElem =   "<div class='googleplus-content'>".$g_content.$g_attachments."</div>";
					$mediaElem .=  "<div class='vcard author'><a class='screen-name url' href='".$a_data['url']."' target='_blank'>";
					$mediaElem .=  "<span class='avatar'><img src='".$a_data['actor']['image']['url']."' style='max-width: 32px; max-height: 32px;' /></span>";
					$mediaElem .=  "<span class='fn'>".$a_data['actor']['displayName']."</span>";
					$mediaElem .=  "<span class='nickname'><span class='thumbnail-inline'></span></span>";
					$mediaElem .=  "</a></div>";
				}
			}
		}

		return $mediaElem;
	}

	function googledocs($doc) {
		$mediaElem = "";
		if (preg_match("/docs.google.com/i",$doc->id)) {
			$mediaElem = "<iframe class='doc' frameborder='0' width='".$this->config['width']."' height='".$this->config['width']."' src='".$doc->id."&amp;type=view&amp;embedded=true'></iframe>";
		} else {
			$mediaElem = "<iframe class='doc' frameborder='0' width='".$this->config['width']."' height='".$this->config['width']."' src='http://docs.google.com/viewer?url=".$doc->id."&amp;embedded=true'></iframe>";
		}
		return $mediaElem;
	}

	function flickr($flick) {
		$the_url = "http://api.flickr.com/services/rest/?method=flickr.photos.getSizes&api_key=".$this->api_key['flickr']."&photo_id=" .$flick->id."&format=json";

		$data = $this->get_respond($the_url);
		$data = str_replace( 'jsonFlickrApi(', '', $data );
		$data = substr( $data, 0, strlen( $data ) - 1 );
		$json = json_decode($data,true);
		if($json) {
			$parsed = split("photo\/",$json['sizes'][0]['url']);
			$parsed2 = split("/",$parsed[1]);
			$flickr_id = $parsed2[1];

			for($i=0; $i<@count($json['sizes']['size']); $i++) {
				if(eregi("Medium",$json['sizes']['size'][$i]['label'])) {
					$flickr_img_size = $json['sizes']['size'][$i]['source'];
					$flickr_height = (int)($json['sizes']['size'][$i]['height'] * $this->config['width'] / $json['sizes']['size'][$i]['width']);
					break;
				}
			}
			$html = "<img src=\"".$flickr_img_size."\" width=\"".$this->config['width']."\" height=\"".$flickr_height."\" alt='' />";
		}
		return $html;
	}

	function instagram($mid) {
		$html = '<img src="http://instagr.am/p/'.$mid.'/media/?size=l" alt="" />';
		return $html;
	}

	function soundcloud($sound) {
		$the_url = "http://soundcloud.com/oembed?url=".$sound->id."&format=js";
		$data = $this->get_respond($the_url);
		$data = substr( $data, 1 );
		$data = substr( $data, 0, strlen( $data ) - 2 );
		$json = json_decode($data,true);
		if($json) {
			$html = "<div class=\"thumbnail\"><a href='javascript://' onclick=\"playVideoInner('soundcloud',".$this->config['width'].",'".$sound->id."',".($video->start ? $video->start : 0).");\"><img src=\"".$json['thumbnail_url']."\" alt=\"".$json['title']."\" /><i class=\"playbutton\"></i></div>";
			$html .= "<div class=\"desc\"><a href='javascript://' onclick=\"playVideoInner('soundcloud',".$this->config['width'].",'".$sound->id."',".($video->start ? $video->start : 0).");\"><h4>".$json['title']."</h4>";
			$html .= "<cite>www.soundcloud.com</cite>";
			$html .= "<p>".$json['description']."</p></a></div>";
		}
		return $html;
	}

	function wikipedia($api_obj) {
		$the_url = "http://".$api_obj->lang.".wikipedia.org/w/api.php?action=query&prop=extracts&titles=".$api_obj->id."&exintro=1&format=json";
		$json = $this->get_json($the_url);
		if($json['query']) {
			foreach($json['query']['pages'] as $pageid => $page) {
				$wiki_title = $page['title'];
				$wiki_extract = $page['extract'];
				break;
			}
			$wiki_text_array = array();
			if(eregi("<p>",$wiki_extract)) {
				$wiki_text_array = explode("<p>",$wiki_extract);
			} else {
				$wiki_text_array[] = $wiki_extract;
			}

			for($i=0; $i<@count($wiki_text_array); $i++) {
				if($i+1 <= 1&& $i+1 < @count($wiki_text_array)) {
					$wiki_text .= "<p>".$wiki_text_array[$i+1]."</p>";
				}
			}
			$_wiki = "<h4><a href='http://".$this->config['wikipedia']['locale'].".wikipedia.org/wiki/".$wiki_title."' target='_blank'>".$wiki_title."</a></h4>";
			$_wiki .= "<span class'wiki-source'>".$this->config['wikipedia']['message']."</span>";
			$_wiki .= $this->linkify_wikipedia($wiki_text,$api_obj->lang);
		}
		if(!eregi("REDIRECT",$wiki_extract)) return $_wiki;
	}

	function youtube($video) {
		$the_url = "http://gdata.youtube.com/feeds/api/videos/".$video->id."?v=2&alt=jsonc";
		$json = $this->get_json($the_url);
		if($json) {
			$html = "<div class=\"thumbnail\"><a href='javascript://' onclick=\"playVideoInner('youtube',".$this->config['width'].",'".$video->id."',".($video->start ? $video->start : 0).");\"><img src=\"".$json['data']['thumbnail']['sqDefault']."\" alt=\"".$json['data']['title']."\" /><i class=\"playbutton\"></i></a></div>";
			$html .= "<div class=\"desc\"><a href='javascript://' onclick=\"playVideoInner('youtube',".$this->config['width'].",'".$video->id."',".($video->start ? $video->start : 0).");\"><h4>".$json['data']['title']."</h4>";
			$html .= "<cite>www.youtube.com</cite>";
			$html .= "<p>".$json['data']['description']."</p></a></div>";
		}
		return $html;
	}

	function vimeo($video) {
		$the_url = "http://vimeo.com/api/v2/video/".$video->id.".json";
		$json = $this->get_json($the_url);
		if($json) {
			$html = "<div class=\"thumbnail\"><a href='javascript://' onclick=\"playVideoInner('vimeo',".$this->config['width'].",'".$video->id."',".($video->start ? $video->start : 0).");\"><img src=\"".$json[0]['thumbnail_small']."\" alt=\"".$json[0]['title']."\" /><i class=\"playbutton\"></i></div>";
			$html .= "<div class=\"desc\"><a href='javascript://' onclick=\"playVideoInner('vimeo',".$this->config['width'].",'".$video->id."',".($video->start ? $video->start : 0).");\"><h4>".$json[0]['title']."</h4>";
			$html .= "<cite>www.vimeo.com</cite>";
			$html .= "<p>".$json[0]['description']."</p></a></div>";
		}
		return $html;
	}

	function website($obj) {
		$result = $this->get_respond($obj->id);
		if($result) {
			$title = preg_match('/<meta property="og:title" content="(.*?)">/i', $result, $matches) ? $matches[1] : '';
			if(!$title) {
				$title = preg_match('/<title>(.*?)<\/title>/i', $result, $matches) ? $matches[1] : '';
			}
			$description = preg_match('/<meta property="og:description" content="(.*?)">/i', $result, $matches) ? $matches[1] : '';
			if(!$description) {
				$description = preg_match('/<meta name="description" content="(.*?)">/i', $result, $matches) ? $matches[1] : '';
			}
			$image = preg_match('/<meta property="og:image" content="(.*?)">/i', $result, $matches) ? $matches[1] : '';
		}
		if(!$image) {
			$image = "http://pagepeeker.com/thumbs.php?size=m&url=".eregi_replace("http:\/\/","",$obj->id);
		}
		$html = "<div class='thumbnail'><a href='".$obj->id."' target='_blank'><img src='".$image."' alt='".$title."' /></a></div>";
		$html .= "<div class='desc'><a href='".$obj->id."' target='_blank'><h4>".$title."</h4><cite>".$obj->id."</cite>";
		if($description)
			$html .= "<p>".$description."</p>";
		$html .= "</a></div>";

		return $html;
	}

	function get_json($url) {
		$ctx = stream_context_create(array(
			'http' => array(
				'timeout' => 5,
				'user_agent' => 'JNTimeLineBot/1.0 (http://'.$_SERVER['HTTP_HOST'].'/)'
			)
		));
		$json = json_decode(@file_get_contents($url,false,$ctx),true);
		return $json;
	}

	function get_respond($url) {
		$ctx = stream_context_create(array(
			'http' => array(
				'timeout' => 3,
				'user_agent' => 'JNTimeLineBot/1.0 (http://'.$_SERVER['HTTP_HOST'].'/)'
			)
		));
		$response = @file_get_contents($url,0,$ctx);
		return $response;
	}

	function linkify_twitter_status($status_text,$target) {
		// linkify URLs
		$status_text = preg_replace('/(https?:\/\/\S+)/', '<a href="\1" target="'.$target.'">\1</a>', $status_text);

		// linkify twitter users
		$status_text = preg_replace('/(^|\s)@(\w+)/', '\1@<a href="http://twitter.com/\2" target="'.$target.'">\2</a>', $status_text);

		// linkify tags
		$status_text = preg_replace('/(^|\s)#(\w+)/', '\1#<a href="http://search.twitter.com/search?q=%23\2" target="'.$target.'">\2</a>', $status_text);

		return $status_text;
	}

	function linkify_wikipedia($text,$lang) {
		$text = preg_replace("/<i[^>]*>(.*?)<\/i>/i","<a target=\"_blank\" href=\"http://".$lang.".wikipedia.org/wiki/$1\" onclick=\"void(0)\">$1</a>",$text);
		$text = preg_replace("/<i\b[^>]*>/i","",$text);
		$text = preg_replace("/<\/i>/i","",$text);
		$text = preg_replace("/<b\b[^>]*>/i","",$text);
		$text = preg_replace("/<\/b>/i","",$text);

		return $text;
	}
}
?>
