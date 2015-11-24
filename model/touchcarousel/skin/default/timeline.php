<div id="carousel-timeline" class="touchcarousel">
	<ul class="touchcarousel-container">
<?php
	if($timeline) {?>
		<li class="touchcarousel-item cover front">
			<div class="item-container">
				<section class="section article">
					<article class="wrap">
						<h1 class="title"><?php print rtrim($timeline['headline'],"<br>"); ?></h1>
						<div class="description"><?php print rtrim($timeline['text'],"<br>"); ?></div>
						<div class="meta">
							<cite class="author"><?php print $timeline['extra']['author']; ?></cite>
							<?php print $taogi_theme->time($timeline); ?>
						</div>
						<ul class="social">
							<li class="twitter"><a href="https://twitter.com/share?u=<?php print $permalink; ?>&text=<?php print $timeline['headline']; ?>" target="_blank"><span><?php print $lang->_t('share_twitter'); ?></span></a></li>
							<li class="facebook"><a href="https://facebook.com/sharer.php?u=<?php print $permalink; ?>" target="_blank"><span><?php print $lang->_t('share_facebook'); ?></span></a></li>
							<li class="googleplus"><a href="https://plus.google.com/share?url=<?php print $permalink; ?>" target="_blank"><span><?php print $lang->_t('share_googleplus'); ?></span></a></li>
							<li class="kakaotalk"><a href="https://plus.google.com/share?url=" target="_blank"><span><?php print $lang->_t('share_kakaotalk'); ?></span></a></li>
							<li class="embed"><a href="#"><span><?php print $lang->_t('share_embed'); ?></span></a></li>
						</ul>
					</article>
				</section>
			</div>
		</li>
<?php }
	for($i=0; $i<@count($datalist); $i++) {
		if($datalist[$i]['permalink']) $datalist[$i]['headline'] = '<a href="'.$datalist[$i]['permalink'].'" title="'.htmlspecialchars($datalist[$i]['headline']).'" target="_blank">'.rtrim($datalist[$i]['headline'],"<br>").'</a>'; ?>
		<li id="<?php print $datalist[$i]['unique']; ?>" class="touchcarousel-item">
			<div class="item-container">
				<div class="item-flipper">
					<section id="touchcarousel-<?php print $datalist[$i]['unique']; ?>-article" class="section article">
						<article class="wrap">
							<?php print $taogi_theme->time($datalist[$i]); ?>
<?php						if($datalist[$i]['asset']['media']) {?>
								<div class="feature">
									<?php print $taogi_theme->figure($datalist[$i]['asset']); ?>
<?php							if(@count($datalist[$i]['media'])) {?>
									<p class="switch"><a href="javascript://" class="switch_gallery"><?php print (count($datalist[$i]['media']) > 1 ? $lang->_t('view_n_media',count($datalist[$i]['media'])) : $lang->_t('view_1_media')); ?></a></p>
<?php							}?>
								</div>
<?php						} else if($datalist[$i]['media']) {?>
								<div class="feature">
									<?php print $taogi_theme->figure($datalist[$i]['media'][0]); ?>
									<p class="switch"><a href="javascript://" class="switch_gallery"><?php print (count($datalist[$i]['media']) > 1 ? $lang->_t('view_n_media',count($datalist[$i]['media'])) : $lang->_t('view_1_media')); ?></a></p>
								</div>
<?php						}?>
							<div class="title-description">
								<h2 class="title"><?php print rtrim($datalist[$i]['headline'],"<br>"); ?></h2>
								<div class="description"><p><?php print preg_replace("/(&quot;){1,}/i",'"',strip_tags(rtrim($datalist[$i]['text'],"<br>"),'<b><strong><i><em><u><s><strike><a><br><p>')); ?><span class="more">... <a href="#"><?php print $lang->_t('read_more'); ?></a></span></p></div>
							</div>
						</article>
					</section>
<?php			if($datalist[$i]['media'] || $datalist[$i]['asset']['media']) {?>
					<section id="touchcarousel-<?php print $datalist[$i]['unique']; ?>-gallery" class="section media fixed">
						<article class="wrap">
							<div class="gallery-wrap">
								<ul class="gallery-container">
								</ul>
							</div>
							<div class="media-nav">
								<a class="switch_nav" href="javascript://">Open / Close</a>
								<a class="switch_mode" href="javascript://"><?php print $lang->_t('view_article'); ?></a>
								<p class="caption">Media description...</p>
								<div class="thumbnails-navi">
									<div class="thumbnails-navi-items">
										<ul class="thumbnails">
<?php							if(@count($datalist[$i]['media'])) {
									for($j=0; $j<@count($datalist[$i]['media']); $j++) {
										print $taogi_theme->thumbnail($datalist[$i]['media'][$j]);
									}
								} else if($datalist[$i]['asset']['media']) {
										print $taogi_theme->thumbnail($datalist[$i]['asset']);
								}?>
										</ul><!--/.thumbnails-->
									</div><!--/.thumbnails-navi-items-->
									<div class="thumbnails-navi-buttons">
										<button class="prev"><span>prev</span2></button>
										<button class="next"><span>next</span></button>
									</div><!--/.thumbnails-navi-buttons-->
								</div>
							</div>
						</article>
					</section>
<?php			}?>
				</div>
			</div>
		</li>
<?php }?>
<?php if($timeline) {?>
		<li class="touchcarousel-item cover back">
			<div class="item-container">
				<section class="section article">
					<article class="wrap">
						<h1 class="title"><?php print $timeline['headline']; ?></h1>
						<div class="description"><?php print $timeline['text']; ?></div>
						<div class="meta">
							<cite class="author"><?php print $timeline['extra']['author']; ?></cite>
							<?php print $taogi_theme->time($timeline,'endDate'); ?>
						</div>
						<ul class="social">
							<li class="twitter"><a href="https://twitter.com/share?u=<?php print $permalink; ?>&text=<?php print $timeline['headline']; ?>" target="_blank"><span><?php print $lang->_t('share_twitter');?></span></a></li>
							<li class="facebook"><a href="https://facebook.com/sharer.php?u=<?php print $permalink; ?>" target="_blank"><span><?php print $lang->_t('share_facebook'); ?></span></a></li>
							<li class="googleplus"><a href="https://plus.google.com/share?url=<?php print $permalink; ?>" target="_blank"><span><?php print $lang->_t('share_googleplus'); ?></span></a></li>
							<li class="kakaotalk"><a href="https://plus.google.com/share?url=" target="_blank"><span><?php print $lang->_t('share_kakaotalk'); ?></span></a></li>
							<li class="embed"><a href="#"><span><?php print $lang->_t('share_embed'); ?></span></a></li>
						</ul>
					</article>
				</section>
			</div>
		</li>
<?php } ?>
	</ul>
</div>
