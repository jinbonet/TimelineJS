<?php
$config['width'] = 400;
$MediaElement = new MediaElement($config);
?>
	<div id="carousel-timeline" class="touchcarousel">
		<ul class="touchcarousel-container">
<?php	if($timeline) {?>
			<li class="touchcarousel-item">
				<article class="item-block">
					<time pubdate datetime="<?php print JNTimeLine_prettyTime($timeline['startDate']); ?>" title="<?php print JNTimeLine_prettyTime($timeline['startDate']); ?>" class="pubdate"><?php print JNTimeLine_prettyTime($timeline['startDate']); ?></time>
					<h2 class="title"><?php print $timeline['headline']; ?></h2>
					<p class="description"><?php print $timeline['text']; ?></p>
					<div class="figure_box">
						<?php print $MediaElement->createMediaElement($timeline['asset']); ?>
					</div>
				</article>
			</li>
<?php	}?>
<?php	for($i=0; $i<@count($datalist); $i++) {?>
			<li class="touchcarousel-item">
				<article class="item-block">
					<time pubdate datetime="<?php print JNTimeLine_prettyTime($datalist[$i]['startDate']); ?>" title="<?php print JNTimeLine_prettyTime($datalist[$i]['startDate']); ?>" class="pubdate"><?php print JNTimeLine_prettyTime($datalist[$i]['startDate']); ?></time>
					<h2 class="title"><?php if($datalist[$i]['permalink']) {?><a href="<?php print $datalist[$i]['permalink']; ?>" title="<?php print htmlspecialchars($datalist[$i]['headline']); ?>"><?php } print $datalist[$i]['headline']; if($datalist[$i]['permalink']) {?></a><?php }?></h2>
					<p class="description"><?php print $datalist[$i]['text']; ?></p>
					<div class="figure_box">
						<?php print $MediaElement->createMediaElement($datalist[$i]['asset']); ?>
					</div>
				</article>
			</li>
<?php	}?>
		</ul>
	</div>
