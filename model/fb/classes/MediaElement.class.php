<?php
require_once dirname(__FILE__)."/ExternalApi.class.php";
class MediaElement {

	function MediaElement($config) {
		$this->config = $config;
	}

	function setTypes($url) {
		$obj = new stdClass;
		$obj->url = $url;
		$uri = parse_url($url);
		if($uri['query']) {
			parse_str($uri['query'],$urlvars);
		}

		$ext = strtolower(substr(strrchr($uri['path'],'.'),1));
		if(eregi("div class='twitter'",$url)) {
			$obj->type = 'twitter-ready';
		} else if(eregi('(www.)?youtube|youtu\.be',$url)) {
			$obj->type = 'youtube';
			if($urlvars['v']) {
				if($urlvars['v']) $obj->id = $urlvars['v'];
			} else if(eregi('\/embed\/',$url)) {
				$_parsed = split('embed\/',$url);
				$_parsed2 = preg_split('/[?&]/',$_parsed[1]);
				$obj->id = $_parsed2[0];
			} else {
				$_parsed = preg_split('/v\/|v=|youtu\.be\//',$url);
				$_parsed2 = preg_split('/[?&]/',$_parsed[1]);
				$obj->id = $_parsed2[0];
			}
			if($urlvars['t']) $obj->start = $urlvars['t'];
			if($urlvars['hd']) $obj->hd = $urlvars['hd'];
		} else if(eregi('(player.)?vimeo\.com',$url)) {
			$obj->type = 'vimeo';
			$_parsed = preg_split('/video\/|\/\/vimeo\.com\//',$url);
			$_parsed2 = preg_split('/[?&]/',$_parsed[1]);
			$obj->id = $_parsed2[0];
		} else if(eregi('(www.)?dailymotion\.com',$url)) {
			$_parsed = preg_split('/video\/|\/\/dailymotion\.com\//',$url);
			$obj->id = $_parsed[1];
			$obj->type = 'dailymotion';
		} else if(eregi('(player.)?soundcloud\.com',$url)) {
			$obj->type = "soundcloud";
			$obj->id = $url;
		} else if(eregi('(www.)?twitter\.com',$url) && eregi("status",$url)) {
			if(eregi("status\/",$url)) {
				$_parsed = split("status\/",$url);
				$obj->id = $_parsed[1];
			} else if(eregi("statuses\/",$url)) {
				$_parsed = split("statuses\/",$url);
				$obj->id = $_parsed[1];
			} else {
				$obj->id = "";
			}
			$obj->type = "twitter";
		} else if(eregi("maps.google",$url) && !eregi("staticmap",$url)) {
			$obj->type = "google-map";
			$_parsed = preg_split('/src=[\'|"][^\'|"]*?[\'|"]/i',$url);
			$obj->id = $_parsed[0];
		} else if(eregi("plus.google",$url)) {
			$obj->type = "googleplus";
			$_parsed = preg_split('/posts/',$url);
			$obj->id = $_parsed[1];
			if(eregi("u/0/",$_parsed[0])) {
				$_parsed = split("u/0/",$url);
				$_parsed2 = split("/posts",$_parsed[1]);
				$obj->user = $_parsed2[0];
			} else {
				$_parsed = split("google.com/",$url);
				$_parsed2 = preg_split("/posts/",$_parsed[1]);
				$obj->user = $_parsed2[0];
			}
		} else if(eregi("flickr.com/photos",$url)) {
			$obj->type = "flickr";
			$_parsed = split("photos\/",$url);
			$_parsed2 = split("/",$_parsed[1]);
			$obj->id = $_parsed2[1];
			$obj->link = $obj->url;
		} else if(eregi("instagr.am/p/",$url)) {
			$obj->type = "instagram";
			$obj->link = $obj->url;
			$_parsed = split("\/p\/",$url);
			$_parsed2 = split("/",$_parsed[1]);
			$obj->id = $_parsed[0];
		} else if(in_array($ext,array("jpg","jpeg","png","gif")) || eregi("staticmap",$url) || eregi("yfrog.com",$url) || eregi("witpic.com",$url)) {
			$obj->type = "image";
			$obj->id = $url;
		} else if(in_array($ext,array("doc","docx","xls","xlsx","ppt","pptx","pdf","pages","ai","psd","tiff","dxf","svg","eps","ps","ttf","xps","zip","rar")) || eregi("docs.google.com",$url)) {
			$obj->type = "googledoc";
			$obj->id = $url;
		} else if(eregi("(www.)?wikipedia\.org",$url)) {
			$obj->type = "wikipedia";
			$_parsed = split("wiki\/",$url);
			$_parsed2 = split("#",$_parsed[1]);
			$wiki_id = str_replace("_"," ",$_parsed2[0]);
			$obj->id = str_replace(" ","%20",$wiki_id);
			$_parsed = split("//",$url);
			$_parsed2 = split(".wikipedia",$_parsed[1]);
			$obj->lang = $_parsed2[0];
		} else if(substr($url,0,7) == "http://") {
			$obj->type = "website";
			$obj->id = $obj->url;
		} else if(eregi("storify",$url)) {
			$obj->type = "storify";
			$obj->id = $obj->url;
		} else if(eregi("blockquote",$url)) {
			$obj->type = "quote";
			$obj->id = $obj->url;
		} else {
			$obj->type = "unknown";
			$obj->id = $obj->url;
		}
		return $obj;
	}

