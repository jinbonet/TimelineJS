jQuery(document).ready(function(e){
// BEGIN CODE

jQuery('#taogi-gnb .social a').on('click',function(e) {
	url = jQuery(this).attr('href');
	name = '_blank';
	specs = 'width=500,height=350,menubar=no,resizable=yes,scrollable=no,status=no,titlebar=yes,toolbar=no';
	window.open(url,name,specs);
	e.preventDefault();
	e.stopPropagation();
});

// END CODE
});
