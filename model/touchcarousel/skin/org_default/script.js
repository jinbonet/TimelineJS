function timelineContainer_resize() {
	var w = window.innerWidth;
	jQuery('#carousel-timeline').parents().width(w);
	jQuery('#carousel-timeline').width(w);
}

jQuery(document).ready(function(){
	timelineContainer_resize();
	jQuery("#carousel-timeline").taogiTouchCarousel({                   
		pagingNav: false,
		snapToItems: false,
		itemsPerMove: 4,                
		scrollToLast: false,
		loopItems: false,
		scrollbar: true
	});

	//change handle position on window resize
	jQuery(window).resize(function() {
		timelineContainer_resize();
	});
});
