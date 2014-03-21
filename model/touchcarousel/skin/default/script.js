function timelineContainer_resize() {
	var w = window.innerWidth;
	jQuery('#carousel-timeline').parents().width(w);
	jQuery('#carousel-timeline').width(w);
}

jQuery(document).ready(function(){

	// WEBFONTS start -- using google web font api //
	if ( taogiVMM.Browser.browser == "Explorer" && parseInt(taogiVMM.Browser.version, 10) <= 8) {
	} else {
		jQuery.getScript('//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js',function(data,textStatus,jqxhr){
			WebFont.load({
				custom: {
					families: ['Nanum Gothic'],
					urls: ['http://fonts.googleapis.com/earlyaccess/nanumgothic.css']
				}
			});
		});
	}
	// WEBFONTS end //


//	timelineContainer_resize();
	jQuery("#carousel-timeline").taogiTouchCarousel({                   
		pagingNav: false,
		snapToItems: false,
		itemsPerMove: 4,                
		scrollToLast: true,
		loopItems: false,
		scrollbar: true,
		lang: 'ko_KR'
	});

	//change handle position on window resize
//	jQuery(window).resize(function() {
//		timelineContainer_resize();
//	});
});
