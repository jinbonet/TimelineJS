<?php
$vline_left = ($width / 2) -1;
$more_left = ($width / 2) - 36;
$item_width = ($width / 2) - 20;
$config['width'] = $item_width - 46;
$MediaElement = new MediaElement($config);
ob_start();
?>
		<style>
			.timelineSection {
				width: <?php print $width; ?>px !important;
<?php		if($font) {?>
				font-family: <?php print $font; ?>
<?php		}?>
			}
			.timelineSection #timeline_container_box .item.mansory .itemBox {
				width: <?php print $item_width; ?>px !important;
			}
			.timelineSection #timeline_container_box .item.center .itemBox,
			.timelineSection #timeline_container_box .item.section .itemBox {
				width: <?php print $width; ?>px !important;
			}
			.timelineSection #timeline_container_box .item .rightCorner {
				margin-left:<?php print ($item_width); ?>px !important;
			}
			.timelineSection #timeline_container_box .item .upCorner {
				left:<?php print ((int)($width/2) - 12); ?>px;
			}
			.timelineSection .timeline_more {
				left: <?php print $more_left; ?>px !important;
			}
			.timelineSection #timeline_container_box .item article .figure .desc {
				width: <?php print ($config['width'] - 140); ?>px;
			}
		</style>
<?php
$header .= ob_get_contents();
ob_end_clean();
if($page < 2) {?>
	<section class="timelineSection">
		<section class="coverStory">
			<article>
				<figure class="figure">
					<?php print $MediaElement->createMediaElement(($timeline['asset'] ? $timeline['asset'] : $datalist[0]['asset'])); ?>
				</figure>
				<h1><a href="<?php print $_SERVER['REQUEST_URI']; ?>" title="<?php print htmlspecialchars($timeline['headline']); ?>"><?php print $timeline['headline']; ?></a> <span class="date">| <?php print str_replace(",",".",$timeline['startDate']); ?></span></h1>
				<p class="description">
					<?php print $timeline['text']; ?>
				</p>
			</article>
			<div id="timeline_sns_share_widget"></div>
		</section>
		<section class="timeline_section">
			<div id="timeline_container_box">
				<div class="timeline_container">
					<div class="timeline" style="left:<?php print $vline_left; ?>px !important;">
						<div class="plus"></div>
					</div>
				</div>
<?php }
			for($i=(($page-1)*$line_cnt); $i<min((($page ? $page : 1) * $line_cnt),$total_cnt); $i++) {?>
				<section class="item <?php print ($datalist[$i]['nodeType'] ? $datalist[$i]['nodeType'] : 'mansory'); ?>" id="timeline_item<?php print ($i+1); ?>">
					<div class="itemBox">
						<article>
							<hgroup>
								<h2 class="title"><?php if($datalist[$i]['permalink']) {?><a href="<?php print $datalist[$i]['permalink']; ?>" title="<?php print htmlspecialchars($datalist[$i]['headline']); ?>"><?php } print $datalist[$i]['headline']; if($datalist[$i]['permalink']) {?></a><?php }?></h2>
								<h3 class="subtitle"><?php if($datalist[$i]['permalink']) {?><a href="<?php print $datalist[$i]['permalink']; ?>" title="<?php } print htmlspecialchars($datalist[$i]['subtitle']); if($datalist[$i]['permalink']) {?>"><?php print $datalist[$i]['subtitle']; ?></a><?php }?></h3>
								<time pubdate datetime="<?php print JNTimeLine_prettyTime($datalist[$i]['startDate']); ?>" title="<?php print JNTimeLine_prettyTime($datalist[$i]['startDate']); ?>" class="pubdate"><?php print JNTimeLine_prettyTime($datalist[$i]['startDate']); ?></time>
							</hgroup>
<?php					if($datalist[$i]['text']) {?>
							<p class="description">
								<?php print $datalist[$i]['text']; ?>
							</p>
<?php					}?>
							<?php print $MediaElement->createMediaElement($datalist[$i]['asset']); ?>
						</article>
					</div>
				</section>
<?php		}
			if((($page * $line_cnt) + ($page == 1 ? 1 : 0)) < $total_cnt) {?>
				<div id="more<?php print $page; ?>" class="timeline_more" page="<?php print $page; ?>"><a href="#" id="more" title="더보기" onclick="more_results();">더보기</a></div>
<?php		} else {?>
				<div id="more<?php print $page; ?>" class="timeline_more"><a href="javascript://" id="more" title="The End" onclick="return false;">The End</a></div>
<?php		}
if($page < 2) {?>
			</div>
		</section>
	</section>
<?php }?>
