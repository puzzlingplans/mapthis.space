
if (window.location.host != 'localhost')
{
// prod
var osmAPIEndpoint = 'https://overpass-api.de/api/';
var osmRootUrl = 'https://www.openstreetmap.org';
var oauthConsumerKey = 'SOv61M3g2vV09QBwz46'+'84zPxETET4Zs0uN3ktYIF';
var oauthConsumerSecret = 'gnTvMBVnobuRyQHqK'+'GIrDbY2YFtNTFsV5Idb400m';
} else {
// dev
var osmAPIEndpoint = 'http://api06.dev.openstreetmap.org/api/';
var osmRootUrl = 'http://api06.dev.openstreetmap.org';
var oauthConsumerKey = 'uSHdWESckMnjVBM1QFX'+'LnhDNdgKyuo1CeyKHVOMo';
var oauthConsumerSecret = 'WyoVbVqushwaQuGIKz'+'jDphRWqktPJiiXIoVC0Lad';
}
