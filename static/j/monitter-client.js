window.columns = {};
window.server = "ec2-79-125-60-197.eu-west-1.compute.amazonaws.com";
function addColumn(searchTerm)
{
	var $col = $('<div class="column"><div class="tweets"></div><div class="bar"></div><div class="info"></div><div class="config"><div class="map"></div></div><div class="msg"></div></div>');
	$col.data('paused',false);
	$col.data('searchTerm',searchTerm);
	$col.data('queue',new Array());
	window.columns[searchTerm] = $col;
	
	$('#columns').prepend($col);
	
	var socket = new io.Socket(window.server,{
	  port: 6969
	});
	socket.connect();
	socket.searchTerm = searchTerm;
	socket.on('message',function(data) 
	{
	  	var $col = window.columns[this.searchTerm];
		var queue = $col.data('queue');
		queue.push(data);
	});
	
	socket.send(searchTerm);
	sizeColumns();		
}
function poller()
{
	for (i in window.columns)
	{
		var $col = $(window.columns[i]);
		if(!$col.data('paused'))
		{
			var queue = $col.data('queue');
			var $newTweet = $(queue.shift());
			$newTweet.css({opacity:0});
			$col.find('.tweets').prepend($newTweet);
			$newTweet.css({opacity:1});	
		}		
	}
	
	setTimeout('poller()',window.pollSpeed);
}
function sizeColumns()
{
	var numCols = $('div.column').length;
	var per = 100/numCols;
	$('div.column').css({width:per+'%'});
	$('#columns').css({height:$(window).height(),width:$(window).width()});
}
function garbageCollection()
{
	$('div.column').each(function()
	{
		$(this).find('article:gt('+window.columnLimit+')').remove();
	});
}
function showBar($column)
{
	
	var $tweets = $column.find('div.tweets');
	// bar height:
	height = Math.round($tweets.height()/$(window).height());
	var $bar = $column.find('div.bar');
	$bar.css({height:50+$(window).height() / Math.round($tweets.height()/$(window).height())+'px'});
	
	// bar position:
	var stop = Math.round($(window).height() * (Math.abs($tweets.position().top)/$tweets.height()));
	$bar.css({top:stop+'px'});		
	// control bar visiblity:
	$bar.css({opacity: 1});
	$bar.stop().delay(2000).fadeTo(500,0);
}
function newColumn()
{
	var term = $('#newsearch').val();
	addColumn(term);
}

function pause($column)
{
	var $msg = $column.find('.msg');
	var queue = $column.data('queue');
	var tweetnum = queue.length;
	$column.data('paused',true);		
	$msg.html('Paused ('+tweetnum+' queued tweets).');
	$msg.animate({top:'0px'},300);
}

function unpause($column)
{
	var $msg = $column.find('.msg');
	$column.data('paused',false);		
	$msg.animate({top:'-30px'},300);
}
jQuery(document).ready(function($)
{
	window.columnLimit = 20;
	window.pollSpeed = 500;
	//$('body').addClass('white');
	setTimeout('poller()',window.pollSpeed);
	setInterval('garbageCollection()',10000);
	addColumn('this');
	addColumn('is');
	addColumn('a');	
	$(window).resize(sizeColumns);	
	
	$('#columns').sortable({axis:'x',scroll:false,tolerance: 'pointer',items:'div.column' });
	$('div.column').bind('mouseenter',function(event)
	{		
		showBar($(this));
	});
	$('#monitterbutton').click(newColumn);
	// using the event 
	$('a.colourToggle').click(function()
	{
		$('body').toggleClass('white');
		return(false);
	});

	$('div.column').live('mousewheel',function(event, delta) 
	{
		var $tweets = $(this).find('div.tweets');
		// Calculate the scroll motion:
	    var dir = delta < 0 ? 'Up' : 'Down';
		var vel = 20*Math.abs(delta);

		tvel = $tweets.position().top + vel;
		if(dir == 'Up')
			tvel = $tweets.position().top - vel;
			
		// Check if tvel is too big
		var confheight = $(this).find('div.config').height();
		
		if(tvel < confheight)
		{
			var t = tvel+'px';		
			$tweets.css({top:t});
		
			if(tvel < -20)
			{			
				pause($(this));				
			}
			else
			{
				unpause($(this));
			}			
		}
		showBar($(this));
		
		
		
		return false;
	});
	
	
	var latlng = new google.maps.LatLng(-34.397, 150.644);
    var myOptions = {
      zoom: 8,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
	$('.column .config .map').each(function()
	{
		var themap = new google.maps.Map(this, myOptions);		
	    $(this).data('map',themap);
	});
    
});
