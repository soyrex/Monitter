var sys = require('sys');
var TwitterNode = require('twitter-node').TwitterNode;

var twit = new TwitterNode({
  user: 'monitter', 
  password: 'qweMNB321',
	track: ['#monitter'],
}); 
 
// Set the headers:
twit.headers['User-Agent'] = 'monitter';

// Error Listener
twit.addListener('error', function(error) 
{
  sys.puts(error.message);
});

// HTTP Server:
var http = require('http'),
	url = require('url');
	
var ejs = require('ejs')
  , fs = require('fs'),
    path = require("path"),
    events = require("events")
  , template = fs.readFileSync('templates/client.ejs', 'utf8')
  , tweetTemplate = fs.readFileSync('templates/tweet.ejs', 'utf8');

// Creates a JSON WebSocket... this is option 1, option 2 would be a node
// http api server that allows them to poll for json output like the current
// monitter server.
var connect = require("connect"),
	net = require("net"),
	io  = require('socket.io');

var server = connect.createServer();
server.listen(6969);
var socket = io.listen(server);

socket.on('connection',function(client)
{
	client.on('message',function(term)
	{
		client.keyword = term;
		sys.puts('now tracking: '+term);
		// Add the term
		twit.track(term);
		
		// re stream:
		twit.stream();		
	});
	
	twit.addListener('tweet', function(tweet) 
	{	
		var re = new RegExp(client.keyword,"gi");
		var then = new Date(Date.parse(tweet.created_at));
		var now = new Date();
		var timer = timeAgo(now,then,5);

		//sys.puts(sys.inspect(tweet));
		//sys.puts(tweet.text+' checking for: '+client.keyword+'\n');
		if(tweet.text.search(re) > 0)
		{
			try 
			{
				var tweetHtml  = ejs.render(tweetTemplate,
				{
					locals: {
						profilepic:tweet.user.profile_image_url,
						tweetbody:tweet.text,
						tweetuser:tweet.user.screen_name,
						tweetfullname:tweet.user.name,
						tweettime:timer
					}
				});
			 	client.send(tweetHtml);
			}
			catch (e) 
			{			
				sys.puts("Socket write error");
			}	
		}
	});
});
/*twit.addListener('limit',function(json)
{
	sys.puts('LIMITER');
	sys.puts(sys.inspect(json));
})*/

http.createServer(function (req, res) 
{
	res.writeHead(200, {'Content-Type': 'text/html'});	
	
	var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd(),'static', uri);
    path.exists(filename, function(exists) 
	{
    	if(!exists || filename == process.cwd()+'/static/') 
		{
		 	//res.write(JSON.stringify(tweet));
			var html = ejs.render(template, {});
			res.end(html);
    	}

    	fs.readFile(filename, "binary", function(err, file) 
		{
    		if(err) 
			{
    			res.writeHead(500, {"Content-Type": "text/plain"});
    			res.end(err + "\n");
    			return;
    		}

    		res.writeHead(200);
    		res.end(file, "binary");
    	});
    });
	

}).listen(80);



//takes in two dates and sends back a string with the time that has elapsed
function timeAgo(date1, date2, granularity)
{	
	var self = this;
	
	periods = [];
	periods['week'] = 604800;
	periods['day'] = 86400;
	periods['hour'] = 3600;
	periods['minute'] = 60;
	periods['second'] = 1;
	
	if(!granularity)
	{
		granularity = 5;
	}
	
	(typeof(date1) == 'string') ? date1 = new Date(date1).getTime() / 1000 : date1 = new Date().getTime() / 1000;
	(typeof(date2) == 'string') ? date2 = new Date(date2).getTime() / 1000 : date2 = new Date().getTime() / 1000;
	
	if(date1 > date2)
	{
		difference = date1 - date2;
	}
	else
	{
		difference = date2 - date1;
	}

	output = '';
	
	for(var period in periods)
	{
		var value = periods[period];
		
		if(difference >= value)
		{
			time = Math.floor(difference / value);
			difference %= value;
			
			output = output +  time + ' ';
			
			if(time > 1)
			{
				output = output + period + 's ';
			}
			else
			{
				output = output + period + ' ';
			}
		}
		
		granularity--;
		if(granularity == 0)
		{
			break;
		}	
	}
	
	return output + ' ago';
}
