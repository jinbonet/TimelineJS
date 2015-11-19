jQuery(document).ready(function(){
// BEGIN CODE

// DISABLE TEXT SELECTION
jQuery.fn.disableSelection = function() {
	return this.each(function() {
		$(this).css({
			'MozUserSelect':'none',
			'webkitUserSelect':'none'
		}).attr('unselectable','on').bind('selectstart', function() {
			return false;
		});
	});
};
jQuery.fn.enableSelection = function() {
	return this.each(function() {
		$(this).css({
			'MozUserSelect':'',
			'webkitUserSelect':''
		}).attr('unselectable','off').unbind('selectstart');
	});
};
jQuery('#carousel-timeline-box').disableSelection();

// LOAD GOOGLE WEBFONTS
if ( taogiVMM.Browser.device != 'desktop' || (taogiVMM.Browser.browser == "Explorer" && parseInt(taogiVMM.Browser.version, 10) <= 8)) {
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

// RESIZE
function timelineContainer_resize() {
	var w = window.innerWidth;
	jQuery('#carousel-timeline').parents().width(w);
	jQuery('#carousel-timeline').width(w);
}

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

jQuery('.cover .social a').on('click',function(e){
	url = jQuery(this).attr('href');
	name = '_blank';
	specs = 'width=500,height=350,menubar=no,resizable=yes,scrollable=no,status=no,titlebar=yes,toolbar=no';
	window.open(url,name,specs);
	e.preventDefault();
	event.stopPropagation();
});

// END CODE
});