	function createMediaElement($asset,$link="") {
		$JNTimeLine_ExternalApi = new JNTimeLine_ExternalApi($this->config);
		$mediaType = $this->setTypes($asset['media']);
		switch($mediaType->type) {
			case "image":
				$mediaType->id = str_replace("https://","http://",$mediaType->id);
				$_size = getimagesize($mediaType->id);
				$image_width = $_size[0];
				$image_height = $_size[1];
				$html = "<figure class=\"figure\">".($link ? "<a href=\"".$link."\" title=\"".$data['asset']['credit']."\">" : "")."<img src='".$mediaType->id."' alt=\"".$data['asset']['credit']."\" width='".$this->config['width']."' height='".(int)($this->config['width'] * $image_height / $image_width)."' />".($link ? "</a>" : "")."</figure>";
				break;
			case "flickr":
				$html = "<figure class=\"figure flickr\">".$JNTimeLine_ExternalApi->flickr($mediaType)."</figure>";
				break;
			case "instagram":
				$html = "<figure class='figure'>".$JNTimeLine_ExternalApi->instagram($mediaType->id)."</figure>";
				break;
			case "googledoc":
				$html = "<figure class='figure'>".$JNTimeLine_ExternalApi->googledocs($mediaType)."</figure>";
				break;
			case "dailymotion":
				$html = "<figure class='figure'><iframe class='media-frame video dailymotion' autostart='false' frameborder='0' width='100%' height='100%' src='http://www.dailymotion.com/embed/video/".$mediaType->id."'></iframe></figure>";
				break;
			case "youtube";
				$html = "<figure id='youtube_".$mediaType->id."' class='figure youtube'>".$JNTimeLine_ExternalApi->youtube($mediaType)."</figure>";
				break;
			case "vimeo":
				$html = "<figure id='vimeo_".$mediaType->id."' class='figure vimeo'>".$JNTimeLine_ExternalApi->vimeo($mediaType)."</figure>";
				break;
			case "twitter";
				$html = "<figure class='figure twitter'>".$JNTimeLine_ExternalApi->twitter($mediaType->id)."</figure>";
				break;
			case "soundcloud";
				$html = "<figure id='".preg_replace('/[\.\/]/i','_',eregi_replace("http:\/\/","",$mediaType->id))."' class='figure soundcloud'>".$JNTimeLine_ExternalApi->soundcloud($mediaType)."</figure>";
				break;
			case "google-map";
				$html = "<figure class='figure googlemaps'>".$JNTimeLine_ExternalApi->googlemaps($mediaType)."</figure>";
				break;
			case "googleplus";
				$html = "<figure class='figure'>".$JNTimeLine_ExternalApi->googleplus($mediaType)."</figure>";
				break;
			case "wikipedia";
				$html = "<figure class='figure'>".$JNTimeLine_ExternalApi->wikipedia($mediaType)."</figure>";
				break;
			case "storify";
			case "quote";
				$html = "<figure class='figure'>".$mediaType->id."</figure>";
				break;
			case "website":
				$html = "<figure class='figure website'>".$JNTimeLine_ExternalApi->website($mediaType)."</figure>";
				break;
		}
		return $html;
	}
}
