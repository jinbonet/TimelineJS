function ajaxLoader(id) {
	if($(id).length) {
		var offset = $(id).offset();
		$(id).append('<img src="./model/fb/images/ajax-loader.gif" class="ajax-loader" style="position:absolute;z-index:100;left:'+(offset.left + 45)+'px;top:'+(offset.top + 35)+'px;" />');
	}
}

var player = {
	youtube: [],
	vimeo: [],
	soundcloude: []
};

function playVideoInner(media,width,id,start) {
	if(media == 'youtube') {
		if(typeof YT == "undefined") {
			$.getScript("//www.youtube.com/iframe_api").
				done(function(script, textStatus) {
					ajaxLoader('#youtube_'+id);
					setTimeout("YoutubePlayerApiReady("+width+",'"+id+"',"+start+")",1000);
				});
		} else {
			YoutubePlayerApiReady(width,id,start);
		}
	} else if(media == 'vimeo') {
		VimeoPlayerApiReady(width,id);
	} else if(media == 'soundcloud') {
		SoundCloudApiReady(width,id);
	}
}

function YoutubePlayerApiReady(width,id,start) {
	if(typeof YT.Player == "undefined") return false;
	var p = {
		active:		false,
		player:		{},
		name:		id,
		playing:	false,
		hd:			false
	};
	p.player[id] = new YT.Player('youtube_'+id, {
		width: width,
		height: parseInt(width * 39 / 64),
		videoId: id,
		playerVars: {
			enablejsapi:	1,
			color:			'white',
			showinfo:		0,
			theme:			'light',
			start:			start,
			rel:			0
		},
		events: {
			'onReady': onYoutubePlayerReady,
			'onStateChange': onYoutubePlayerStateChange
		}
	});
	player.youtube.push(p);
}

function onYoutubePlayerReady(event) {
	event.target.playVideo();
	reloadTimeline();
}

function onYoutubePlayerStateChange(event) {
	for(var i = 0; i < player.youtube.length; i++) {
		var the_name = player.youtube[i].name;
		if(player.youtube[i].player[the_name] == event.target) {
			if(event.data == YT.PlayerState.PLAYING) {
				player.youtube[i].playing = true;
			}
		}
	}
}

function stopYoutubePlayers() {
	for(var i = 0; i < player.youtube.length; i++) {
		if (player.youtube[i].playing) {
			var the_name = player.youtube[i].name;
			player.youtube[i].player[the_name].stopVideo();
		}
	}
}

function VimeoPlayerApiReady(width,id) {
	var vid = "#vimeo_"+id;
	var html = '<iframe id="vimeo_'+id+'" class="'+jQuery(vid).attr('class')+'" autostart="true" frameborder="0" width="'+width+'" height="'+parseInt(width * 39 / 64)+'" src="http://player.vimeo.com/video/'+id+'?api=1&player_id=vimeoplayer_'+id+'&title=0&amp;byline=0&amp;portrait=0&amp;color=ffffff&amp;autoplay=1"></iframe>';
	$(vid).replaceWith(html);
	reloadTimeline();
}

function SoundCloudApiReady(width,id) {
	var vid = id.replace('http:\/\/','');
	var vid = '#'+vid.replace(/[\.\/]/gi,'_');
	$.getJSON('http://soundcloud.com/oembed?callback=?', {format: 'js', url: id.replace(/\-/gi,'%2D'), iframe: true, auto_play: true },
		function(data) {
			$(vid).replaceWith(data.html);
			reloadTimeline();
		}
	);
}

function Arrow_Points() { 
	var width = $('#timeline_container_box').width();
	var s = $('#timeline_container_box').find('.item');
	$.each(s,function(i,obj){
		var posLeft = $(obj).css("left");
		var posHeight = parseInt($(obj).css("top"));
		var pHeight = parseInt($(obj).prev().css('top'));
		if(pHeight >= (posHeight-32)) {
			var margin_top = 16 + (pHeight-posHeight)+32;
			var style = ' style="margin-top:'+margin_top+'px"';
		} else {
			var style = '';
		}
		if(!$(this).find('.timeArrow').length) {
			if($(this).hasClass('center') || $(this).hasClass('section')) {
				html = "<span class='timeArrow upCorner'></span>";
				$(obj).children().prepend(html);
			} else if(posLeft == "0px") {
				html = "<span class='timeArrow rightCorner'"+style+"></span>";
				$(obj).children().prepend(html);
			} else {
				$(obj).css({'margin-right':'0','margin-left':(width - ($(obj).width() * 2))+'px'});
				html = "<span class='timeArrow leftCorner'"+style+"></span>";
				$(obj).children().prepend(html);
			}
		}
	});

	$('#timeline_container_box .timeline_more').css({'top': $('#timeline_container_box .timeline').height()+'px'});
}

function reloadTimeline() {
	$('.item').css({'margin-left':'0'})
	$('.rightCorner').remove();
	$('.leftCorner').remove();
	$('#timeline_container_box').masonry('reload');
	Arrow_Points();
}

$(function(){

	// Divs
	$('#timeline_container_box').masonry({

		singleMode: false,
        itemSelector: '.item',
        animate: true
    });
	Arrow_Points();

	//Mouseup textarea false
	$("#popup").mouseup(function() {
		return false
	});

	$(".timeline_container").click(function(e) {
		var topdiv=$("#containertop").height();
		$("#popup").css({'top':(e.pageY-topdiv-33)+'px'});
		$("#popup").fadeIn();
		$("#update").focus();
	});  


	var loadingResult = 0;
	function more_results() {
		if(loadingResult) return false;
		loadingResult = 1;
		var page = parseInt($('.timeline_more:last').attr("page"));
		if(page) {
			var params = location.search.replace("?","");
			if(params.match(/page=([0-9]+)/)) {
				params = params.relace(/page=([0-9]+)/,'page='+(page+1));
			} else {
				params += "&page="+(page+1);
			}
			$.ajax({
				type: "GET",
				url: "load.php",
				data: params,
				cache: false,
				beforeSend: function(){ $("#more"+page).html('<img src="./model/fb/images/ajax-loader.gif" />'); },
				success: function(html){
					var $boxes = $(html);
					$('#timeline_container_box').append( $boxes ).masonry( 'appended', $boxes );
					Arrow_Points();
					$("#more"+page).remove();
				},
				complete: function() {
					loadingResult = 0;
				}
			});
		} else {
			$("#more")
				.attr('title','The End')
				.html('The End');// no results
			$("#more").click(function(event) {
				event.preventDefault();
			});
		}

		//return false;
	};

	$(window).scroll(function(){
		if($('.timelineSection .timeline_more').length) {
			if ($(window).scrollTop() >= parseInt($('.timelineSection .timeline_more').offset().top) - $(window).height()) {
				more_results();
			}
		}
	});
});
