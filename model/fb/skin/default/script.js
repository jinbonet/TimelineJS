jQuery(document).ready(function(){
	jQuery('.timelineSection .collapse a').click(function() {
		if(!$(this).hasClass('collapsed')) {
			jQuery('.timelineSection .timeline_section').slideUp();
			$(this).addClass('collapsed');
			$(this).attr('title','보기');
			$(this).html('보기');
		} else {
			jQuery('.timelineSection .timeline_section').slideDown();
			$(this).removeClass('collapsed');
			$(this).attr('title','접기');
			$(this).html('접기');
		}
	});
});
