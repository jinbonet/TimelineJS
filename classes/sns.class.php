<?php
class JNTimeLine_SNS {
	private $timeline;
	private $name;
	private $config;
	private $url;

	public function JNTimeLine_SNS($timeline,$config,$url) {
		global $_service_name;
		$this->name = $_service_name;
		$this->timeline = $timeline;
		$this->config = $config;
		$this->url = $url;
	}

	public function sns_share_button($content) {
		if($content) {
			$pos = stripos($content,"</head>");
			$content = substr($content,0,$pos).$this->sns_header()."\t".substr($content,$pos);
			$content = preg_replace("/<body([^>]*)>/i","<body${1}>\n".$this->sns_body_header(),$content);
			$content = preg_replace("/<div([^>]*)id=\"timeline_sns_share_widget\"([^>]*)>([^<]*)<\/div>/i","<div ${1}id=\"timeline_sns_share_widget\"${2}>${3}".$this->sns_button_box()."</div>",$content);
		}
		return $content;
	}

	public function sns_header() {
		ob_start(); ?>
		<!-- facebook api -->
		<meta property="fb:app_id" content="<?php print $this->config['fb_app']; ?>"/>
		<meta property="og:title" content="<?php print htmlspecialchars($this->timeline['headline']); ?>"/>
		<meta property="og:type" content="Article"/>
		<meta property="og:url" content="<?php print $this->url; ?>"/>
<?php if($this->timeline['asset']['media']) {?>
		<meta property="og:image" content="<?php print $this->timeline['asset']['media']; ?>"/>
<?php }?>
		<meta property="og:author" content="<?php print $this->name; ?>"/>
		<!-- google plus meta -->
		<meta itemprop="name" content="<?php print htmlspecialchars($this->timeline['headline']); ?>">
<?php if($this->timeline['text']) {?>
		<meta itemprop="description" content="<?php print htmlspecialchars(strip_tags($this->timeline['text'])); ?>">
<?php }
	if($this->timeline['asset']['media']) {?>
		<meta itemprop="image" content="<?php print $this->timeline['asset']['media']; ?>">
<?php }?>
		<script type="text/javascript">
			window.___gcfg = {lang: 'ko'};

			(function() {
				var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
				po.src = 'https://apis.google.com/js/plusone.js';
				var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
			})();
		</script>
<?php
		$content = ob_get_contents();
		ob_end_clean();

		return $content;
	}

	public function sns_body_header() {
		ob_start();?>
		<div id="fb-root"></div>
		<script>(function(d, s, id) {
			var js, fjs = d.getElementsByTagName(s)[0];
			if (d.getElementById(id)) return;
			js = d.createElement(s); js.id = id;
			js.src = "//connect.facebook.net/ko_KR/all.js#xfbml=1&appId=<?php print $this->config['fb_app']; ?>";
			fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));</script>
<?php
		$content = ob_get_contents();
		ob_end_clean();

		return $content;
	}

	public function sns_button_box() {
		ob_start(); ?>
		<ul class="share-box">
			<li class="fb">
				<div class="fb-like" data-href="<?php print $this->url; ?>" data-send="true" data-width="470" data-show-faces="true"></div>
			</li>
			<li class="twitter">
				<a href="https://twitter.com/share" class="twitter-share-button" data-url="<?php print $this->url; ?>" data-lang="ko">트윗하기</a>
				<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>
			</li>
			<li class="google">
				<g:plusone size="medium" href="<?php print $this->url; ?>"></g:plusone>
			</li>
		</ul>
<?php
		$content = ob_get_contents();
		ob_end_clean();

		return $content;
	}
}	
?>
